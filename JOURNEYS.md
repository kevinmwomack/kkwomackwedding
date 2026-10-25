# User journeys

The people this template has to work for, what each one is trying to do,
and how we know it works. Journeys marked **automated** run with
`npm test`; the rest are manual checks (they need a real phone, a real
Google account or a real GitHub repo).

```bash
npm install && npx playwright install chromium   # once
npm test                                          # every journey, about a minute
node tests/run.js rsvp                            # only journeys whose name matches
```

`npm test` builds throwaway copies of the template in `test-results/`
(gitignored), edits them the way each journey's doc says to, and drives a
real browser against them with a fake Google Sheet. It tests the engine
plus your current `index.html`, so if you've removed a feature on purpose
(say, the RSVP section), the journeys for that feature will fail; run the
rest by name, e.g. `node tests/run.js backend`. Pages you add from
`examples/` are built and checked too, so a placeholder you haven't filled
in yet can show up as an accessibility or broken-link failure.

If you change anything in `js/`, `setup/` or `css/`, run it before you
push. If you add a feature to the template itself, add its journey here
and a test in `tests/`.

## Who builds the site

**1. A couple (or friend) with no AI agent.** Manual.
Reads README → SETUP.md, installs Node, copies the two example files,
fills them in, `npm start`, Apps Script, two secrets, deploy. Without a
terminal: SETUP.md's "No terminal at all?" path (GitHub web editor +
secrets; the workflow builds). *Check:* every step names the exact file,
menu path or command; nothing assumes an agent.

**2. Someone using an AI agent other than Claude** (Codex, Cursor,
Copilot, Gemini CLI). Manual.
The agent reads `AGENTS.md` (Claude Code reads the same file through
`CLAUDE.md`). *Check:* the question lists, build order and security rules
are in `AGENTS.md`; no instruction depends on a Claude-only feature.

**3. Someone using Claude Code.** Manual. Same as 2, through the
`@AGENTS.md` import in `CLAUDE.md`.

## What the couple wants

| Journey | Doc | Verified by |
|---|---|---|
| **4. The full site:** code, personal QR invitations, RSVP form, welcome card | SETUP.md | automated: "Guest types the code…", "Guest scans their QR…", "Guest changes their mind…" |
| **5. Another RSVP service** (or none): no guest list, a button to their RSVP page | CUSTOMIZING.md → No RSVP form | automated: "Couple uses another RSVP service…"; the build refuses a half-removed RSVP |
| **6. A fully public site:** no code, no guest list | CUSTOMIZING.md → No password | automated: "Couple wants a fully public site…"; the build refuses a gate without a code |
| **7. Public site, private guest list:** only the RSVP asks for the code | CUSTOMIZING.md → No password, option 2 | automated: "…only the RSVP asks for the code" |
| **8. No personal invitations:** guests type the code and search | CUSTOMIZING.md | covered by "Guest types the code…" and the search steps in "Guest changes their mind…" |
| **9. A stripped-down page:** no countdown, travel, registry, FAQ | CUSTOMIZING.md → No countdown… | automated: "Couple strips the page down…" |
| **10. Their own RSVP question** (a meal choice, shuttle seats) | CUSTOMIZING.md → Your own RSVP question | automated: "Couple adds a required meal question…" (front end) and "…one TEXT_FIELDS line" (backend) |
| **10b. A brunch for some guests, plus-one names, add to calendar** | CUSTOMIZING.md → Other events, Plus-one names | automated: "Couple has a brunch for some guests…"; the build refuses events without a time zone |
| **11. Different wording for guests who can't travel** | config.example.js `WELCOME.groups` | automated: "Guest with a typo in their link…" (group welcome) |
| **12. A new fact on the page, or a private per-guest detail** | CUSTOMIZING.md → Where things go | automated: "Couple shows a new fact anywhere with data-field…" |
| **13. Every extra:** Our Story, wedding party, gallery, gifts, day-of program, menu, a brunch page, a short link | examples/ | automated: "Couple adds every extra…" (installs each as its header says) |
| **14. Printed invitations, a livestream-only card, a spare, a sign** | CUSTOMIZING.md → Printed things | automated: "Couple makes invitations…"; manual: print one and scan it with two phones |
| **15. The wedding weekend:** site opens without the code, Today's Program button | config.example.js `OPEN_WINDOW`, `DAY_OF_BUTTON` | automated: "Wedding weekend…" and the day-of steps in "Couple adds every extra…" |
| **16. After the wedding:** thank-you page, close RSVPs, clean up data | examples/after-the-wedding | manual |

## What guests do

| Journey | Verified by |
|---|---|
| Types the code (wrong, then right); comes back later without retyping | automated |
| Scans their QR: welcome card with their full name; the code leaves the address bar | automated |
| RSVPs yes with a `+` phone number; it's stored as text | automated (browser + backend) |
| Changes their mind; cancelling keeps the phone number we need for the livestream | automated |
| Has a typo in their link, or isn't on the list | automated (never locked out) |
| Uses a 320px phone | automated (no sideways scroll on every page) |
| Replies after the deadline | automated (sees how to reach the couple) |
| Uses a real iPhone and a real Android phone | manual: inputs don't zoom, QR scans, keyboard behaves |

## Quality (every page and RSVP state, every example installed)

| Check | Verified by |
|---|---|
| No accessibility violations (axe: WCAG 2.1 AA + best practices) | automated: "Accessibility: no axe violations…" |
| Buttons and links at least 44px tall on phones (links inside sentences exempt) | automated: "Phones: buttons and links are big enough to tap" |
| With reduced motion, nothing is left faded out | automated: "Reduced motion…" |
| New-tab links have `rel="noopener"`, images have `alt`, pages have `lang` and `noindex`, no em-dashes in built-in guest copy | automated: "Links, images and guest-facing copy" |
| Screen reader pass (VoiceOver, TalkBack) | manual |

## Strangers and mistakes

| Journey | Verified by |
|---|---|
| Downloads every published file looking for the code or guest names | automated: "Build: published files hold no code, no guest names…" |
| POSTs a guest's name to the public RSVP endpoint | automated: learns attending yes/no and a count, nothing private |
| Sends a formula as a "name", an oversized note, or bot spam | automated |
| A couple commits the code in a link, keeps the example code, or lists a guest twice | automated: the build refuses each |
| A couple forgets to deploy a new Apps Script version | manual: SETUP.md QA checklist against the live endpoint |

## Keeping it running

| Journey | Doc |
|---|---|
| Add or rename a guest after invitations went out | CUSTOMIZING.md → Changing things after launch |
| Change a wedding fact | same |
| The code leaked | same, and SECURITY.md |
| Edit the Apps Script | same (new version, every time) |

## Improving the template itself

1. Keep it generic: placeholder names only, never a real couple's details,
   in code, docs, commits or PRs.
2. Add or update the journey here and its test in `tests/`.
3. `npm test`, then look at the pages you touched at 320px.
4. Update LESSONS.md if the change came from something that went wrong.
