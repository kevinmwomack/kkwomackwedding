# Lessons learned

This template was extracted from a real wedding site that ran through
invitations, RSVPs, a wedding day with a livestream, and the week after. These are the things we got wrong or had to learn,
written so you don't have to. Most of them are already handled by the
template; the ones that aren't are habits.

## Google Apps Script and Sheets

- **Saving the script doesn't deploy it.** Every change needs Deploy →
  Manage deployments → pencil → *New version* → Deploy. Our RSVP
  notification emails sat written but undeployed for two weeks before
  anyone noticed. And never click "New deployment" after the first time:
  that's a new URL the site doesn't know about.
- **Sheets turns guest text into formulas.** A phone number like
  `+1 555...` became `#ERROR!`. Anything a guest types must be written as
  plain text (`writeTextFields()`), and that includes the name.
- **Send JSON as `text/plain`.** `application/json` triggers a CORS
  preflight Apps Script can't answer, and the form fails silently, worst on
  iPhones.
- **Write to the sheet before sending email.** If the email throws (the free
  quota is about 100 a day, shared by every email the script sends), the
  RSVP is still saved.
- **Guests signed into several Google accounts** sometimes get a 404 from
  the endpoint (a Google bug with `/u/1/` URLs). If the form works for you
  but not for one guest, ask them to try a private window.
- **Never echo stored answers back.** The endpoint is public. If the
  "you've already RSVP'd" response includes the phone number on file,
  anyone who knows a guest's name can read it.

## Passwords and the gate

- **One code for everything.** We had a second password for the day-of
  pages so nobody could open them early, and merged it into the main code
  right after the wedding so the invitation code opens everything. Start
  with one.
- **Most guests never type the code.** They arrive through the QR link on
  their invitation. Remembering the unlock only for the browser session
  (`sessionStorage`) meant that when they closed the tab and came back
  later, they hit a gate asking for a code they'd never seen. Remember it
  on the device (`localStorage`).
- **Open the site for the wedding weekend.** On the day, people scan table
  cards and nobody remembers the code. `OPEN_WINDOW` opens every page for a
  set window without saving anything, so the gate comes back afterwards.
- **Keep the code in one place.** Ours ended up hardcoded in three files
  plus a redirect page, all of which had to be kept in sync. The template keeps it only in
  `js/config.js`, and the build fails if it shows up in a published file.
- **The gate isn't encryption.** Page text is readable by anyone with the
  URL. The guest list is the part worth protecting, so the template
  encrypts it (see [SECURITY.md](SECURITY.md)).

## RSVPs

- **The deadline is a moment, not a date.** "Midnight" means a different
  time on every guest's phone. Store it with a UTC offset.
- **Print a softer date than the real cutoff.** You'll promise some guests
  a late reply. Our printed "please reply by" was a couple of weeks before
  the form actually closed, and we needed that room.
- **Reopen the form after the final count.** After the venue had our
  numbers, we reopened RSVPs (with a note above the form, `RSVP_NOTICE`)
  so late cancellations would reach us. We closed it for good on the
  wedding afternoon, and didn't publish that time.
- **Changing an answer should take one confirmation**, not a second trip
  through the form. Show "on file now" next to "your update"; make
  cancelling kind ("Can't make it anymore?") with a note box.
- **A cancellation mustn't wipe the phone number.** That's how you send
  someone the livestream link. Blank fields on an update keep what's on
  file.
- **Show the name exactly as it is on the list.** The welcome card first
  shortened long household names ("... & family"); we switched to the full
  name as written, which is also what's on the printed card.
- **Names are keys.** The RSVP sheet matches on the exact name, so pick
  conventions up front: honorifics with dots (Dr., Mrs.), "and Guest" with
  a lowercase "and", no duplicates. Renaming a guest after they've RSVP'd
  orphans their row.
- **Keep a test guest** (`ZZZ QA Test`) for checking the live endpoint
  without touching a real row.
- **Match on name on the server, inside the lock.** The first version
  appended a row per submission, so a double tap or a changed answer meant
  duplicates to clean up by hand before sending numbers to the caterer.

## Guests far away

- **Some guests can't come, and that's not a decline.** For family who
  couldn't travel, the welcome card said so warmly and pointed to the
  livestream instead of the schedule (`WELCOME.groups` + a `group` on their
  guest entry).
- **Give times in their time zones.** Our livestream page gave the
  ceremony start for each country where we had family watching. `examples/day-of/` can add a
  second time zone under each item.
- **Livestream links change.** Hold a page or short link you control
  (`examples/short-link/`), not the streaming service's URL, on anything
  printed.

## Printed things outlive web pages

- **Retire a page with a redirect, not a 404.** QR codes on cards and signs
  don't update. When we retired a page, it became a one-line redirect.
- **Print the address as text, not only a QR code**, for anyone who won't
  or can't scan.
- **Short links you own** (`/photos` → the shared album) mean a printed
  card can point somewhere new later.

## The site itself

- **Bust the cache on every deploy.** Browsers hold on to CSS and JS, so a
  fix might not reach a guest's phone. We bumped `?v=` numbers by hand on
  every change; the build now adds a content hash to every CSS/JS link
  automatically.
- **One error stops everything after it.** A page without a nav made
  `initNavbar()` throw, which silently skipped the countdown and every init
  after it. Every init function returns early when its elements are
  missing.
- **Test on real phones at 320px.** iPhones zoom into any input with a font
  under 16px, and long names overflow small screens.
- **GitHub Pages source must be "GitHub Actions".** "Deploy from a branch"
  starts a second, legacy build that always fails (and, with this
  template, would serve the raw repo).
- **Delete what you remove.** When a section goes, grep `css/` and `js/`
  for its class names and ids. Dead CSS and JS piled up fast.
- **Log engine fixes as you go.** We kept a one-line log of every fix to the
  shared scripts while the wedding site was live. That log is what made it
  possible to bring the fixes back into this template afterwards; raw diffs
  between the two would have been hopeless.

## Day of

- **Make the program a page**, not just a printout: it can highlight what's
  happening now and link the livestream, the photo album and anything else
  people ask for (`examples/day-of/`).
- **A floating "Today's Program" button** on the home page, shown only on
  the day (`DAY_OF_BUTTON`), is one more way in besides the table cards.

## After

- Turn the home page into a thank-you with the livestream recording and the
  photo album (`examples/after-the-wedding/`).
- Export the Sheet, delete the phone numbers and notes you no longer need,
  and archive the Apps Script deployment.
