# Customizing this fork

The current page is a password-gated invitation. RSVP is its own page,
`rsvp.html`. `<section id="rsvp-coming">` embeds the form from
`RSVP_FORM_URL`. Follow [PLAN.md](PLAN.md) for the form settings.

`css/theme.css` is the only color file. After a change, `npm start` to
look and `npm test` to check the journeys in [JOURNEYS.md](JOURNEYS.md).

The on-site RSVP form, guest list, welcome card, Apps Script, and personal
invitation cards are already gone. Leave them out. There is no
`js/rsvp-upgrade.js`, `js/guests.js`, `setup/google-apps-script.js`, or
`setup/cards/` to delete.

## Where things go

| You want to add… | Put it in | Notes |
|---|---|---|
| A new page | `yourpage.html` at the repo root | Start from `index.html` or `rsvp.html`. Gated or public: see "Pages" below. |
| Styles for it | `css/yourfeature.css`, linked after `style.css` | Use the color and font tokens from `css/theme.css` (`var(--primary)`, `rgba(var(--accent-rgb), 0.3)`…), never new hex values, so a theme change still covers it. |
| Markup used on several pages | `partials/name.html`, pulled in with `<!-- include: name -->` | The build swaps it in; see `partials/README.md`. |
| Behavior | `js/yourfeature.js`, loaded with `defer` after `js/main.js` | Return early when your elements aren't on the page, or one error stops every script after it. |
| Photos, logos | `images/` | The only image folder the build publishes. Resize to ~1600px first. |
| A wedding fact shown on the page | a new key in `js/config.js` | Show it with `<span data-field="YOUR_KEY"></span>`. Everything in config.js except `SITE_PASSWORD` is published. |
| The Google Form | `RSVP_FORM_URL` in `js/config.js`, shown in `#rsvp-coming` on `rsvp.html` | The page assigns the iframe `src` in script. Do not put it through `innerHTML`. |
| Something secret (an account number, a private address) | nowhere in the site | Anyone with the address can read every published file. Put "contact us" instead. |

## The RSVP page

`rsvp.html` holds `#rsvp-coming`. The iframe starts without a `src`.
`initRsvpForm()` in `js/main.js` sets it from `RSVP_FORM_URL`. Keep an id
other than `rsvp`. `setup/build.js` refuses `id="rsvp"`.

The current URL is the tester form. Swap `RSVP_FORM_URL` for the
guest-facing form when that exists. The home page links to `rsvp.html`
from the nav and the hero button. The form is not part of the home scroll.

Anyone with the form link can submit. Settings are in PLAN.md.

### A button to another RSVP service

Replace the form section on `rsvp.html` with a section whose id is not
`rsvp`. The test suite uses `rsvp-elsewhere`:

```html
  <section id="rsvp-elsewhere" class="rsvp-section section-pad">
    <div class="rsvp-bg"></div>
    <div class="container container--narrow">
      <h2 class="section-title">RSVP</h2>
      <a href="https://your-rsvp-service.example" class="hero-btn" target="_blank" rel="noopener">RSVP here</a>
    </div>
  </section>
```

### Removing the RSVP area

Delete `rsvp.html` and the nav and hero links that point at it. The rest
of the site keeps working.

## No password (a public site)

1. Delete the `<!-- include: password-gate -->` line from every page.
2. Remove `SITE_PASSWORD` from `js/config.js`.

The build fails if a page still has a gate and there is no code.

## No countdown, travel, registry, FAQ, details…

Delete the section from `index.html` and its link from the nav. The
scripts skip anything that isn't on the page. If you want the dead styles
gone too, search `css/style.css` for the section's class names.

## Wedding weekend

`OPEN_WINDOW` and `DAY_OF_BUTTON` in `js/config.js` default to `null`.
Set `OPEN_WINDOW` to open every page without the code for a window.
Nothing is saved to the device, so the gate returns afterwards. Set
`DAY_OF_BUTTON` for a floating button on the home page during a window
(for example "Today's Program" linking to a section or another page).

## Adding things

### A new fact

Add a key to `js/config.js` and a `data-field` (text) or `data-href-field`
(an `href`) element. `applySiteContent()` in `js/main.js` fills them.
`data-field` sets text. The directions link is `data-href-field="map"`,
built from `VENUE_NAME` and `VENUE_ADDRESS`.

### Other events (welcome drinks, a brunch)

Add the event to `EVENTS` in `js/config.js` (key, title, start and end
with a UTC offset, location). The build writes `key.ics` for "Add to
calendar". Link it the same way as the wedding:

```html
<a href="brunch.ics">Apple / Outlook</a>
<a href="#" data-google-calendar="brunch">Google</a>
```

The build refuses a start time with no UTC offset, and a key that is not
a simple token.

### Add to calendar

The Ceremony card links `wedding.ics` (iPhone, Mac, Outlook) and Google
Calendar, from `WEDDING_DATE`, `WEDDING_END`, the venue, and
`VENUE_ADDRESS`. Put the same two links anywhere else you like.

### A second language

Copy `index.html` to e.g. `index-es.html`, set `<html lang="es">`,
translate the text, and link the two pages to each other in the nav.
Gate the new page with the same `<!-- include: password-gate -->` line if
it should ask for the code.

### Pages

Any page with the `<!-- include: password-gate -->` line and `js/config.js`
plus `js/main.js` is behind the same code. A guest who unlocked one page
has unlocked them all. A page without the block is public. For another
event with its own countdown and calendar file, see "Other events" above.
This page has no guest list.

Photos go in `images/`.

### Colors and fonts

`css/theme.css` has every color and font, with three palettes ready to
switch between. Nothing else in the site holds a color. The favicon
generator reads the same file.

## Changing things after launch

| Change | Do |
|---|---|
| Change a wedding fact | Edit `js/config.js`, update the `SITE_CONFIG_JS` secret, re-run the workflow. |
| Change the code | Edit `SITE_PASSWORD` in `js/config.js`, update the secret, redeploy. Everyone is signed out, so only if it leaked. Leave `js/config.example.js` as `ChangeMe123`. |
| Embed a different Google Form | Put its public embed link in `RSVP_FORM_URL`, update the `SITE_CONFIG_JS` secret, and redeploy. Then check the iframe on a phone. |
| Edit page text or design | Commit and push. The workflow deploys. Phones get the new CSS/JS on the next load (the build adds a content hash to every link). |

`js/config.js` stays gitignored. Check `git status` before every commit.
