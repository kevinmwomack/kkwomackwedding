// Google Apps Script — Wedding RSVP endpoint
// Deploy as: Web App | Execute as: Me | Who has access: Anyone
// Paste the deployment URL into js/config.js → RSVP_ENDPOINT
//
// AFTER EVERY EDIT: Deploy → Manage deployments → pencil icon → Version: New
// version → Deploy. Saving the script does NOT change the live endpoint, and
// "New deployment" makes a new URL the site doesn't know about.
//
// Sheet columns on the RSVP tab (A–K):
// Timestamp | Name | Email | Attending | Guest Count | Dietary Restrictions | Message | Song Request | Visa Letter | Phone | Note
//
// Optional "Guests" tab (strongly recommended): Name | Max, one row per
// invitation, exactly as in js/guests.js (`node setup/build.js --guests-csv`
// writes a guests-sheet.csv you can import; not guests.csv, whose links
// carry the invitation code). With it, the endpoint rejects names
// that aren't invited and counts above an invitation's max. Without it, it
// accepts any name, because this URL is public and anyone can POST to it.
//
// This file runs in Google Apps Script, a separate runtime from the website's
// JS. It can't read js/config.js, so the settings it needs live below.

const NOTIFY_EMAIL = "";        // email every new/updated RSVP here; "" turns it off
const VISA_EMAIL   = "";        // visa-letter requests go here; "" turns it off
const RSVP_SHEET   = "RSVPs";   // tab name for responses (falls back to the first tab)
const GUESTS_SHEET = "Guests";  // optional tab with Name | Max
const HONEYPOT_KEY = "honeypot"; // must match payload field name in rsvp-upgrade.js

// Column indices (1-based) — must match sheet headers exactly
const NAME_COL      =  2; // B — Name
const EMAIL_COL     =  3; // C — Email                 (unused by the form, kept for alignment)
const ATTENDING_COL =  4; // D — Attending             (values: "Yes" | "No")
const COUNT_COL     =  5; // E — Guest Count           (values: "1".."N" or "0")
const DIETARY_COL   =  6; // F — Dietary Restrictions
const MESSAGE_COL   =  7; // G — Message               (unused, kept for column alignment)
const SONG_COL      =  8; // H — Song Request
const VISA_COL      =  9; // I — Visa Letter           (values: "Yes" | "No")
const PHONE_COL     = 10; // J — Phone
const NOTE_COL      = 11; // K — Note

// Free-text answers: payload key → column. Each one is length-capped,
// written as plain text, kept on an update when left blank, never returned
// to the browser, and included in the notification email.
//
// To add your own question (e.g. a meal choice): add a header for it in the
// next empty column of the RSVP tab, add a constant above and one line here,
// with the key you gave it in RSVP_QUESTIONS in js/config.js (see
// CUSTOMIZING.md).
const TEXT_FIELDS = {
  email:   EMAIL_COL,
  dietary: DIETARY_COL,
  song:    SONG_COL,
  phone:   PHONE_COL,
  note:    NOTE_COL,
};
// Answers that only make sense for guests who are coming; blanked on a decline.
const ATTENDING_ONLY = ["dietary", "song"];

// Sheets auto-parses a leading "+", "-", or "=" as a formula (a phone number
// becomes #ERROR!, and a "name" like =IMPORTXML(...) runs), so every column a
// guest can type into, the name included, is written as plain text.
const TEXT_COLS = [NAME_COL].concat(Object.values(TEXT_FIELDS));
const LAST_COL  = Math.max(NOTE_COL, ...TEXT_COLS);

const MAX_FIELD_LENGTH = 1000; // free text longer than this is cut, so nobody can stuff the sheet

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
  } catch (err) {
    return respond("error", "busy");
  }

  try {
    const payload = JSON.parse(e.postData.contents);

    // Bot trap — bots fill every input including the hidden honeypot field
    if (payload[HONEYPOT_KEY]) {
      return respond("success");
    }

    const clean = v => String(v || "").trim().slice(0, MAX_FIELD_LENGTH);

    const name        = clean(payload.name);
    const isAttending = clean(payload.attending).toLowerCase() === "yes";

    if (!name) {
      return respond("error", "Name is required.");
    }

    // Invited? (only checked when the Guests tab exists)
    const invitation = findInvitation(name);
    if (invitation === false) {
      return respond("error", "We couldn't find that name on our guest list.");
    }

    // Normalise types
    const attending  = isAttending ? "Yes" : "No";
    let   guestCount = isAttending ? (parseInt(payload.guestCount, 10) || 1) : 0;
    if (guestCount < 0) guestCount = 0;
    if (invitation && guestCount > invitation.max) {
      return respond("error", "That guest count is higher than your invitation allows.");
    }
    const visaLetter = isAttending && clean(payload.visaLetter).toLowerCase() === "yes" ? "Yes" : "No";
    const fields = { name: invitation ? invitation.name : name }; // the spelling on the guest list
    Object.keys(TEXT_FIELDS).forEach(k => {
      fields[k] = (isAttending || !ATTENDING_ONLY.includes(k)) ? clean(payload[k]) : "";
    });

    const sheet    = rsvpSheet();
    const rowIndex = findRowByName(sheet, fields.name);
    const exists   = rowIndex !== -1;

    // Update existing RSVP
    if (payload.isUpdate && exists) {
      const row = sheet.getRange(rowIndex, 1, 1, LAST_COL).getValues()[0];
      const hadVisa = String(row[VISA_COL - 1]) === "Yes";

      // A blank field keeps what's on file, so changing an answer (above all,
      // cancelling) never wipes the phone number or note we already have.
      // The browser can't send the old values back: we never give them out.
      Object.entries(TEXT_FIELDS).forEach(([k, col]) => {
        fields[k] = fields[k] || String(row[col - 1] || "");
      });

      sheet.getRange(rowIndex, ATTENDING_COL).setValue(attending);
      sheet.getRange(rowIndex, COUNT_COL).setValue(String(guestCount));
      sheet.getRange(rowIndex, VISA_COL).setValue(visaLetter);
      writeTextFields(sheet, rowIndex, fields);

      // Emails go out only after the sheet write, so a mail failure (quota)
      // never loses an RSVP.
      if (!hadVisa) sendVisaAlert(fields, guestCount, visaLetter);
      sendRsvpNotification(fields, attending, guestCount, true);
      return respond("success");
    }

    // Duplicate — tell the form what's on file so it can offer an update.
    // Only attending + count: anyone can POST any name here, so a guest's
    // phone, note, or dietary needs must never come back in a response.
    if (exists) {
      const row = sheet.getRange(rowIndex, 1, 1, LAST_COL).getValues()[0];
      return ContentService
        .createTextOutput(JSON.stringify({
          result: "duplicate",
          existing: {
            attending:  String(row[ATTENDING_COL - 1] || ""),
            guestCount: String(row[COUNT_COL     - 1] || "0"),
          },
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // New RSVP. Text columns are appended blank and filled in by
    // writeTextFields() below, so Sheets never gets the chance to auto-parse
    // them as formulas.
    const newRow = new Array(LAST_COL).fill("");
    newRow[0]                 = new Date();         // A: Timestamp
    newRow[ATTENDING_COL - 1] = attending;          // "Yes" or "No"
    newRow[COUNT_COL     - 1] = String(guestCount); // "1".."N" or "0" if declining
    newRow[VISA_COL      - 1] = visaLetter;         // "Yes" or "No"
    sheet.appendRow(newRow);

    writeTextFields(sheet, sheet.getLastRow(), fields);

    sendVisaAlert(fields, guestCount, visaLetter);
    sendRsvpNotification(fields, attending, guestCount, false);

    return respond("success");

  } catch (err) {
    console.error("RSVP failed:", err);
    return respond("error", "unexpected");
  } finally {
    lock.releaseLock();
  }
}

function rsvpSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(RSVP_SHEET) || ss.getSheets()[0];
}

// Returns { name, max } for an invited name, false for a name that isn't on
// the Guests tab, or null when there's no Guests tab to check against.
function findInvitation(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(GUESTS_SHEET);
  if (!sheet || sheet.getLastRow() < 2) return null;
  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  const q = name.trim().toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    if (String(rows[i][0]).trim().toLowerCase() === q) {
      return { name: String(rows[i][0]).trim(), max: parseInt(rows[i][1], 10) || 1 };
    }
  }
  return false;
}

// Visa letter alert — wrapped so failure never surfaces as an RSVP error
function sendVisaAlert(fields, guestCount, visaLetter) {
  if (visaLetter !== "Yes" || !VISA_EMAIL) return;
  try {
    MailApp.sendEmail(
      VISA_EMAIL,
      "Visa letter request — " + fields.name,
      "A guest has requested a visa invitation letter.\n\n" +
      "Name:   " + fields.name  + "\n" +
      "Phone:  " + fields.phone + "\n" +
      "Guests: " + guestCount   + "\n\n" +
      "Generate and send their letter directly to the guest."
    );
  } catch (err) {
    console.error("Visa alert email failed:", err.message);
  }
}

// Email on every RSVP (new or update). Gmail's free MailApp quota is about
// 100 emails a day, shared with visa alerts: during a reminder push you can
// hit it. The sheet stays the source of truth either way.
function sendRsvpNotification(fields, attending, guestCount, isUpdate) {
  if (!NOTIFY_EMAIL) return;
  try {
    const subject = (isUpdate ? "RSVP updated — " : "New RSVP — ") + fields.name + " (" + attending + ")";
    let body = "Name:      " + fields.name + "\n" +
               "Attending: " + attending   + "\n";
    if (attending === "Yes") body += "Guests:    " + guestCount + "\n";
    body += "Phone:     " + (fields.phone || "—") + "\n";
    Object.keys(TEXT_FIELDS).forEach(k => {
      if (k !== "phone" && fields[k]) body += (k.charAt(0).toUpperCase() + k.slice(1) + ":").padEnd(11) + fields[k] + "\n";
    });
    MailApp.sendEmail(NOTIFY_EMAIL, subject, body);
  } catch (err) {
    console.error("RSVP notification email failed:", err.message);
  }
}

// Run this once in the Apps Script editor to grant MailApp permission.
function testEmail() {
  const to = NOTIFY_EMAIL || VISA_EMAIL;
  if (!to) throw new Error("Set NOTIFY_EMAIL or VISA_EMAIL first.");
  MailApp.sendEmail(to, "Test — RSVP emails working",
    "If you received this, MailApp is authorised and RSVP emails will send.");
}

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ result: "ok", message: "RSVP endpoint is live." }))
    .setMimeType(ContentService.MimeType.JSON);
}

// Writes the name and the free-text fields as plain text. Setting a cell's value directly
// — even after setNumberFormat("@") — still lets Sheets auto-parse a leading
// "+", "-", or "=" as a formula unless the format change is flushed first.
function writeTextFields(sheet, row, fields) {
  const ranges = TEXT_COLS.map(col => sheet.getRange(row, col).getA1Notation());
  sheet.getRangeList(ranges).setNumberFormat("@");
  SpreadsheetApp.flush();

  sheet.getRange(row, NAME_COL).setValue(fields.name);
  Object.entries(TEXT_FIELDS).forEach(([k, col]) => sheet.getRange(row, col).setValue(fields[k]));
}

// Errors go back to the guest (js/rsvp-upgrade.js shows them), so they say
// what to do, never internal details.
function respond(result, message) {
  const body = { result };
  if (message) body.message = message;
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

function findRowByName(sheet, name) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;
  const names = sheet.getRange(2, NAME_COL, lastRow - 1, 1).getValues();
  const q = name.trim().toLowerCase();
  for (let i = 0; i < names.length; i++) {
    if (String(names[i][0]).trim().toLowerCase() === q) return i + 2;
  }
  return -1;
}
