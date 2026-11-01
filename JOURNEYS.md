# User journeys

The journeys `npm test` still runs. Names below are the `journey()` strings
in `tests/*.test.js`. Welcome-card, on-site RSVP, Apps Script, and personal
QR-card journeys are not in this suite.

```bash
npm install                         # once: packages from package.json
npm run browsers                    # once per machine, from your own terminal
npm test                            # every journey below
node tests/run.js "Guest types"     # journeys whose name contains that text
```

`npm install` does not download the browser. Playwright keeps Chromium in
the user cache for the terminal where you installed it. `npm start` and
the GitHub Pages build never launch it.

`npm test` builds throwaway copies of the site in `test-results/`
(gitignored) and drives a real browser against them. The default page
those copies expect is this fork: a password gate, a home page, and
`rsvp.html` with `#rsvp-coming`.

If you change anything in `js/`, `setup/`, or `index.html`, run `npm test`
before you push. If you add a feature, add its journey here and a test in
`tests/`.

[LESSONS.md](LESSONS.md) is history. This fork does not extend it.

## Who builds the site

**1. A person with no AI agent.** Manual.
Reads README → PLAN.md → SETUP.md. Copies `js/config.example.js` to
gitignored `js/config.js`, sets `SITE_PASSWORD` to something other than
`ChangeMe123`, runs `npm start`, adds the `SITE_CONFIG_JS` secret, sets
Pages to GitHub Actions, pushes `main`. *Check:* SETUP.md section 5 names
that secret and warns that "Deploy from a branch" is the wrong source.

**2. An AI agent other than Claude** (Codex, Cursor, Copilot, Gemini CLI).
Manual. The agent reads `AGENTS.md` and `PLAN.md`. *Check:* the security
rules and the "leave these out" list are in `AGENTS.md`. No instruction
tells the agent to add a guest list or an Apps Script.

**3. Claude Code.** Manual. Same as 2, through the `@AGENTS.md` import in
`CLAUDE.md`.

## Automated: guests on the page

`tests/03-guests.test.js`

| Journey |
|---|
| Guest types the code: wrong, then right; stays unlocked after closing the tab |
| A link with ?name= and the right code opens the page and strips those params |
| Guest on a small phone: no sideways scrolling |
| Wedding weekend: everything opens without the code; Today's Program button |

A wrong code stays on the gate. A right code opens the home page, which
has no RSVP section. The same unlock opens `rsvp.html`, which embeds the
form from `RSVP_FORM_URL` in `#rsvp-coming`, and stores a key in
`localStorage` under `wedding_key`. A `?name=` and `?pw=` link opens the
RSVP page and strips those parameters. The weekend journey sets
`OPEN_WINDOW` and `DAY_OF_BUTTON`.

## Automated: choices that still apply

`tests/04-couple-choices.test.js`

| Journey |
|---|
| Couple uses another RSVP service: no guest list, a button to their RSVP page |
| Couple wants a fully public site: no code, no guest list, no RSVP form |
| Couple strips the page down: no countdown, travel, registry or FAQ |
| Couple shows a new fact anywhere with data-field |
| Couple has a brunch: calendar files, Google links, and a map link |

The other-service journey replaces `#rsvp-coming` on `rsvp.html` with
`#rsvp-elsewhere` and an external link. The public-site journey removes
the gate, `rsvp.html`, and `SITE_PASSWORD`. The brunch journey checks
`wedding.ics`, `brunch.ics`, the Google Calendar link, and the map link
built from the address.

## Automated: quality

`tests/07-quality.test.js`

| Journey |
|---|
| Accessibility: no axe violations on the home page or the RSVP page |
| Phones: buttons and links are big enough to tap (44px) |
| Reduced motion: everything is visible straight away, nothing animates |
| Links, images and guest-facing copy |

The accessibility and tap-target journeys open `index.html` and
`rsvp.html`. Links inside a sentence are exempt from the 44px check.
The copy journey checks `rel="noopener"` on new-tab links, `alt` on
images, `lang`, and `noindex`.

## Automated: build

`tests/02-build.test.js`

| Journey |
|---|
| Build: published files hold no invitation code and no private files |
| Build: refuses the example code and a code baked into a link |
| Build: a section with id="rsvp", or a gate with no code, is refused |
| Build: CI path reads SITE_CONFIG_JS, not files; default PBKDF2 strength |
| Build: shared markup comes from partials; a misspelled include is caught |
| Build: an event without a time zone, or with a bad key, is refused |

These are the build's safety checks. The example password `ChangeMe123`
must still be refused. A gate with no password must still fail. Renaming
`#rsvp-coming` on `rsvp.html` to `id="rsvp"` must still fail, and the
error must not tell anyone to add `js/guests.js`. The CI journey checks
that the build reads `SITE_CONFIG_JS` from the environment and that the
default PBKDF2 iteration count is 310000. This fork's deploy sets
`SITE_CONFIG_JS` only. Published output does not include `js/guests.js`.

## Manual checks that still apply

| Check | How |
|---|---|
| Real phone | Inputs do not zoom, the page does not scroll sideways, the gate and the RSVP form read clearly |
| Screen reader (VoiceOver, TalkBack) | Gate, headings, and the RSVP form frame |
| Live site after deploy | SETUP.md section 6 |
| Change a wedding fact | Edit `js/config.js`, update `SITE_CONFIG_JS`, re-run the workflow |
| The code leaked | Change `SITE_PASSWORD`, update the secret, redeploy. Everyone is signed out. |

## Improving the template itself

1. Keep it generic: placeholder names only, never a real couple's details,
   in code, docs, commits, or PRs.
2. Add or update the journey here and its test in `tests/`.
3. `npm test`, then look at the pages you touched at 320px.
