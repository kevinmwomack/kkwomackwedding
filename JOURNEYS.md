# User journeys

The journeys `npm test` still runs. Names below are the `journey()` strings
in `tests/*.test.js`. Welcome-card, on-site RSVP, Apps Script, and personal
QR-card journeys are not in this suite.

```bash
npm install && npx playwright install chromium   # once
npm test                                          # every journey below
node tests/run.js "Guest types"                   # journeys whose name contains that text
```

`npm test` builds throwaway copies of the site in `test-results/`
(gitignored) and drives a real browser against them. The default page
those copies expect is this fork: a password gate and `#rsvp-coming`.
The extras and quality journeys copy pages in from `examples/` for that
run only. Those pages are not wired into the site.

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

A wrong code stays on the gate. A right code opens the page, shows Coming
Soon in `#rsvp-coming`, and stores a key in `localStorage` under
`wedding_key`. A `?name=` and `?pw=` link opens the page and strips those
parameters. The weekend journey sets `OPEN_WINDOW` and `DAY_OF_BUTTON`.

## Automated: choices that still apply

`tests/04-couple-choices.test.js`

| Journey |
|---|
| Couple uses another RSVP service: no guest list, a button to their RSVP page |
| Couple wants a fully public site: no code, no guest list, no RSVP form |
| Couple strips the page down: no countdown, travel, registry or FAQ |
| Couple shows a new fact anywhere with data-field |
| Couple has a brunch: calendar files, Google links, and a map link |

The other-service journey replaces `#rsvp-coming` with `#rsvp-elsewhere`
and an external link. The public-site journey removes the gate and
`SITE_PASSWORD`. The brunch journey checks `wedding.ics`, `brunch.ics`,
the Google Calendar link, and the map link built from the address.

## Automated: extras, installed only inside the test

`tests/05-extras.test.js`

| Journey |
|---|
| Couple adds every extra: Our Story + wedding party, gallery, gifts, day-of, menu, brunch page, short link |

Gallery, gifts, and day-of stay in `examples/` on this fork. This journey
copies them in, builds, and checks them. It is not a claim that those
pages are already on the site.

## Automated: quality

`tests/07-quality.test.js`

| Journey |
|---|
| Accessibility: no axe violations on the gated page or example pages |
| Phones: buttons and links are big enough to tap (44px) |
| Reduced motion: everything is visible straight away, nothing animates |
| Links, images and guest-facing copy |

The accessibility and tap-target journeys also open example pages after
installing them. Links inside a sentence are exempt from the 44px check.
The copy journey checks `rel="noopener"` on new-tab links, `alt` on
images, `lang`, and `noindex`.

## Automated: build

`tests/02-build.test.js`

| Journey |
|---|
| Build: published files hold no code, no guest names, no private files |
| Build: refuses the example code, a code baked into a link, duplicate guests |
| Build: half-removed features are caught (RSVP without guests, gate without code) |
| Build: CI path reads secrets, not files; default PBKDF2 strength |
| Build: shared markup comes from partials; a misspelled include is caught |
| Build: an event without a time zone, or with a bad key, is refused |

These are the build's safety checks. The example password `ChangeMe123`
must still be refused. A gate with no password must still fail. Renaming
`#rsvp-coming` to `id="rsvp"` must still fail. The CI journey checks that
the build reads `SITE_CONFIG_JS` from the environment and that the default
PBKDF2 iteration count is 310000. This fork's deploy sets `SITE_CONFIG_JS`
only.

Some of these journeys still pass a guest-list fixture into the build to
prove published files do not leak names and that a duplicate name is
refused. That fixture lives inside the test. Setup for this fork does not
add `js/guests.js`.

## Manual checks that still apply

| Check | How |
|---|---|
| Real phone | Inputs do not zoom, the page does not scroll sideways, the gate and Coming Soon read clearly |
| Screen reader (VoiceOver, TalkBack) | Gate, headings, and the Coming Soon section |
| Live site after deploy | SETUP.md section 6 |
| Change a wedding fact | Edit `js/config.js`, update `SITE_CONFIG_JS`, re-run the workflow |
| The code leaked | Change `SITE_PASSWORD`, update the secret, redeploy. Everyone is signed out. |

## Improving the template itself

1. Keep it generic: placeholder names only, never a real couple's details,
   in code, docs, commits, or PRs.
2. Add or update the journey here and its test in `tests/`.
3. `npm test`, then look at the pages you touched at 320px.
