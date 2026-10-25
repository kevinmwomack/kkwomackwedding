# Setting up this fork

You end up with a static invitation page gated by one shared password,
an RSVP area that says Coming Soon, and a GitHub Pages deploy. The
invitation code lives in gitignored `js/config.js` and in the
`SITE_CONFIG_JS` repository secret. It never goes into git.

Guest responses will be an embedded Google Form in a later change. This
setup does not create a guest list and does not deploy an Apps Script.
Decisions and the form settings are in [PLAN.md](PLAN.md).

If you use an AI agent, it should follow [AGENTS.md](AGENTS.md) and
PLAN.md.

## 0. What you need

- A **GitHub** account. Hosting is GitHub Pages. A public repo is free.
  Pages from a private repo needs a paid plan. See PLAN.md, "Custom domain",
  for the public-repo note.
- **Node.js 18 or newer** ([nodejs.org](https://nodejs.org), the LTS
  installer) to preview on your computer.

You do not need a Google account for this deploy. The form is a later
step, outside this repository, described in PLAN.md.

**No terminal at all?** Make the edits you can in GitHub's web editor,
write the config (copy `js/config.example.js` into any editor, set
`SITE_PASSWORD` to something other than `ChangeMe123`, fill placeholder
or real copy), and paste that whole file into the `SITE_CONFIG_JS` secret
in section 5. The workflow builds and publishes. Read the Actions log
after each run. GitHub will not show a secret again once saved, so keep
the config in a private note.

## 1. Copy, until the design session

Names, date, venue, schedule, dress code, travel, registry, palette, and
the shared password are still open. They are listed in PLAN.md. Use the
placeholders already in `js/config.example.js` and `index.html` until
those are decided. Do not invent them in docs, commits, or issues.

## 2. Configure and preview

On Windows, run these in PowerShell (or Git Bash). `cp` does not exist in
the old Command Prompt; there it is `copy`.

```bash
cp js/config.example.js js/config.js     # gitignored — never commit this file
```

In `js/config.js` only:

- Set `SITE_PASSWORD` to something other than `ChangeMe123`. The example
  file must keep that string. The build refuses it.
- Put placeholder or real copy in the published fields (names, date with
  a UTC offset, venue, address, dress code, contact).

Then preview:

```bash
npm start          # builds _site/ and serves it at http://localhost:3000
```

`npm start` runs `setup/build.js`. It refuses to build while
`SITE_PASSWORD` is still `ChangeMe123`, warns about leftover
`{{placeholders}}` and dates without a time zone, and checks the code did
not end up in any published file. Always preview the built `_site/`. The
raw folder has no generated key check and will not unlock.

Creating `js/config.js` and running `npm start` is a local check. It is
not a commit. Run `git status` and confirm `js/config.js` is not listed
before any commit.

## 3. Fill in the page, when copy is ready

This can wait for the design session in PLAN.md. The first deploy can
ship the placeholders.

1. In `index.html`, replace every `{{double-brace}}` that is not already
   wired to config. Names, date, venue, dress code, hashtag, and email
   come from `js/config.js` via `data-field` and `data-href-field`.
2. Put photos in `images/` (the build publishes `images/`, `css/`,
   `fonts/`, `js/`, and HTML at the root). Resize them first, around
   1600px on the long edge.
3. **Colors and fonts**: `css/theme.css` is the only color file. Three
   palettes are there (Midnight & Blush, Terracotta & Teal, Greyscale).
   Switch by commenting one out, or put the couple's colors in the active
   one. Fonts are self-hosted in `fonts/` and declared in `css/fonts.css`.
4. **Favicon**, once you have initials:
   `node setup/generate-favicon.js "A+B"` (uses the theme's color).
5. **Optional extras** (gallery, Our Story, day-of program, short links,
   after-the-wedding page) are in [`examples/`](examples/) and are not
   wired in. Copy one in only when someone asks for it.

## 4. RSVP

The page already has `<section id="rsvp-coming">` with a Coming Soon
message. Leave that section until the real Google Form exists. The later
change embeds the form in that section. Keep an id other than `rsvp`:
the build fails on `id="rsvp"` when there is no guest list.

Form settings, limits, and the fact that anyone with the form link can
submit are in PLAN.md, "Google Forms". That embed is its own commit. It
is not part of the deploy in section 5.

## 5. Deploy

1. This repository is the site. `js/config.js` is gitignored. Run
   `git status` and make sure it is not listed before you commit or push.
   Private or public is your call; see PLAN.md. A public repo publishes
   the page text. It does not publish `js/config.js`.
2. Settings → Secrets and variables → Actions → New repository secret:
   - `SITE_CONFIG_JS`: paste the whole contents of `js/config.js`
     (password already changed away from `ChangeMe123`, placeholder or
     real copy filled in).

   Update this secret whenever you change `js/config.js` locally, then
   re-run the workflow (Actions → Deploy to GitHub Pages → Run workflow).
   GitHub does not show the saved value. The edit box is blank even when
   the secret is set. Paste a complete new copy of `js/config.js` before
   saving. Saving the blank box clears the secret, and the next run skips
   the deploy. A run before the secret exists also skips, with a warning.
3. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   (Not "Deploy from a branch": that would serve the raw repo and spawns a
   legacy build that fails.)
4. Push to `main`. The workflow builds `_site/` from the secret and
   publishes only that folder.
5. Custom domain (optional; without one the site lives at
   `https://<your-username>.github.io/<repo-name>/`):
   - Buy the domain from any registrar.
   - Settings → Pages → Custom domain: enter it and save. With the
     GitHub Actions source, this setting is what counts; a `CNAME` file
     in the repo is ignored.
   - At your registrar, add the DNS records GitHub lists in its docs
     ("Managing a custom domain for your GitHub Pages site"): four `A`
     records for the bare domain and a `CNAME` record for `www` pointing
     to `<your-username>.github.io`. DNS can take up to a day. The record
     values and the order to apply them are in PLAN.md, "Custom domain".
   - Once the check passes, tick **Enforce HTTPS**.
   - Put the final address in `SITE_URL` in `js/config.js`, update the
     `SITE_CONFIG_JS` secret, and re-run the workflow. Do this before
     printing anything that contains the address.

## 6. QA before sending the link

Run these against the **live** site after the first deploy:

- [ ] Fresh visit → gate. Wrong code → "Incorrect code". Right code → the
      page, with Coming Soon in `#rsvp-coming`.
- [ ] Close the tab, reopen → still unlocked. The browser stored a derived
      key, not the password.
- [ ] View source → the invitation code does not appear. The published
      `js/config.js` has a PBKDF2 check (`AUTH`), not `SITE_PASSWORD`.
- [ ] Phone check at 320px and 375px wide: no sideways scrolling.

`OPEN_WINDOW` and `DAY_OF_BUTTON` in `js/config.js` are optional and
default to `null`. The test suite covers them. Leave them null until you
want the site to open without the code for a window, or a floating
"Today's Program" button. Details are in [CUSTOMIZING.md](CUSTOMIZING.md).
