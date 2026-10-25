# Agent guide — building a couple's site from this template

For any AI coding agent (Claude Code, Codex, Cursor, Copilot, Gemini CLI or
another). Most of them read `AGENTS.md` automatically; if yours doesn't,
point it at this file. Claude Code reads it through `CLAUDE.md`.

This file is about *how to drive the conversation* with a couple to get a
working first draft quickly, and the pitfalls that are easy to reintroduce.
People working without an agent: start with [SETUP.md](SETUP.md); the two
question lists below double as a checklist of what to collect.
[LESSONS.md](LESSONS.md) has the reasoning behind most of them.

## Security rules (read first)

- **Never commit `js/config.js`, `js/guests.js`, `guests.csv`,
  `guests-sheet.csv`, `invite-cards/` or `print/`.** They hold the
  invitation code and the guest list. They're gitignored; check
  `git status` before every commit anyway.
- **Never write the invitation code into any HTML or JS file**, including
  links like `live.html?pw=...`. One code unlocks every page and the key is
  remembered on the device. `setup/build.js` fails the build if it finds
  the code in published output; don't work around that check.
- **Never return private RSVP fields from the Apps Script** (phone, note,
  dietary, email). The endpoint is public. See SECURITY.md.
- Config values and anything a guest typed go into the page through
  `textContent` or `escHtml()`, never raw into `innerHTML`.
- Don't paste the couple's real details into issues, PRs, commit messages
  or this repo's docs. If you're improving the template itself (not a
  couple's fork), use placeholder names only.

## Ask these questions before writing any code

Don't start editing files until you have, at minimum:

0. **Which of the big pieces they want** (any can be dropped; see
   CUSTOMIZING.md): an RSVP form on the site (or another service, or
   none), an invitation code (or a public site), personal QR invitations.
   The rest of this list shrinks accordingly.
1. **Both names**, exactly as the couple wants them displayed (check
   capitalization, "&" vs "and", nicknames vs. full names).
2. **Wedding date and start time, with the venue's time zone** — drives
   the countdown and every time window. Get the ceremony start time, not
   just the date.
3. **Venue name and a full address** (for a Google Maps search query).
4. **RSVP deadline**, and separately the "please reply by" date to print
   (usually a week or two earlier; see LESSONS.md).
5. **An invitation code.** Steer them toward a three-word phrase rather
   than a short code; anyone can try guesses offline against the built
   site.
6. **Contact email and/or WhatsApp link** for "questions" links.
7. **Dress code**, as free text.
8. **Whether to ask about visa support letters** (international guests),
   and who the alert email goes to. Same for per-RSVP notification emails.
9. **Guests who can't travel**, if any, and how the welcome card should
   speak to them (`WELCOME.groups`).
10. **A hashtag**, if they want one (optional, cosmetic).
11. **The guest list** — name as it should appear pre-filled on the RSVP
    form, and max party size per invitation. This can come later than the
    rest, but nothing RSVP-related works without it.

Don't ask about the "Our Story" timeline, gallery, or registry content in
this first pass. Offer the extras in `examples/` only if the couple brings
them up.

## Second pass: closer to the wedding

A first draft gets invitations out. The site a couple ends up with by the
wedding week usually needs these too; ask about them once the first draft
is live (each maps to config or an example):

- **Registry and gift options**: links, payment handles, and whether
  guests abroad need another way to send money → `examples/gifts/`.
- **Our Story, photos, wedding party**: dates, captions, who's in the
  party and whether they're happy to be on the site → `examples/photos/`.
- **Livestream**: will there be one, who's watching, from which time
  zones, and the link once it exists → `RSVP_DECLINE_MESSAGE`,
  `WELCOME.groups`, `examples/day-of/` (`data-alt-time-zone`).
- **Wedding-day program**: the run of show with times, the shared photo
  album link, the menu and bar from the venue's final event order, any
  allergy notes → `examples/day-of/` (`live.html`, `menu.html`),
  `DAY_OF_BUTTON`.
- **Wedding weekend**: should the site open without the code
  (`OPEN_WINDOW`), and from when to when?
- **Other events** (welcome drinks, a brunch) → a page with its own
  countdown (`data-countdown-date`, see `examples/README.md`).
- **After the RSVP cutoff**: reopen for late cancellations with a note
  (`RSVP_NOTICE`), and when it closes for good.
- **Printed things**: invitations, table cards, signs, a short link for
  the photo album → `setup/cards/` (renders designs to PNG/PDF) and
  `examples/short-link/`. Print addresses as text as well as QR codes.
- **After the wedding**: thank-you page, livestream recording, cleanup →
  `examples/after-the-wedding/`.

## Build order

1. `cp js/config.example.js js/config.js` immediately (nothing builds
   without it), and `cp js/guests.example.js js/guests.js` if the site
   will have RSVPs or personal invitations.
2. Fill in `js/config.js` from the answers above. It drives most of the
   site via `data-field`/`data-href-field` attributes in `index.html` (see
   `applySiteContent()` in `js/main.js`) and the welcome card — fill it in
   before touching HTML, not after.
3. Preview with `npm start` (builds `_site/`, serves it on :3000). Always
   test the built `_site/`, never the raw files; the raw folder has no
   generated key check or encrypted guest list and won't unlock.
4. Replace the `{{double-brace}}` placeholders in `index.html` that
   *aren't* wired to config — event times, map query, registry blurb,
   travel/accommodation, FAQ answers, dress-code description.
5. Pick a palette in `css/theme.css` (Midnight & Blush default,
   Terracotta & Teal, Greyscale), or put the couple's colors and fonts
   there. It's the only file for the look; nothing else holds a color.
6. Generate the favicon once you have initials:
   `node setup/generate-favicon.js "A+B"` (uses the theme's color).
7. Wire up the Apps Script backend per SETUP.md section 4, including the
   Guests tab (`node setup/build.js --guests-csv`, import
   `guests-sheet.csv`, never `guests.csv`). Do this *before* final
   QA, since the deploy-versioning gotcha below means you need a real
   deployed endpoint to test against.
8. Use the throwaway test guest (`ZZZ QA Test — Do Not Use`) to
   smoke-test the live endpoint without touching a real guest's row.
9. Deploy per SETUP.md section 5 (the `SITE_CONFIG_JS` secret, plus
   `GUESTS_JS` if there's a guest list; Pages source = GitHub Actions).

## Pitfalls specific to this stack

- **Apps Script deploy versioning**: saving `setup/google-apps-script.js`
  in the Apps Script editor does **not** update the live endpoint. Create
  a new version (Deploy → Manage deployments → pencil icon → Version: New
  version → Deploy) every time. If a fix doesn't seem to take effect, check
  this first. Never "New deployment": that's a new URL.
- **Sheets auto-parses free text as formulas**: any guest-typed field that
  starts with `+`, `-`, or `=` gets corrupted (or executed) unless written
  through `writeTextFields()`. A new question goes in `TEXT_FIELDS` (which
  handles that), and must never be returned in a response.
- **Keep the Guests tab in sync** with `js/guests.js` when the list
  changes, or the endpoint will reject newly added guests. Same for the
  `GUESTS_JS` repository secret.
- **Times need a UTC offset** (`2027-06-12T16:00:00-04:00`). Without it,
  every guest's phone reads the time in its own zone. The build warns.
- **Dead markup/CSS/JS drift**: if you add a page or section and later
  remove it, grep for its class names and ids across `css/` and `js/`
  before considering the removal done.
- **Backend errors should reach the guest**: `showRsvpError()` in
  `js/rsvp-upgrade.js` surfaces real backend messages instead of a generic
  "something went wrong." Route new failure modes through it.
- **Init functions must tolerate missing elements**: one thrown error in a
  boot function silently skips every init after it on that page.
- **Test the live deployment, not just the code**: "the code looks right"
  and "the live site works" are different claims. Before telling the user
  something is fixed, hit the deployed site and endpoint, as in SETUP.md's
  QA checklist.

## Turning things off, adding things

If the couple doesn't want a feature (RSVPs, the password, the countdown,
the welcome card) or wants something new (a question on the RSVP form, a
page, printed cards), follow [CUSTOMIZING.md](CUSTOMIZING.md); it says
where each kind of change goes. Run `npm test` after changing anything in
`js/`, `setup/` or `index.html`.

## Adding pages and extras

Everything optional lives in `examples/` with copy-into-place instructions:
gallery, Our Story and wedding party (`photos/`), registry and gift options
(`gifts/`), a wedding-day program and menu (`day-of/`), a public short-link
redirect (`short-link/`), and the after-the-wedding thank-you
(`after-the-wedding/`). Any new page that should be gated needs
the `<!-- include: password-gate -->` line plus `js/config.js` and
`js/main.js` (shared markup lives in `partials/`); see
`examples/README.md`. Photos go in `images/`, the only image folder the
build publishes.
