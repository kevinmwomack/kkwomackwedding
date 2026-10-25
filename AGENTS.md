# Agent guide — this fork

This repository is one password-gated invitation page. Wedding facts live
on the site. Guest responses will live in an embedded Google Form. There
is no guest list, no welcome card, no on-site RSVP form, and no Apps Script.

[PLAN.md](PLAN.md) is the source of truth for what this checkout is, what
is already decided, and what is still open. Deploy and local preview steps
are in [SETUP.md](SETUP.md). Claude Code reads this file through
`CLAUDE.md`.

[LESSONS.md](LESSONS.md) is history from the template this fork started
from. It is not a checklist. [SECURITY.md](SECURITY.md) still describes
that template's guest list and Apps Script. Those sections are not steps
for this fork. The rules that still apply are below.

Gallery, gifts, day-of, and the thank-you page live in `examples/` and are
not wired in. Copy one in only when someone asks for it.

## Security rules (read first)

- **Never commit `js/config.js`.** It holds the invitation code. It is
  gitignored. Check `git status` before every commit. The only deploy
  secret is `SITE_CONFIG_JS`.
- **Never write the invitation code into any HTML or JS file**, including
  links like `live.html?pw=...`. One code unlocks every page. The build
  derives a PBKDF2 check from `SITE_PASSWORD` (`AUTH.salt`,
  `AUTH.iterations`, `AUTH.check`, 310,000 iterations by default) and fails
  if the plaintext code appears in published output. The browser stores the
  derived key in `localStorage` under `wedding_key`. Do not work around
  that check. `js/config.example.js` keeps `SITE_PASSWORD` as the string
  `ChangeMe123`. The build refuses that public placeholder.
- Config values and anything a guest typed go into the page through
  `textContent` or `escHtml()`, never raw into `innerHTML`. An iframe
  `src` for the form embed needs its own assignment and must not go
  through `innerHTML`.
- Do not paste the couple's real details into issues, PRs, commit messages,
  or this repo's docs. Use placeholders.

## Leave these out

Do not rebuild the stack this fork removed:

- `js/guests.js`, `js/guests.example.js`, `guests.csv`, and a `GUESTS_JS` secret
- `setup/google-apps-script.js` and a Google Sheet Apps Script deployment
- the welcome card and `WELCOME` behavior
- personal invitation cards and `setup/cards/`
- the on-site RSVP form, `js/rsvp-upgrade.js`, and a section with `id="rsvp"`

`js/config.example.js` still contains template fields this page does not
read (`RSVP_ENDPOINT`, `RSVP_QUESTIONS`, `WELCOME`, and the comments that
mention a guest list). Leave that file's `SITE_PASSWORD` as `ChangeMe123`.
Do not add a guest list to satisfy those comments.

`setup/build.js` still refuses `id="rsvp"` when there is no guest list.
The Coming Soon section stays `id="rsvp-coming"`.

## What to do here

Names, date, venue, schedule, dress code, travel, registry, palette, the
shared password, and the real form URL are still open. They are listed in
PLAN.md. Until they are decided, keep the placeholders already in
`js/config.example.js` and `index.html`. Do not invent the couple's names,
date, venue, or password.

1. `cp js/config.example.js js/config.js`. That copy is gitignored. Do not
   commit it.
2. For a local preview, set `SITE_PASSWORD` in `js/config.js` to something
   other than `ChangeMe123`, and put placeholder or real copy in that
   file. Creating `js/config.js` and running `npm start` is a local check,
   not a commit. Leave the example file showing `ChangeMe123`.
3. `js/config.js` fills the page through `data-field` and
   `data-href-field` (`applySiteContent()` in `js/main.js`). `data-field`
   sets text. The directions link is already built from `VENUE_NAME` plus
   `VENUE_ADDRESS`.
4. Preview with `npm start`. It builds `_site/` and serves it on port
   3000. Always test the built `_site/`. The raw folder has no generated
   key check and will not unlock.
5. When copy is ready, replace the `{{double-brace}}` placeholders in
   `index.html` that are not wired to config. Colors and fonts go in
   `css/theme.css` only. Once initials exist, generate the favicon with
   `node setup/generate-favicon.js "A+B"`.
6. Deploy per SETUP.md: the `SITE_CONFIG_JS` secret (the whole of
   `js/config.js`), Pages source **GitHub Actions**, push `main`.
   "Deploy from a branch" serves the raw repo. That source is wrong.

The RSVP area (`#rsvp-coming`) says Coming Soon. Leave it until a later
commit embeds the Google Form there. Follow the Google Forms section in
PLAN.md. Keep an id other than `rsvp`. Embedding does not confine
submissions to people who passed the gate: anyone with the form link can
submit.

## Pitfalls that still apply

- **Times need a UTC offset** (`2027-06-12T16:00:00-04:00`). Without it,
  every guest's phone reads the time in its own zone. The build warns. An
  event with no offset, or with a bad key, fails the build.
- **The example password fails the build.** `ChangeMe123` stays in
  `js/config.example.js`. A preview or a deploy uses a different password
  in gitignored `js/config.js` and in the `SITE_CONFIG_JS` secret.
- **`id="rsvp"` fails the build** on this fork. The Coming Soon section is
  `#rsvp-coming`. A later form embed keeps an id other than `rsvp`.
- **The gate is a courtesy.** The HTML is readable without the code. Do not
  put a home address or a gift-account number in the page.
- **Dead markup drift.** If you add a page or section and later remove it,
  grep for its class names and ids across `css/` and `js/` before
  considering the removal done.
- **Init functions must tolerate missing elements.** One thrown error in a
  boot function silently skips every init after it on that page.
- **One repository has one GitHub Pages site.** The workflow deploys
  `main` only. See PLAN.md before adding a preview branch.
- **Test the live site once it is deployed.** "The code looks right" and
  "the live site works" are different claims.

## Turning things off, adding things

Follow [CUSTOMIZING.md](CUSTOMIZING.md). Run `npm test` after changing
anything in `js/`, `setup/`, or `index.html`. The journeys that still run
are listed in [JOURNEYS.md](JOURNEYS.md).

## Adding pages and extras

Optional pages live in `examples/` with copy-into-place instructions:
gallery, Our Story and wedding party (`photos/`), registry and gift options
(`gifts/`), a wedding-day program and menu (`day-of/`), a public short-link
redirect (`short-link/`), and the after-the-wedding thank-you
(`after-the-wedding/`). None of them are wired in.
`examples/README.md` still mentions adding `js/guests.js` for a personalized
welcome. This fork does not add that file.

Any new page that should be gated needs the `<!-- include: password-gate -->`
line plus `js/config.js` and `js/main.js`. Shared markup lives in
`partials/`. Photos go in `images/`, the only image folder the build
publishes.
