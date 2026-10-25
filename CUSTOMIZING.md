# Customizing: turning things off, adding your own

Every feature in this template is optional, and the site is plain HTML,
CSS and JavaScript, so there's nothing to learn beyond that. This page says
how to remove what you don't want, where new things go, and how to make
the printed pieces. After any change, `npm start` to look and `npm test` to
check nothing broke (see [JOURNEYS.md](JOURNEYS.md)).

## Where things go

| You want to add… | Put it in | Notes |
|---|---|---|
| A new page | `yourpage.html` at the repo root | Start from a page in `examples/`. Gated or public: see "Pages" below. |
| Styles for it | `css/yourfeature.css`, linked after `style.css` | Use the color and font tokens from `css/theme.css` (`var(--primary)`, `rgba(var(--accent-rgb), 0.3)`…), never new hex values, so a theme change still covers it. |
| Markup used on several pages | `partials/name.html`, pulled in with `<!-- include: name -->` | The build swaps it in; see `partials/README.md`. |
| Behavior | `js/yourfeature.js`, loaded with `defer` after `js/main.js` | Return early when your elements aren't on the page, or one error stops every script after it. |
| Photos, logos | `images/` | The only image folder the build publishes. Resize to ~1600px first. |
| A wedding fact shown on pages | a new key in `js/config.js` | Show it with `<span data-field="YOUR_KEY"></span>`; no code needed. Everything in config.js except `SITE_PASSWORD` is published. |
| Something only some guests should see | a field on their entry in `js/guests.js` | It's encrypted with the rest of the list; read it from `WeddingSite.invitedGuest` or `WeddingSite.onGuests()` in your script. |
| A question on the RSVP form | `RSVP_QUESTIONS` in `js/config.js` + one line in the Apps Script | See "Your own RSVP question" below. |
| Printed invitations, signs, table cards | `setup/cards/` | See "Printed things" below. |
| Something secret (an account number, a private address) | nowhere in the site | Anyone with the address can read every published file. Put "contact us" instead. |

## Turning things off

### No RSVP form

Using another RSVP service, or none:

1. In `index.html`, delete the RSVP `<section id="rsvp">` (or replace its
   contents with a button to your RSVP service, below), the RSVP link in
   the nav and the "RSVP Now" hero button.
2. Delete the `js/guests.js` and `js/rsvp-upgrade.js` script tags at the
   bottom of `index.html`.
3. Delete `js/guests.js` (and skip the `GUESTS_JS` secret). Without a guest
   list there's no personal welcome card either; a QR code of the plain
   site address (or `?pw=` with the code) still works.
4. Remove `'#rsvp'` buttons from `WELCOME` in `js/config.js`, and skip the
   Apps Script setup entirely.

The build refuses to run if a page still has an RSVP section but there's
no guest list, so you can't half-remove it.

```html
  <section id="rsvp-elsewhere" class="rsvp-section section-pad">
    <div class="rsvp-bg"></div>
    <div class="container container--narrow">
      <h2 class="section-title">RSVP</h2>
      <a href="https://your-rsvp-service.example" class="hero-btn" target="_blank" rel="noopener">RSVP here</a>
    </div>
  </section>
```

### No password (a public site)

1. Delete the `<!-- include: password-gate -->` line from every page.
2. Either remove `SITE_PASSWORD` from `js/config.js` (only possible with
   no guest list, so no RSVP form on the site), **or** keep it and the
   guest list: the site is then public, and only the RSVP section asks for
   the code before it shows anyone's name. Personal QR links still open
   the form straight away.

The build tells you if a page still has a gate but there's no code.

### No personal invitations (no QR links per guest)

Nothing to remove: guests type the code and search for their name. Leave
`WELCOME` as it is (it's only shown for personal links) and skip
`setup/cards/`.

### No countdown, travel, registry, FAQ, details…

Delete the section from `index.html` and its link from the nav. The
scripts skip anything that isn't on the page. If you want the dead styles
gone too, search `css/style.css` for the section's class names.

### No visa question, emails, WhatsApp, hashtag

All in `js/config.js` (`RSVP_VISA_QUESTION: false`, `WHATSAPP_LINK: ''`,
remove the hashtag line from the footer) and the top of the Apps Script
(`NOTIFY_EMAIL = ""`, `VISA_EMAIL = ""`).

### No wedding-day features

Leave `OPEN_WINDOW` and `DAY_OF_BUTTON` as `null` and don't copy anything
from `examples/day-of/`.

## Adding things

### Your own RSVP question

For example a meal choice:

1. In `js/config.js`:
   ```js
   RSVP_QUESTIONS: [
     { key: 'meal', label: 'Meal choice', type: 'radio',
       options: ['Chicken', 'Fish', 'Vegetarian'], attendingOnly: true, required: true },
   ],
   ```
   `type` is `text`, `textarea`, `select` or `radio`. `attendingOnly`
   hides it from guests who decline. Optional: `hint`, `placeholder`,
   `summaryLabel` (shown on the thank-you screen).
2. In the Sheet, add a header in the next empty column of the RSVPs tab
   (L, if you haven't added others).
3. In the Apps Script, add the column and one line in `TEXT_FIELDS`:
   ```js
   const MEAL_COL = 12; // L — Meal
   const TEXT_FIELDS = {
     ...
     meal: MEAL_COL,
   };
   ```
   Then deploy a **new version** (Deploy → Manage deployments → pencil →
   New version). Forgetting this step means the answers are dropped
   without an error: after your first test RSVP, check the column filled.

Answers are written as plain text, kept when an update leaves them blank,
included in the notification email, and never sent back to a browser.

### Plus-one names

A question only invitations for more than one person see:

```js
{ key: 'guestNames', label: "Names of everyone you're bringing", type: 'text', attendingOnly: true, partyOnly: true },
```

plus its `TEXT_FIELDS` line and column, as above.

### Other events (welcome drinks, a brunch)

1. Add the event to `EVENTS` in `js/config.js` (key, title, start and end
   with a UTC offset, location). The build writes `brunch.ics` for "Add to
   calendar".
2. If only some guests are invited, give them `events: ['brunch']` in
   `js/guests.js`, and add an RSVP question with `invitedTo: 'brunch'`
   (plus its Apps Script line). Only those guests see it.
3. For a page about it, see "Other events" in `examples/README.md`, and
   link its calendar entry the same way as the wedding's:
   `<a href="brunch.ics">Apple / Outlook</a>` and
   `<a href="#" data-google-calendar="brunch">Google</a>`.

### Add to calendar

Built in: the Ceremony card links `wedding.ics` (iPhone, Mac, Outlook) and
Google Calendar, from `WEDDING_DATE`, `WEDDING_END`, the venue and
`VENUE_ADDRESS`. Put the same two links anywhere else you like (the
welcome card buttons can point at `wedding.ics` too).

### A second language

For guests who'd read the site more easily in another language:

1. Copy `index.html` to e.g. `index-es.html`, set `<html lang="es">`,
   translate the text, and link the two pages to each other in the nav.
2. Give those guests `group: 'es'` and a `WELCOME.groups.es` entry in
   their language, so their personal link greets them in it.
3. The RSVP form's own labels are English, in `js/rsvp-upgrade.js`;
   translate them there if you need a fully translated form.

### Pages

Any page with the `<!-- include: password-gate -->` line and `js/config.js` + `js/main.js`
is behind the same code, and a guest who unlocked one page has unlocked
them all. A page without the block is public. Add `js/guests.js` only if
the page needs the guest list. `examples/` has finished pages to start
from (Our Story, a day-of program, a menu). For another event with its own
countdown (a welcome dinner, a brunch), copy one of them and cut it down;
examples/README.md, "Other events", says how.

### Different wording for some guests

Give those guests a `group` in `js/guests.js` and add the group under
`WELCOME.groups` in `js/config.js`: its own message, schedule and buttons
on the welcome card. Ours was for family who couldn't travel.

### Colors and fonts

`css/theme.css` has every color and font, with three palettes ready to
switch between; nothing else in the site holds a color. The printed cards
and their QR codes read the same file, so they always match. To give a
card its own look, add a `<style>` block in that card's HTML that
overrides the tokens you want.

## Printed things

Everything printed is an HTML design rendered by headless Chrome with the
site's fonts, so it matches the site and you can edit it like any web page.
One-time setup: `npm install && npx playwright install chromium`.

| Want | Command |
|---|---|
| One invitation per guest, with their name and a QR of their personal link | `npm run cards -- invites` |
| Just some guests (a late addition, a name fix) | `npm run cards -- invites --only "Jane Smith and Guest"` |
| A card whose QR goes elsewhere (e.g. a livestream card for family abroad) | `npm run cards -- invites --only "Sam Lee" --qr https://example.com/live.html --site-text example.com/live --out invite-cards/livestream` |
| One card with no name (to share in a group chat, or as a spare) | `npm run cards -- blank` (add `--with-code` to put the code in its link) |
| A sign, table card or flyer, as a print-ready PDF | `npm run cards -- page setup/cards/sign.html --qr https://example.com/photos --out print/photos-sign.pdf` |

- Designs: `setup/cards/invite.html` (5×7 in) and `setup/cards/sign.html`
  (18×24 in). Open them in a browser while you edit. Copy one to make a new
  design; set the size in inches on `.card` and the PDF comes out at that
  size. `{{…}}` text is yours to replace; `data-field="CONFIG_KEY"` fills
  in from `js/config.js`.
- To print a different name than the RSVP key (an honorific, a spelling
  for the envelope), add `displayName` to that guest in `js/guests.js`. The
  link still uses `name`, so a card already sent keeps working.
- `--pdf` gives PDFs instead of PNGs. PNGs are 3× resolution, sharp enough
  to send on WhatsApp or print at 5×7.
- `invite-cards/` and `print/` are gitignored: personal QR codes contain
  the invitation code.
- Before printing a batch, print one, scan it with two different phones,
  and check it opens the right page. Print the address as text too.
- A QR code as an image file, for a design made elsewhere (Canva, a
  stationer):
  `node -e "require('qrcode').toFile('qr.png', 'https://example.com/photos', { width: 1500, margin: 2 })"`

## Changing things after launch

| Change | Do |
|---|---|
| Add or rename a guest | Edit `js/guests.js`, update the `GUESTS_JS` secret, update the Sheet's Guests tab, re-run the deploy workflow. Make their card with `--only`. Renaming someone who has already RSVP'd orphans their row: rename it in the Sheet too. |
| Change a wedding fact | Edit `js/config.js`, update the `SITE_CONFIG_JS` secret, re-run the workflow. |
| Change the code | Edit `SITE_PASSWORD`, update the secret, redeploy. Everyone is signed out and printed QR codes stop working, so only if it leaked. |
| Change the Apps Script | Paste it in, then **Deploy → Manage deployments → pencil → New version**. Saving alone changes nothing live. |
| Edit page text or design | Commit and push; the workflow deploys. Phones get the new CSS/JS automatically (the build adds a content hash to every link). |
