# Wedding invitation page

This fork is a password-gated invitation page. Guests type one shared
code. RSVP is its own page and embeds the tester Google Form.
There is no guest list, no on-site RSVP form, and no personal invitation
codes.

Wedding facts live on the site. Responses will live in the form. The
plan, including what is still open, is [PLAN.md](PLAN.md).

- **[PLAN.md](PLAN.md)** — decisions, the form, deploy, and the checklist
- **[SETUP.md](SETUP.md)** — local preview and GitHub Pages
- **[SECURITY.md](SECURITY.md)** — invitation code, and the courtesy gate
- **[LESSONS.md](LESSONS.md)** — history from the template this fork started from
- **[CUSTOMIZING.md](CUSTOMIZING.md)** — theme, pages, partials, and the RSVP form
- **[AGENTS.md](AGENTS.md)** — instructions for an AI coding agent working on this fork
- **[JOURNEYS.md](JOURNEYS.md)** — the journeys `npm test` still runs
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — improving the template itself

## Quick start

Preview needs Node.js 18+ and nothing else. The site has no runtime
packages, and GitHub Pages runs the same build without `npm install`.

```bash
cp js/config.example.js js/config.js    # gitignored; set SITE_PASSWORD to something other than ChangeMe123
npm start                               # builds _site/ and serves it on :3000
```

`js/config.example.js` keeps the password `ChangeMe123`. The build refuses
that string. The local copy is a preview file. Do not commit it.

## Tests

`npm test` is separate from preview and from deploy. It opens the built
site in Chromium. The Playwright package is in `package.json`; the browser
binary is not.

```bash
npm install            # once: the test packages
npm run browsers       # once per machine: Chromium for the tests
npm test
```

Run the browser install from your own terminal. It saves Chromium in your
user cache, and later test runs on this computer reuse it. `npm start`
does not download or launch that browser.

Deploying: add the `SITE_CONFIG_JS` repository secret (the whole of
`js/config.js`), set Pages to deploy from GitHub Actions, and push to
`main`. Details in SETUP.md. You need Node.js 18+. Any agent will find
its instructions in AGENTS.md.

## Features

**One invitation code for the whole site.** Guests type it once. The
unlock is remembered on the device as a derived key in `localStorage`
(`wedding_key`). The published site never contains the code itself, only
a PBKDF2 key check.

**RSVP.** `rsvp.html` holds `#rsvp-coming`. The iframe `src` comes from
`RSVP_FORM_URL`. The current value is the tester form. The form is not an
on-site guest list, and it is not part of the home scroll.

**Build checks** that fail loudly: `SITE_PASSWORD` still `ChangeMe123`,
the code found in a published file, a password gate with no code, and a
section with `id="rsvp"`. Warnings for leftover placeholders, dates
without a time zone, and short codes. Only allowlisted site files are
published, with cache-busting hashes on every CSS/JS link.

**Wedding-weekend options, off until set.** `OPEN_WINDOW` can open every
page without the code for a window. `DAY_OF_BUTTON` can show a floating
"Today's Program" button. Both are `null` in the example config.

**One theme file** (`css/theme.css`): three ready-made palettes and
self-hosted fonts. The site and the favicon generator read it.

Also on the page, with placeholders until the design session: countdown,
schedule, dress code, directions, add to calendar, travel, registry, FAQ,
and mobile nav.

## How it compares

| Couples expect | Here |
|---|---|
| Names, date, venue, countdown | yes (placeholders until copy is ready) |
| Schedule, dress code, directions, add to calendar | yes (calendar: `.ics` + Google) |
| Travel, registry, FAQ | yes (placeholders to fill) |
| RSVP | Its own page (`rsvp.html`). Embedded Google Form from `RSVP_FORM_URL` (the tester form for now). No guest list and no on-site form. |
| Meal choice, dietary needs, plus-ones, custom questions | on the Google Form, once it exists |
| Changing an RSVP | a form setting, once the form exists |
| Password protection | yes (one shared code) |
| Responses in a spreadsheet, email on each RSVP | the form's sheet and notification setting, once the form exists |
| Printed invitations with a personal QR per guest | not on this fork |
| Custom domain, mobile-friendly, free hosting | yes (GitHub Pages; a custom domain can wait) |
| Guest messaging, seating charts, budgets | no: this is the guest-facing page |

## What's intentionally not included

Couple-specific content has `{{placeholders}}` in `index.html` instead of
invented details. A photo gallery, Our Story page, day-of program, menu,
gift options, and a thank-you page are starters in `examples/`. They are
not on the site until copied in.

## License

[MIT](LICENSE). The self-hosted fonts in `fonts/` are under the SIL Open
Font License 1.1 ([fonts/OFL.txt](fonts/OFL.txt)).
