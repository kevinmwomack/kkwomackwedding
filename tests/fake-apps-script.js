// Runs setup/google-apps-script.js against an in-memory fake of the Google
// services it uses (Sheets, Mail, Lock, Content), so tests exercise the real
// backend code. The fake Sheet mimics the behavior that bit us: a value
// starting with = + - in a cell that isn't text-formatted gets parsed.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PARSED = '#PARSED-AS-FORMULA#';

function makeSheet(name) {
  const cells = {}, fmt = {};
  let last = 0;
  const key = (r, c) => `${r},${c}`;
  const write = (r, c, v) => {
    if (typeof v === 'string' && /^[=+-]/.test(v) && fmt[key(r, c)] !== '@') v = PARSED;
    cells[key(r, c)] = v;
    if (r > last) last = r;
  };
  return {
    name,
    getLastRow: () => last,
    appendRow(arr) { const r = last + 1; arr.forEach((v, i) => write(r, i + 1, v)); last = r; },
    getRange(r, c, nr = 1, nc = 1) {
      return {
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) row.push(cells[key(r + i, c + j)] ?? '');
            out.push(row);
          }
          return out;
        },
        setValue(v) { write(r, c, v); },
        getA1Notation() { return String.fromCharCode(64 + c) + r; },
      };
    },
    getRangeList(list) {
      return { setNumberFormat(f) { list.forEach(a => { fmt[key(parseInt(a.slice(1), 10), a.charCodeAt(0) - 64)] = f; }); } };
    },
    // Data rows as objects keyed by the header row
    records() {
      const headers = [];
      for (let c = 1; cells[key(1, c)] !== undefined; c++) headers.push(cells[key(1, c)]);
      const out = [];
      for (let r = 2; r <= last; r++) {
        const o = {};
        headers.forEach((h, i) => { o[h] = cells[key(r, i + 1)] ?? ''; });
        out.push(o);
      }
      return out;
    },
  };
}

const HEADERS = ['Timestamp', 'Name', 'Email', 'Attending', 'Guest Count', 'Dietary', 'Message', 'Song', 'Visa', 'Phone', 'Note'];

// source: the Apps Script text (defaults to the repo's); edit lets a test
// apply the same change a couple would (e.g. a new TEXT_FIELDS line).
function fakeAppsScript({ guests, notify = '', visa = '', extraHeaders = [], edit } = {}) {
  const rsvp = makeSheet('RSVPs');
  rsvp.appendRow(HEADERS.concat(extraHeaders));
  const sheets = [rsvp];
  if (guests) {
    const g = makeSheet('Guests');
    g.appendRow(['Name', 'Max']);
    guests.forEach(x => g.appendRow([x.name, x.max]));
    sheets.push(g);
  }
  const mails = [];
  let code = fs.readFileSync(path.join(__dirname, '..', 'setup', 'google-apps-script.js'), 'utf8')
    .replace('const NOTIFY_EMAIL = ""', `const NOTIFY_EMAIL = ${JSON.stringify(notify)}`)
    .replace('const VISA_EMAIL   = ""', `const VISA_EMAIL   = ${JSON.stringify(visa)}`);
  if (edit) code = edit(code);
  const ctx = vm.createContext({
    console,
    LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: s => ({ content: s, setMimeType() { return this; } }) },
    SpreadsheetApp: { flush() {}, getActiveSpreadsheet: () => ({ getSheetByName: n => sheets.find(s => s.name === n) || null, getSheets: () => sheets }) },
    MailApp: { sendEmail: (to, subject, body) => mails.push({ to, subject, body }) },
  });
  vm.runInContext(code, ctx);
  return {
    post(obj) { return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(obj) } }).content); },
    rows: () => rsvp.records(),
    row: name => rsvp.records().find(r => r.Name === name),
    mails,
  };
}

module.exports = { fakeAppsScript, PARSED };
