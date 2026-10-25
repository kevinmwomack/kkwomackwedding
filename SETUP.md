# Setting up a new wedding site from this template

You'll end up with: a static site gated by one invitation code, a guest
list that's encrypted in the published files, a two-journey RSVP form
(personal QR link or name search) writing to a Google Sheet you own, and
GitHub Pages deployment where the code and guest list come from repository
secrets, never from git.

Read [SECURITY.md](SECURITY.md) once before you start; it's short and it
explains which of these files are private and why. Don't want some of it
(RSVPs, the password, personal invitations)? Decide that first:
[CUSTOMIZING.md](CUSTOMIZING.md) says what to leave out.

## 0. What you need

- A **GitHub** account (hosting is free on GitHub Pages) and, for RSVPs, a
  **Google** account (the Sheet and Apps Script are free).
- **Node.js 18 or newer** ([nodejs.org](https://nodejs.org), the LTS
  installer) to preview the site on your computer. That's the only
  programming tool; there's nothing else to install for the site itself.
  Printed cards additionally need `npm install && npx playwright install
  chromium` once.
- A text editor. Any will do.

You don't need an AI agent. If you use one, it'll read
[AGENTS.md](AGENTS.md).

**No terminal at all?** It's possible, just without a preview on your own
computer: make your copy on GitHub ("Use this template", see below), edit `index.html` in GitHub's web
editor, write your config (copy `js/config.example.js`'s text into any
editor and fill it in) and guest list, and paste them straight into the two
repository secrets in section 5. The deploy workflow builds and publishes
the site, and you check it at its live address. You'll miss the build's
warnings until the workflow runs, so read its log (Actions tab) after each
change. GitHub won't show a secret again once saved, so keep your config
and guest list in a private note too; you paste the whole thing again
each time something changes.

## 1. Collect from the couple

- Both names, exactly as they want them displayed
- Wedding date + start time, with the venue's time zone
- Venue name and address (for the Google Maps link)
- RSVP deadline, and the softer "please reply by" date you'll print
- Contact email (and a WhatsApp link, if they use it)
- Dress code (free text)
- An invitation code. Memorable, but not short: anyone can download the
  site and guess offline, so a three-word phrase beats `Smith2027`.
- Whether to ask about visa support letters (international guests)
- Optional: a hashtag
- The guest list: name as it should appear on the RSVP form, and how many
  people each invitation covers

## 2. Configure

On Windows, run these in PowerShell (or Git Bash); `cp` doesn't exist in
the old Command Prompt, where it's `copy`.

```bash
cp js/config.example.js js/config.js     # gitignored
cp js/guests.example.js js/guests.js     # gitignored; skip if there's no RSVP form
```

Fill in `js/config.js` (every field is commented) and `js/guests.js`. Keep
the `ZZZ QA Test` guest until you've tested the live RSVP endpoint.

Then preview:

```bash
npm start          # builds _site/ and serves it at http://localhost:3000
```

`npm start` runs `setup/build.js`, which refuses to build without a real
`SITE_PASSWORD`, warns about leftover `{{placeholders}}` (in config and in
each page), dates without a time zone and a day-of program dated for another
day, encrypts the guest list, and checks the code didn't end up in any
published file. Always preview the built `_site/`, never the raw folder.

## 3. Fill in the page

1. In `index.html`, replace every `{{double-brace}}` that isn't already
   wired to config (names, date, venue, dress code, hashtag and email come
   from `config.js` via `data-field` attributes): ceremony/reception times,
   the Google Maps query, registry blurb, travel and accommodation, FAQ
   answers, the "please RSVP by" date.
2. Put photos in `images/` (the build only publishes `images/`, `css/`,
   `fonts/`, `js/` and HTML at the root). Resize them first, around 1600px
   on the long edge. Replace the hero placeholder gradient in
   `css/style.css` (`.hero-bg`) with your photo.
3. **Colors and fonts**: all in `css/theme.css`, which the site, the
   example pages, the printed cards and the favicon generator all read.
   Three palettes are there (Midnight & Blush, Terracotta & Teal,
   Greyscale); switch by commenting one out, or put the couple's colors in
   the active one. Keep text readable: 4.5:1 contrast or better for
   `--accent-text` and `--muted` on `--bg` (any online contrast checker
   will tell you). Fonts are self-hosted in `fonts/` and declared in
   `css/fonts.css`; the file says how to swap them.
4. **Favicon**: `node setup/generate-favicon.js "A+B"` (the couple's
   initials, on the theme's `--primary-dark`).
5. **Optional extras** (gallery, Our Story page, day-of program page, short
   links, after-the-wedding page) are in [`examples/`](examples/).

## 4. RSVP backend (Google Sheets + Apps Script)

1. Make a Google Sheet. Name the first tab **RSVPs** and give it the 11
   headers listed at the top of `setup/google-apps-script.js` (A–K).
2. Add a second tab named **Guests** with `Name` and `Max` columns:
   `node setup/build.js --guests-csv` writes a `guests-sheet.csv` you can
   import (File → Import → Insert new sheet, then rename the tab "Guests").
   Import that one, not `guests.csv`: `guests.csv` has the invitation code
   in every row's link. With this tab, the
   endpoint rejects names that aren't invited and guest counts above an
   invitation's max. Without it, it accepts anything anyone POSTs. Keep it
   in sync when the guest list changes.
3. Extensions → Apps Script. Paste in `setup/google-apps-script.js`. Set
   `NOTIFY_EMAIL` (an email per RSVP) and `VISA_EMAIL` if you want them.
4. If you set an email, run `testEmail` once from the editor to grant
   MailApp permission. Either way, the first deploy asks you to authorize
   the script (it writes to your Sheet). Google then shows "Google hasn't
   verified this app": that's expected for a script you wrote yourself.
   Click Advanced → "Go to (your project name) (unsafe)" → Allow.
5. Deploy → New deployment → Web app → Execute as **Me** → Who has access
   **Anyone**. Copy the `/exec` URL into `RSVP_ENDPOINT` in `js/config.js`.
6. **Every later edit needs a new version**: Deploy → Manage deployments →
   pencil icon → Version: New version → Deploy. Saving the script doesn't
   change the live endpoint, and "New deployment" creates a different URL.
   This is the most common "I fixed it but it's still broken" cause.

## 5. Deploy

1. Create your repo: **"Use this template"** on this repo's GitHub page.
   It starts your repo with a fresh history, owned by you. (Or make a new
   empty repo and push your local copy to it; to start its history fresh
   too, run `rm -rf .git && git init` first.) Not "Fork": a fork of a
   public repo is public and can't be made private, and stays linked to
   this one. GitHub Pages on a private repo needs a paid GitHub plan. Private or public is your call;
   see SECURITY.md, "Public or private repo?". `js/config.js`, `js/guests.js`
   and `guests.csv` are gitignored; run `git status` and make sure they
   aren't listed before your first commit.
2. Settings → Secrets and variables → Actions → New repository secret:
   - `SITE_CONFIG_JS`: paste the whole contents of `js/config.js`
   - `GUESTS_JS`: paste the whole contents of `js/guests.js` (skip it if
     the site has no guest list)

   Update these secrets whenever you change either file locally, then
   re-run the workflow (Actions → Deploy to GitHub Pages → Run workflow).
   A run before the `SITE_CONFIG_JS` secret exists skips publishing, with
   a warning saying so.
3. Settings → Pages → Build and deployment → Source: **GitHub Actions**.
   (Not "Deploy from a branch": that would serve the raw repo and spawns a
   legacy build that fails.)
4. Push to `main`. The workflow builds `_site/` from the secrets and
   publishes only that.
5. Custom domain (optional; without one the site lives at
   `https://<your-username>.github.io/<repo-name>/`):
   - Buy the domain from any registrar.
   - Settings → Pages → Custom domain: enter it and save. With the
     GitHub Actions source, this setting is what counts; a `CNAME` file
     in the repo is ignored.
   - At your registrar, add the DNS records GitHub lists in its docs
     ("Managing a custom domain for your GitHub Pages site"): four `A`
     records for the bare domain and a `CNAME` record for `www` pointing
     to `<your-username>.github.io`. DNS can take up to a day.
   - Once the check passes, tick **Enforce HTTPS**.
   - Put the final address in `SITE_URL` in `js/config.js`, update the
     `SITE_CONFIG_JS` secret, and re-run the workflow. The QR codes and
     personal links use `SITE_URL`, so do this before printing anything.

## 6. Invitations and printed things

`npm run cards -- invites` renders one invitation per guest from
`setup/cards/invite.html`: their name, and a QR code of their personal
link (`?name=...&pw=...#rsvp`, needs `SITE_URL` in config). Signs, table
cards and spare cards come from the same tool. Commands, options and the
one-time setup are in [CUSTOMIZING.md](CUSTOMIZING.md#printed-things).
`node setup/build.js --guests-csv` also writes the links to `guests.csv`
for a mail merge or a stationer. All of these are gitignored, because
every personal link contains the code.

Print the site address as text on cards and signs too, not only a QR code.

## 7. QA before sending real invites

Run every journey against the **live** site and the **live** Apps Script
endpoint (the deploy-versioning gotcha above means "looks right in the
editor" isn't the same as "is live"):

- [ ] Fresh visit → gate. Wrong code → "Incorrect code". Right code → site.
      Close the tab, reopen → still unlocked.
- [ ] Personal link for a guest on the list → welcome card with their full
      name, the address bar no longer shows `pw=`, RSVP form pre-filled.
- [ ] Personal link with a name NOT on the list → "We weren't able to find
      your name" + "Enter the site", not a lock-out.
- [ ] Name search: 2+ letters suggests names; partial and out-of-order
      names work; an unknown name shows the contact link.
- [ ] Attending with a phone number starting with `+` → stored as text in
      the Sheet, not `#ERROR!`.
- [ ] Declining → phone + note saved.
- [ ] RSVP again for the same name with a different answer → one
      confirmation screen ("On file now" vs "Your update"). Cancelling a yes
      → "Can't make it anymore?" with a note box; confirming keeps the phone
      number already on file. "Go back" changes nothing.
- [ ] A name not on the Guests tab, or a count above the max → clear error.
- [ ] Visa question (if enabled) → alert email arrives. RSVP notification
      emails (if enabled) arrive.
- [ ] Open `js/guests.js` on the live site → it's ciphertext, no names.
      View source → no invitation code anywhere.
- [ ] Phone check at 320px and 375px wide: no sideways scrolling; inputs
      don't zoom on iPhone.
- [ ] Then delete the `ZZZ QA Test` row from the Sheet (and the guest, if
      you like; update the `GUESTS_JS` secret).

Wedding week, if you use them: test a build with `OPEN_WINDOW` and
`DAY_OF_BUTTON` temporarily set to start a few minutes ago, in a private
window (so no remembered unlock). Every page should open without the code;
the RSVP section asks for the code if the form is still open, or shows the
closed message if `RSVP_DEADLINE` has passed; the button shows on the home
page; `live.html` highlights the right item (to check that before the day,
temporarily move one item's `data-start` to a few minutes ago). Put the real
times back before you deploy.
