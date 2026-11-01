# Agent guide — this fork

This repository is one password-gated invitation page. Wedding facts live
on the site. Guest responses will live in an embedded Google Form. There
is no guest list, no welcome card, no on-site RSVP form, and no Apps Script.

[PLAN.md](PLAN.md) is the source of truth for what this checkout is, what
is already decided, and what is still open. Deploy and local preview steps
are in [SETUP.md](SETUP.md). Claude Code reads this file through
`CLAUDE.md`.

[LESSONS.md](LESSONS.md) is history from the template this fork started
from. It is not a checklist. [SECURITY.md](SECURITY.md) covers the
invitation code and the courtesy gate. The rules that still apply are
below.

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

`js/config.example.js` keeps `SITE_PASSWORD` as `ChangeMe123`. Do not add
a guest list, a `GUESTS_JS` secret, an Apps Script, a welcome card, or an
`examples/` directory to satisfy an old comment.

`setup/build.js` refuses a section with `id="rsvp"` unconditionally. The
form section stays `id="rsvp-coming"` on `rsvp.html`.

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

The RSVP area is its own page, `rsvp.html`, not a section of the home
scroll. `#rsvp-coming` embeds the form from `RSVP_FORM_URL`. `initRsvpForm()`
in `js/main.js` assigns the iframe `src`. Do not put that URL through
`innerHTML`. Keep an id other than `rsvp`. The current URL is the tester
form. Embedding does not confine submissions to people who passed the
gate: anyone with the form link can submit.

## Pitfalls that still apply

- **Times need a UTC offset** (`2027-06-12T16:00:00-04:00`). Without it,
  every guest's phone reads the time in its own zone. The build warns. An
  event with no offset, or with a bad key, fails the build.
- **The example password fails the build.** `ChangeMe123` stays in
  `js/config.example.js`. A preview or a deploy uses a different password
  in gitignored `js/config.js` and in the `SITE_CONFIG_JS` secret.
- **`id="rsvp"` fails the build** on this fork. The form section is
  `#rsvp-coming` on `rsvp.html`. The iframe `src` comes from
  `RSVP_FORM_URL` and stays an id other than `rsvp`.
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

`npm start` needs no install. `npm test` needs `npm install` once and
`npm run browsers` once per machine, from a normal terminal. That browser
stays in the user cache. A sandbox that sets `PLAYWRIGHT_BROWSERS_PATH`
to its own folder will not see it.

## Adding a page

Any new page that should be gated needs the `<!-- include: password-gate -->`
line plus `js/config.js` and `js/main.js`. Start from `index.html` or
`rsvp.html`. Shared markup lives in `partials/` (the password gate and the
footer). Photos go in `images/`, the only image folder the build publishes.
