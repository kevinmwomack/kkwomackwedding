# Wedding website template

A no-framework static wedding site: one invitation code, an encrypted guest
list, a two-journey RSVP form (personal QR link or name search) backed by a
Google Sheet, and GitHub Pages deployment. Extracted from a real wedding
site after the wedding, with everything we learned along the way folded
back in.

- **[SETUP.md](SETUP.md)** — build a new couple's site, step by step
- **[SECURITY.md](SECURITY.md)** — what's private, what isn't, and the rules that keep it that way
- **[LESSONS.md](LESSONS.md)** — what we got wrong running a real one, so you don't have to
- **[examples/](examples/)** — optional extras: gallery, Our Story page, wedding party, registry and gift options, day-of program, menu & bar page, short links, after-the-wedding page
- **[CUSTOMIZING.md](CUSTOMIZING.md)** — turning features off, adding your own, and where each kind of change goes
- **[AGENTS.md](AGENTS.md)** — guide for an AI coding agent (any of them) building a site from this
- **[JOURNEYS.md](JOURNEYS.md)** — the setups this template is tested against, and `npm test`
- **[CONTRIBUTING.md](CONTRIBUTING.md)** — improving the template itself

## Quick start

```bash
cp js/config.example.js js/config.js    # fill in (gitignored)
cp js/guests.example.js js/guests.js    # fill in (gitignored); skip if no RSVP form
npm start                               # builds _site/ and serves it on :3000
```

Deploying: add the `SITE_CONFIG_JS` (and `GUESTS_JS`) repository secrets,
set Pages to deploy from GitHub Actions, push to `main`. Details in
SETUP.md. You need Node.js 18+; no AI agent required, though any agent
will find its instructions in AGENTS.md.

Every feature is optional: a site with no RSVP form, no password, or no
personal invitations is a few deletions away (CUSTOMIZING.md).

## Features

**One invitation code for the whole site.** Guests type it once, or never:
their QR link carries it (`?name=...&pw=...`) and greets them by name with
a "You're Invited" card. The unlock is remembered on the device, and the
code is wiped from the address bar once used. The published site never
contains the code itself, only a PBKDF2 key check.

**Encrypted guest list.** `setup/build.js` publishes the guest list
encrypted with a key derived from the code, so `js/guests.js` on the live
site is ciphertext to anyone without it.

**RSVP form, two journeys.**
- *QR link*: name and party size come from the guest list (never from the
  URL) and the form opens pre-filled.
- *Direct visit*: autocomplete name search, including partial and
  out-of-order matches; unknown names get a contact link, not a lock-out.

**Changing an answer** takes one confirmation: "on file now" next to "your
update", kinder wording and a note box for cancellations, and blank fields
keep what's on file so a cancellation never wipes the phone number.

**Google Sheets backend** (`setup/google-apps-script.js`), safe with a
public URL: never returns a guest's private answers, writes everything a
guest types as plain text (no formula injection, no `+1...` turning into
`#ERROR!`), validates names and party sizes against an optional Guests tab,
caps field lengths, uses a lock against simultaneous submissions and a
honeypot against bots. Optional email on every RSVP and on visa-letter
requests.

**Wedding-weekend mode.** `OPEN_WINDOW` opens every page without the code
for a set window; `DAY_OF_BUTTON` shows a floating "Today's Program" button
on the day; `RSVP_NOTICE` adds a note above the form after final numbers
are in. Remote guests can get their own welcome-card wording via a `group`
on their guest entry.

**Build checks** that fail loudly: no real code set, the code found in a
published file, duplicate guest names. Warnings for leftover placeholders,
dates without a time zone, and short codes. Only allowlisted site files are
published, with cache-busting hashes on every CSS/JS link.

**Your own RSVP questions** (a meal choice, shuttle seats) from config,
plus one line in the Apps Script.

**Printed things** (`setup/cards/`): personalized invitations with each
guest's name and a QR code of their personal link, livestream-only cards,
spare cards, and signs, rendered from HTML with the site's fonts to PNG or
print-size PDF.

**Tested journeys** (`npm test`): guests, couples who want less or more,
and strangers poking at the public endpoint, each run in a real browser
against a fake Google Sheet.

**One theme file** (`css/theme.css`): three ready-made palettes, all
checked for readable contrast, and four self-hosted open-license fonts.
The site, examples, printed cards, QR codes and favicon all follow it.

Also: countdown timer, scroll-reveal animations, mobile nav, FAQ accordion
on native `<details>`, and a favicon generator.

## How it compares

Checked against what hosted wedding-site builders (Zola, The Knot, Joy and
others) and open-source templates offer, so the core needs are covered:

| Couples expect | Here |
|---|---|
| Names, date, venue, countdown, photo | yes |
| Schedule, dress code, directions, add to calendar | yes (calendar: `.ics` + Google) |
| Travel: hotel block with booking link, getting there, things to do | yes (placeholders to fill) |
| Our story, photo gallery, wedding party | yes (`examples/photos/`) |
| Registry and cash funds | yes (`examples/gifts/`) |
| FAQ | yes |
| RSVP limited to the guest list, party size, households | yes |
| Meal choice, dietary needs, song requests, plus-one names, custom questions | yes (`RSVP_QUESTIONS`) |
| RSVP for extra events, only for guests invited to them | yes (`EVENTS` + `invitedTo`) |
| Changing an RSVP | yes (one-step confirmation) |
| Password protection | yes (and an encrypted guest list, which hosted builders don't need) |
| Responses in a spreadsheet, email on each RSVP | yes (your own Google Sheet) |
| Livestream link, shared photo album, day-of program | yes (`examples/day-of/`, `examples/short-link/`) |
| Printed invitations with personal QR codes | yes (`setup/cards/`) |
| Custom domain, mobile-friendly, free hosting | yes (GitHub Pages) |
| Second language | by hand (CUSTOMIZING.md, "A second language") |
| Guest messaging, address collection, seating charts, budgets, checklists | no: planning tools, not a guest site; the Sheet is yours to extend |
| Confirmation emails to guests | no: the form doesn't collect guest emails (privacy); guests see a summary on screen |
| Guest photo uploads to the site itself | no: link a shared album instead (`examples/short-link/`) |

## What's intentionally not included

Couple-specific content (registry, travel and FAQ prose) has clearly marked
`{{placeholders}}` in `index.html` instead of fake text. The gallery, Our
Story, wedding party, gift options, day-of and menu pages are in
`examples/` rather than wired in, since not every couple wants them.
Truly one-off pieces (a crossword, a family planning status board) aren't
included; `examples/README.md` has the lessons from building ours.

## License

[MIT](LICENSE). The self-hosted fonts in `fonts/` are under the SIL Open
Font License 1.1 ([fonts/OFL.txt](fonts/OFL.txt)).
