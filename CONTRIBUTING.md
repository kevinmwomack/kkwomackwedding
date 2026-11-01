# Contributing

Improvements to the template are welcome: fixes, lessons from your own
wedding, new optional extras.

1. **Keep it generic.** Placeholder names only (`Sam & Riley`,
   `example.com`), never a real couple's names, venue, dates, guests or
   photos, in code, docs, commit messages or pull requests.
2. **Never commit `js/config.js`.** It holds the invitation code and is
   gitignored. Check `git status` anyway.
3. **Run the journeys**: `npm install` once, then `npm run browsers` once
   per machine, then `npm test`. Preview (`npm start`) does not need
   either install.
4. **Add or update a journey** for what you changed: a row in
   [JOURNEYS.md](JOURNEYS.md) and a test in `tests/`.
5. **Colors go through `css/theme.css`** tokens, shared markup through
   `partials/`, guest-typed text through `escHtml()` or `textContent`.
6. Something you learned the hard way? Add it to [LESSONS.md](LESSONS.md).

[AGENTS.md](AGENTS.md) has the same rules for AI coding agents, plus the
stack's pitfalls.
