// RSVP — two-journey guest flow
//
// Journey 1 — personal QR link (?name=John+Smith&pw=...#rsvp):
//   - main.js checks the code, opens the guest list, and matches the name
//     (WeddingSite.invitedGuest); the form opens pre-filled for them
//   - max always comes from the guest list, never from the URL
//
// Journey 2 — direct visit:
//   - guest enters the code at the gate, then types their name; autocomplete
//     matches the guest list (partial and out-of-order names work)
//
// Changing an answer: the backend says "duplicate" when a name already has an
// RSVP. One confirmation screen shows what's on file next to the new answer,
// and confirming resubmits it as an update (no second trip through the form).
//
// Security properties:
//   - the guest list is encrypted in the published site and only exists in
//     memory after the code is entered (see setup/build.js and main.js)
//   - unknown names are rejected with a contact link, not accepted blindly
//   - the backend never sends a guest's phone, note or dietary info back to
//     the browser, since anyone can POST any name to it
//   - the form closes at RSVP_DEADLINE (a fixed moment, not the guest's
//     local midnight)

(function () {

  const SITE_CONFIG   = window.SITE_CONFIG || {};
  const RSVP_DEADLINE = new Date(SITE_CONFIG.RSVP_DEADLINE || "2027-01-01T00:00:00Z");
  const CONTACT_EMAIL = SITE_CONFIG.CONTACT_EMAIL || "";
  const WHATSAPP_LINK = SITE_CONFIG.WHATSAPP_LINK || "";
  const VISA_QUESTION = !!SITE_CONFIG.RSVP_VISA_QUESTION;
  const DECLINE_MSG   = SITE_CONFIG.RSVP_DECLINE_MESSAGE ||
    "We'll miss you! Leave your number and we'll send you the livestream link so you can celebrate with us from wherever you are.";

  // Extra questions from config.js (RSVP_QUESTIONS), e.g. a meal choice.
  // Each needs a matching line in TEXT_FIELDS in setup/google-apps-script.js.
  const QUESTIONS = (SITE_CONFIG.RSVP_QUESTIONS || []).filter(q => q && /^[a-z][a-zA-Z0-9]*$/.test(q.key || ""));

  let guests = null; // filled in once main.js has opened the guest list

  // The questions this invitation sees: partyOnly ones only when it covers
  // more than one person, invitedTo ones only for guests invited to that
  // event (events: [...] on their guest-list entry).
  function questionsFor(name, max) {
    const guest  = (guests || []).find(g => g.name === name) || {};
    const events = Array.isArray(guest.events) ? guest.events : [];
    return QUESTIONS.filter(q => (!q.partyOnly || max > 1) && (!q.invitedTo || events.includes(q.invitedTo)));
  }
  const escHtml = (window.WeddingSite || {}).escHtml; // from main.js (nothing renders without it)

  // ── Boot ───────────────────────────────────────────────────────────────────
  document.addEventListener("DOMContentLoaded", function () {
    const rsvpSection = document.getElementById("rsvp");
    if (!rsvpSection || !window.WeddingSite) return;

    if (new Date() >= RSVP_DEADLINE) {
      renderClosed(rsvpSection);
      return;
    }

    renderNotice(rsvpSection);

    window.WeddingSite.onGuests(function (list) {
      guests = list;
      if (!list) {
        renderLocked(rsvpSection);
        return;
      }
      const invited = window.WeddingSite.invitedGuest;
      if (invited) {
        // Don't auto-scroll — the welcome card handles navigation for QR arrivals
        renderForm(invited.name, invited.max, rsvpSection);
      } else {
        renderSearch(rsvpSection);
      }
    });
  });

  // ── Helpers — guest list lookup ───────────────────────────────────────────
  function searchGuests(query) {
    if (!guests) return [];
    const q = query.toLowerCase().trim();
    if (!q) return [];

    // Strip "and Guest" / "& Guest" suffix before matching so that
    // typing "guest" doesn't surface every plus-one entry.
    function searchable(name) {
      return name.toLowerCase().replace(/\s*(and|&)\s*guest\s*$/i, "").trim();
    }

    // Primary: full phrase appears anywhere in the searchable name
    const primary = guests.filter(g => searchable(g.name).includes(q));
    if (primary.length > 0) return primary.slice(0, 6);

    // Secondary: every word in the query appears somewhere in the searchable name
    // handles "John Smith" → "John & Jane Smith", or searching by first/last name alone
    const words = q.split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      const secondary = guests.filter(g => {
        const n = searchable(g.name);
        return words.every(w => n.includes(w));
      });
      if (secondary.length > 0) return secondary.slice(0, 6);
    }

    return [];
  }

  // ── Locked (open window: site is open, guest list is not) ─────────────────
  function renderLocked(section) {
    const wrap = getOrCreateContainer(section);
    wrap.innerHTML = `
      <form id="rsvp-unlock" class="rsvp-unlock" autocomplete="off">
        <label class="rsvp-search-label" for="rsvp-unlock-input">Enter the invitation code to RSVP</label>
        <div class="rsvp-unlock-row">
          <input id="rsvp-unlock-input" type="password" placeholder="Invitation code" autocomplete="off" />
          <button type="submit">Continue</button>
        </div>
        <p id="rsvp-unlock-error" class="rsvp-hint" aria-live="polite"></p>
      </form>
    `;
    const form  = document.getElementById("rsvp-unlock");
    const input = document.getElementById("rsvp-unlock-input");
    const error = document.getElementById("rsvp-unlock-error");
    const btn   = form.querySelector("button");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      error.textContent = "";
      if (!input.value.trim()) return;
      btn.disabled = true;
      btn.textContent = "Checking…";
      const ok = await window.WeddingSite.unlock(input.value.trim());
      // On success main.js hands us the guest list and we re-render
      if (!ok) {
        btn.disabled = false;
        btn.textContent = "Continue";
        error.textContent = "That code didn't match. Please check your invitation and try again.";
        input.value = "";
        input.focus();
      }
    });
  }

  // ── Journey 2 — name search ───────────────────────────────────────────────
  function renderSearch(section) {
    const wrap = getOrCreateContainer(section);
    wrap.innerHTML = `
      <div id="rsvp-search">
        <p class="rsvp-search-label">Type your name as it appears on your invitation</p>
        <div class="rsvp-search-wrap">
          <input
            id="rsvp-name-input"
            type="text"
            placeholder="Your name…"
            autocomplete="off"
            aria-label="Search your name"
            aria-autocomplete="list"
            aria-controls="rsvp-suggestions"
          />
          <ul id="rsvp-suggestions" role="listbox" aria-label="Matching names on the guest list"></ul>
        </div>
        <p id="rsvp-not-found" class="rsvp-not-found" hidden>
          We couldn't find that name in our guest list. Please double-check the spelling
          as it appears on your invitation. Still having trouble? Email us at
          ${mailtoLink()}
          and we'll get you sorted.
        </p>
      </div>
    `;

    const input    = document.getElementById("rsvp-name-input");
    const list     = document.getElementById("rsvp-suggestions");
    const notFound = document.getElementById("rsvp-not-found");

    input.addEventListener("input", function () {
      const q = input.value.trim();
      list.innerHTML = "";
      notFound.hidden = true;

      if (q.length < 2) return;

      const matches = searchGuests(q);

      if (matches.length === 0) {
        notFound.hidden = false;
        return;
      }

      matches.forEach(function (guest) {
        const li = document.createElement("li");
        li.textContent = guest.name;
        li.setAttribute("role", "option");
        li.setAttribute("tabindex", "0");
        li.addEventListener("click", function () {
          list.innerHTML  = "";
          document.getElementById("rsvp-search").hidden = true;
          renderForm(guest.name, guest.max, section);
        });
        // Keyboard support: Enter or Space selects the focused suggestion
        li.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            li.click();
          }
        });
        list.appendChild(li);
      });
    });

    // Arrow key navigation within the suggestion list
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        const first = list.querySelector("li");
        if (first) { e.preventDefault(); first.focus(); }
      }
    });

    list.addEventListener("keydown", function (e) {
      const focused = document.activeElement;
      if (e.key === "ArrowDown" && focused.nextElementSibling) {
        e.preventDefault();
        focused.nextElementSibling.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (focused.previousElementSibling) {
          focused.previousElementSibling.focus();
        } else {
          input.focus();
        }
      } else if (e.key === "Escape") {
        list.innerHTML = "";
        input.focus();
      }
    });

    document.addEventListener("click", function (e) {
      if (!e.target.closest("#rsvp-search")) list.innerHTML = "";
    });
  }

  // ── Main form ─────────────────────────────────────────────────────────────
  // existing: pre-filled values when updating (optional)
  // isUpdate: true when overwriting an existing RSVP
  function renderForm(name, max, section, existing, isUpdate) {
    existing  = existing  || {};
    isUpdate  = isUpdate  || false;
    const wrap = getOrCreateContainer(section);

    const countOptions = Array.from({ length: max }, (_, i) => i + 1)
      .map(n => `<label><input type="radio" name="guestCount" value="${n}"${n === max ? " checked" : ""} /> ${n}</label>`)
      .join("");

    const visaField = VISA_QUESTION ? `
          <fieldset class="rsvp-field">
            <legend>Do you need a visa support letter?</legend>
            <label><input type="radio" name="visa" value="yes" /> Yes please</label>
            <label><input type="radio" name="visa" value="no" checked /> No, I'm fine</label>
          </fieldset>` : "";

    // Config-driven questions: shown to everyone, or only to guests who are
    // coming (attendingOnly), placed after the built-in fields.
    function questionHtml(q) {
      const id   = `rsvp-q-${q.key}`;
      const req  = q.required ? ' data-required="yes"' : "";
      const hint = q.hint ? `<p class="rsvp-hint">${escHtml(q.hint)}</p>` : "";
      const opts = (q.options || []).map(String);
      if (q.type === "radio") {
        return `
          <fieldset class="rsvp-field" data-rsvp-question="${q.key}"${req}>
            <legend>${escHtml(q.label)}</legend>
            ${opts.map(o => `<label><input type="radio" name="${id}" value="${escHtml(o)}" /> ${escHtml(o)}</label>`).join("")}
            ${hint}
          </fieldset>`;
      }
      const control = q.type === "select"
        ? `<select id="${id}"><option value="">Choose…</option>${opts.map(o => `<option>${escHtml(o)}</option>`).join("")}</select>`
        : q.type === "textarea"
          ? `<textarea id="${id}" rows="3" placeholder="${escHtml(q.placeholder || "")}"></textarea>`
          : `<input id="${id}" type="text" placeholder="${escHtml(q.placeholder || "")}" />`;
      return `
          <div class="rsvp-field" data-rsvp-question="${q.key}"${req}>
            <label for="${id}">${escHtml(q.label)}</label>
            ${control}
            ${hint}
          </div>`;
    }
    const shown = questionsFor(name, max);
    const attendingQuestions = shown.filter(q => q.attendingOnly).map(questionHtml).join("");
    const everyoneQuestions  = shown.filter(q => !q.attendingOnly).map(questionHtml).join("");

    // Success lives outside the form so hiding the form doesn't also hide the message
    wrap.innerHTML = `
      <div id="rsvp-success" hidden></div>

      <form id="rsvp-form" novalidate>

        <div class="rsvp-field">
          <label for="rsvp-name">Name(s)</label>
          <input id="rsvp-name" type="text" value="${escHtml(name)}" readonly />
          ${!isUpdate ? '<button type="button" id="rsvp-wrong-name" class="rsvp-link-btn">Not you? Search again</button>' : ""}
        </div>

        <fieldset class="rsvp-field">
          <legend>Will you be attending? <span aria-hidden="true">*</span></legend>
          <label><input type="radio" name="attending" value="yes" required /> Joyfully accepts</label>
          <label><input type="radio" name="attending" value="no" /> Regretfully declines</label>
        </fieldset>

        <div id="rsvp-attending-fields" hidden>

          <div class="rsvp-field">
            <label for="rsvp-phone">Phone number (optional)</label>
            <input id="rsvp-phone" type="tel" placeholder="e.g. +1 555 555 0123" />
            <p class="rsvp-hint">We'll send updates here.</p>
          </div>

          <fieldset class="rsvp-field">
            <legend>Number of guests attending</legend>
            <div class="rsvp-count-options">${countOptions}</div>
            <p class="rsvp-hint">Your invitation covers up to ${max} guest${max > 1 ? "s" : ""}.</p>
          </fieldset>

          <div class="rsvp-field">
            <label for="rsvp-dietary">Dietary restrictions or allergies</label>
            <textarea id="rsvp-dietary" rows="3" placeholder="Anything we should know…"></textarea>
          </div>

          <div class="rsvp-field">
            <label for="rsvp-song">Song request(s)</label>
            <input id="rsvp-song" type="text" placeholder="What gets you on the dance floor?" />
          </div>
          ${visaField}
          ${attendingQuestions}

          <div class="rsvp-field">
            <label for="rsvp-note">Leave us a note (optional)</label>
            <textarea id="rsvp-note" rows="3" placeholder="Share your well wishes or a favourite memory…"></textarea>
          </div>

        </div>

        <div id="rsvp-declining-fields" hidden>
          <div class="rsvp-livestream-notice">
            <p>${escHtml(DECLINE_MSG)}</p>
          </div>
          <div class="rsvp-field">
            <label for="rsvp-phone-decline">Phone number</label>
            <input id="rsvp-phone-decline" type="tel" placeholder="e.g. +1 555 555 0123" />
          </div>
          <div class="rsvp-field">
            <label for="rsvp-note-decline">Leave us a note (optional)</label>
            <textarea id="rsvp-note-decline" rows="3" placeholder="We'll miss you! Feel free to leave a message for the couple…"></textarea>
          </div>
        </div>

        ${everyoneQuestions}

        <!-- Bot trap: hidden from people, filled in by form-filling bots -->
        <div class="rsvp-hp" aria-hidden="true">
          <label for="rsvp-website">Website</label>
          <input id="rsvp-website" type="text" tabindex="-1" autocomplete="off" />
        </div>

        <div id="rsvp-error" class="rsvp-error" hidden></div>

        <button id="rsvp-submit" type="submit">
          ${isUpdate ? "Update my RSVP" : "Send RSVP"}
        </button>

      </form>
    `;

    // Pre-fill existing values when updating
    if (existing.attending) {
      const val = existing.attending === "Yes" ? "yes" : "no";
      const radio = document.querySelector(`input[name="attending"][value="${val}"]`);
      if (radio) {
        radio.checked = true;
        document.getElementById("rsvp-attending-fields").hidden = (val !== "yes");
        document.getElementById("rsvp-declining-fields").hidden = (val !== "no");
      }
    }
    if (existing.guestCount) {
      const countRadio = document.querySelector(`input[name="guestCount"][value="${parseInt(existing.guestCount, 10)}"]`);
      if (countRadio) countRadio.checked = true;
    }
    if (existing.dietary && existing.dietary !== "None") {
      document.getElementById("rsvp-dietary").value = existing.dietary;
    }
    shown.forEach(function (q) {
      const v = existing[q.key];
      if (!v) return;
      const box = document.querySelector(`[data-rsvp-question="${q.key}"]`);
      const radio = box && box.querySelector(`input[type="radio"][value="${CSS.escape(v)}"]`);
      if (radio) radio.checked = true;
      else if (box) { const el = box.querySelector("select, textarea, input"); if (el) el.value = v; }
    });
    if (existing.song) {
      document.getElementById("rsvp-song").value = existing.song;
    }
    if (existing.visaLetter && VISA_QUESTION) {
      const visaRadio = document.querySelector(`input[name="visa"][value="${existing.visaLetter.toLowerCase() === "yes" ? "yes" : "no"}"]`);
      if (visaRadio) visaRadio.checked = true;
    }
    // Pre-fill BOTH the attending and declining versions of phone + note,
    // so switching the answer on an update never sends those fields blank.
    ["rsvp-phone", "rsvp-phone-decline"].forEach(function (id) {
      if (existing.phone) document.getElementById(id).value = existing.phone;
    });
    ["rsvp-note", "rsvp-note-decline"].forEach(function (id) {
      if (existing.note) document.getElementById(id).value = existing.note;
    });

    // "Not you?" takes the guest back to the search box (not shown in update mode)
    const wrongNameBtn = document.getElementById("rsvp-wrong-name");
    if (wrongNameBtn) {
      wrongNameBtn.addEventListener("click", function () {
        window.WeddingSite.invitedGuest = null;
        renderSearch(section);
      });
    }

    document.querySelectorAll('input[name="attending"]').forEach(function (r) {
      r.addEventListener("change", function () {
        document.getElementById("rsvp-attending-fields").hidden  = (this.value !== "yes");
        document.getElementById("rsvp-declining-fields").hidden  = (this.value !== "no");
      });
    });

    document.getElementById("rsvp-form").addEventListener("submit", function (e) {
      e.preventDefault();
      submitRSVP(name, max, isUpdate);
    });
  }

  // ── Submission ────────────────────────────────────────────────────────────
  function submitRSVP(name, max, isUpdate) {
    const attendingEl  = document.querySelector('input[name="attending"]:checked');
    const btn          = document.getElementById("rsvp-submit");
    const submitLabel  = isUpdate ? "Update my RSVP" : "Send RSVP";

    if (!attendingEl) {
      showRsvpError("attending");
      return;
    }

    const isAttending = attendingEl.value === "yes";

    // Guard: config.js must have set RSVP_ENDPOINT before this script runs
    const endpoint = rsvpEndpoint();
    if (!endpoint) {
      showRsvpError("config");
      return;
    }
    const countEl = document.querySelector('input[name="guestCount"]:checked');
    const count   = isAttending ? parseInt(countEl?.value || max, 10) : 0;

    // Guard: count cannot exceed the guest's allocation (the backend checks
    // again when it has a Guests tab, since anyone can POST to it)
    if (isAttending && count > max) {
      showRsvpError("count");
      return;
    }

    const visaEl = document.querySelector('input[name="visa"]:checked');
    const val    = id => (document.getElementById(id)?.value || "").trim();

    // Config-driven answers (attendingOnly ones are blank when declining)
    const answers = {};
    for (const q of questionsFor(name, max)) {
      if (q.attendingOnly && !isAttending) { answers[q.key] = ""; continue; }
      const box = document.querySelector(`[data-rsvp-question="${q.key}"]`);
      const el  = box && (box.querySelector("input:checked") || box.querySelector("select, textarea, input:not([type=radio])"));
      answers[q.key] = el ? String(el.value || "").trim() : "";
      if (q.required && !answers[q.key]) {
        showRsvpError("required", q.label);
        return;
      }
    }

    // Blank fields on an update keep what's already on file (the backend
    // merges), so declining never wipes a phone number we still need.
    const payload = {
      name:        name,
      phone:       isAttending ? val("rsvp-phone") : val("rsvp-phone-decline"),
      attending:   isAttending ? "Yes" : "No",
      guestCount:  String(count),
      dietary:     isAttending ? val("rsvp-dietary") : "",
      song:        isAttending ? val("rsvp-song")    : "",
      note:        isAttending ? val("rsvp-note")    : val("rsvp-note-decline"),
      visaLetter:  isAttending && visaEl ? visaEl.value : "no",
      isUpdate:    isUpdate || false,
      honeypot:    val("rsvp-website"), // bot trap — Apps Script ignores non-empty values
    };
    Object.keys(answers).forEach(k => { if (!(k in payload)) payload[k] = answers[k]; });

    btn.disabled    = true;
    btn.textContent = "Sending…";

    sendRSVP(endpoint, payload)
      .then(function (data) {
        if (data.result === "duplicate") {
          document.getElementById("rsvp-form").hidden = true;
          renderDuplicateConfirm(name, max, data.existing || {}, payload);
        } else if (data.result === "success") {
          document.getElementById("rsvp-form").hidden = true;
          renderSuccess(getOrCreateContainer(document.getElementById("rsvp")), payload, isUpdate, name, max);
        } else {
          throw new Error((data && data.message) || "unexpected");
        }
      })
      .catch(function (err) {
        showRsvpError(err && err.message);
        btn.disabled    = false;
        btn.textContent = submitLabel;
      });
  }

  function sendRSVP(endpoint, payload) {
    // text/plain keeps this a "simple" request: application/json triggers a
    // CORS preflight that Apps Script can't answer, and the form silently
    // fails (worst on Safari/iOS).
    return fetch(endpoint, {
      method:  "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body:    JSON.stringify(payload),
    }).then(r => r.json());
  }

  function rsvpEndpoint() {
    const e = SITE_CONFIG.RSVP_ENDPOINT;
    return (e && e !== "YOUR_GOOGLE_APPS_SCRIPT_URL_HERE") ? e : "";
  }

  // ── Changing an existing RSVP ─────────────────────────────────────────────
  // One confirmation screen: what's on file next to the new answer, and
  // confirming resubmits it as an update straight away. Cancelling a yes
  // gets kinder wording and a note box. "Go back" returns to the form
  // pre-filled with what's on file; nothing changes unless they confirm.
  // existing: the backend only returns attending + guest count (never phone,
  // note or dietary info: anyone can POST any name to the endpoint).
  function renderDuplicateConfirm(name, max, existing, submitted) {
    const wrap = getOrCreateContainer(document.getElementById("rsvp"));

    function describe(r) {
      const yes = r.attending === "Yes" || r.attending === "yes";
      if (!yes) return "Not attending";
      const n = parseInt(r.guestCount, 10);
      return n ? `Attending, ${n} guest${n > 1 ? "s" : ""}` : "Attending";
    }

    const cancelling   = existing.attending === "Yes" && submitted.attending !== "Yes";
    const heading      = cancelling ? "Can't make it anymore?" : "You already have an RSVP on file.";
    const sub          = cancelling
      ? "We'll miss you, and we completely understand. Thank you for letting us know. Please confirm and we'll update your RSVP."
      : "Please confirm you'd like to replace it with your new answer.";
    const confirmLabel = cancelling ? "Yes, I can't make it" : "Yes, update my RSVP";

    wrap.innerHTML = `
      <div id="rsvp-duplicate-confirm" class="rsvp-duplicate-panel">
        <p class="rsvp-duplicate-heading">${heading}</p>
        <p class="rsvp-duplicate-sub">${sub}</p>
        <ul class="rsvp-existing-summary">
          <li><strong>On file now:</strong> ${escHtml(describe(existing))}</li>
          <li><strong>Your update:</strong> ${escHtml(describe(submitted))}</li>
        </ul>
        ${cancelling ? `
        <div class="rsvp-field rsvp-confirm-note">
          <label for="rsvp-confirm-note">Leave us a note (optional)</label>
          <textarea id="rsvp-confirm-note" rows="3" placeholder="We'll miss you! Feel free to leave a message for the couple…">${escHtml(submitted.note || "")}</textarea>
        </div>` : ""}
        <div id="rsvp-error" class="rsvp-error" hidden></div>
        <div class="rsvp-duplicate-actions">
          <button id="rsvp-confirm-update"  type="button">${confirmLabel}</button>
          <button id="rsvp-confirm-back"    type="button">Go back</button>
        </div>
        <p class="rsvp-hint">
          Nothing changes unless you confirm. If something looks wrong, email us at
          ${mailtoLink()}.
        </p>
      </div>
    `;

    // "Go back": back to the form, pre-filled with what's on file, as an
    // update (so re-submitting doesn't loop through this screen again).
    document.getElementById("rsvp-confirm-back").addEventListener("click", function () {
      wrap.innerHTML = "";
      renderForm(name, max, document.getElementById("rsvp"), existing, true);
    });

    const confirmBtn = document.getElementById("rsvp-confirm-update");
    confirmBtn.addEventListener("click", function () {
      const endpoint = rsvpEndpoint();
      if (!endpoint) { showRsvpError("config"); return; }
      const noteEl = document.getElementById("rsvp-confirm-note");
      const update = Object.assign({}, submitted, {
        isUpdate: true,
        note:     noteEl ? noteEl.value.trim() : submitted.note,
      });
      confirmBtn.disabled    = true;
      confirmBtn.textContent = "Updating…";
      sendRSVP(endpoint, update)
        .then(function (data) {
          if (data.result === "success") {
            wrap.innerHTML = "";
            renderSuccess(wrap, update, true, name, max);
          } else {
            throw new Error((data && data.message) || "unexpected");
          }
        })
        .catch(function (err) {
          showRsvpError(err && err.message);
          confirmBtn.disabled    = false;
          confirmBtn.textContent = confirmLabel;
        });
    });
  }

  // ── Success summary ───────────────────────────────────────────────────────
  // payload shape matches the object sent to the server (attending, guestCount, etc.)
  function renderSuccess(container, payload, isUpdate, name, max) {
    const attending = payload.attending === "Yes";
    const headline  = isUpdate
      ? "Your RSVP has been updated. ♥"
      : "Thank you for filling out the RSVP. ♥";

    const rows = [];
    rows.push(`<li><strong>Status:</strong> ${attending ? "Joyfully attending" : "Regretfully declining"}</li>`);
    if (attending) {
      const count = parseInt(payload.guestCount, 10);
      if (count) rows.push(`<li><strong>Guests:</strong> ${count}</li>`);
      if (payload.dietary) rows.push(`<li><strong>Dietary notes:</strong> ${escHtml(payload.dietary)}</li>`);
      if (payload.song)    rows.push(`<li><strong>Song request:</strong> ${escHtml(payload.song)}</li>`);
      if (payload.visaLetter === "yes") rows.push(`<li><strong>Visa support letter:</strong> Yes, we'll be in touch</li>`);
    }
    if (payload.phone)  rows.push(`<li><strong>Phone:</strong> ${escHtml(payload.phone)}</li>`);
    QUESTIONS.forEach(function (q) {
      if (payload[q.key]) rows.push(`<li><strong>${escHtml(q.summaryLabel || q.label)}:</strong> ${escHtml(payload[q.key])}</li>`);
    });
    if (payload.note)   rows.push(`<li><strong>Note:</strong> ${escHtml(payload.note)}</li>`);

    container.innerHTML = `
      <div class="rsvp-success-panel">
        <p class="rsvp-success-headline">${headline}</p>
        <ul class="rsvp-success-summary">${rows.join("")}</ul>
        <button type="button" class="rsvp-update-link" id="rsvp-success-update">Update my RSVP</button>
      </div>
    `;

    document.getElementById("rsvp-success-update").addEventListener("click", function () {
      container.innerHTML = "";
      renderForm(name, max, document.getElementById("rsvp"), payload, true);
    });
  }

  // ── Static states ─────────────────────────────────────────────────────────
  function renderClosed(section) {
    const whatsapp = WHATSAPP_LINK
      ? ` or on <a href="${escHtml(WHATSAPP_LINK)}" target="_blank" rel="noopener">WhatsApp</a>`
      : "";
    getOrCreateContainer(section).innerHTML = `
      <div class="rsvp-closed">
        <p>Our RSVP form has closed.</p>
        <p>If you haven't replied yet or need to change your answer, reach out to us at
          ${mailtoLink()}${whatsapp} and we'll do our best to accommodate you.
        </p>
      </div>
    `;
  }

  // Sits above the dynamic container (not inside it), so it stays visible
  // through the search, form, duplicate, and success views, which all
  // replace the container's contents.
  function renderNotice(section) {
    if (!SITE_CONFIG.RSVP_NOTICE) return;
    const narrow = section.querySelector(".container--narrow") || section;
    const note   = document.createElement("p");
    note.className   = "rsvp-notice";
    note.textContent = SITE_CONFIG.RSVP_NOTICE;
    narrow.appendChild(note);
  }

  // ── DOM helpers ───────────────────────────────────────────────────────────
  function getOrCreateContainer(section) {
    let el = document.getElementById("rsvp-upgrade-container");
    if (!el) {
      el    = document.createElement("div");
      el.id = "rsvp-upgrade-container";
      // Append inside the narrow container so it inherits padding on mobile
      const narrow = section.querySelector(".container--narrow") || section;
      narrow.appendChild(el);
      // Hide the static intro copy once the dynamic form takes over
      const intro = section.querySelector(".section-body");
      if (intro) intro.hidden = true;
    }
    return el;
  }

  // ── Error display — tailors the message to what actually went wrong ───────
  // reason: "attending" (no answer picked), "required" (a required
  // RSVP_QUESTIONS answer is missing; detail = its label), "config" (endpoint not set up),
  // "count" (guest count guard tripped), or a message string from the Apps
  // Script backend's respond("error", ...).
  function showRsvpError(reason, detail) {
    const el = document.getElementById("rsvp-error");
    if (!el) return;

    let title = "We couldn't submit your RSVP.";
    let body;
    if (reason === "attending") {
      title = "One more thing.";
      body  = "Please let us know whether you'll be attending.";
    } else if (reason === "required") {
      title = "One more thing.";
      body  = `Please answer: ${escHtml(detail)}`;
    } else if (reason === "config") {
      body = `Our RSVP form isn't fully set up yet. Please email us at ${mailtoLink()} so we can get this fixed.`;
    } else if (reason === "count") {
      body = `That guest count is higher than what your invitation covers. Please choose a number within your invitation's limit, or email us at ${mailtoLink()} if you need it adjusted.`;
    } else if (reason === "busy") {
      body = "Our RSVP sheet is busy right now. Please wait a few seconds and try submitting again.";
    } else if (reason && reason !== "unexpected" && !/fetch|network|JSON/i.test(reason)) {
      body = `${escHtml(reason)} Please email us at ${mailtoLink()} and we'll get it sorted.`;
    } else {
      body = `Something went wrong on our end submitting your RSVP. Please check your connection and try again. If it keeps happening, email us at ${mailtoLink()} and we'll get your RSVP sorted manually.`;
    }

    el.innerHTML = `<p><strong>${title}</strong></p><p>${body}</p>`;
    el.hidden = false;
  }

  function mailtoLink() {
    const e = escHtml(CONTACT_EMAIL);
    return `<a href="mailto:${e}">${e}</a>`;
  }

})();
