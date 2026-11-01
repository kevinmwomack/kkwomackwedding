/* =============================================
   config.example.js
   Copy to js/config.js and fill in. js/config.js is gitignored: it holds
   the plaintext invitation code, so it never goes into git. setup/build.js
   turns it into the public config the site actually serves (with a key
   check in place of the password). See SETUP.md.
   ============================================= */

window.SITE_CONFIG = {
  // --- Private: never published --------------------------------------------

  // The invitation code guests type. The whole site uses this one code.
  // Anyone can download the built site and try guesses offline, so a
  // three-word phrase beats a short code.
  SITE_PASSWORD: 'ChangeMe123',

  // --- Published with the site (visible to anyone who opens the page source)

  // The site's address. Calendar files and the Google Calendar link use it.
  SITE_URL: 'https://example.com',

  COUPLE_NAMES: '{{Partner One}} & {{Partner Two}}',

  // ISO 8601 with the venue's UTC offset. Drives the countdown. Without the
  // offset, every guest's phone reads it in their own time zone.
  WEDDING_DATE: '2027-06-12T16:00:00-04:00',

  // Human-readable versions used in copy (hero, footer, password gate).
  WEDDING_DATE_DISPLAY: 'June 12, 2027',
  VENUE_NAME: '{{Venue Name}}',
  VENUE_CITY: '{{City, State}}',
  // Full street address: the "Get Directions" link and calendar entries use it.
  VENUE_ADDRESS: '{{123 Main St, City, State 00000}}',

  // When the celebration ends (for "Add to calendar"). Optional: without
  // it, calendar entries last six hours.
  WEDDING_END: '2027-06-12T23:00:00-04:00',
  DRESS_CODE: '{{Dress Code}}',

  HASHTAG: '#{{CoupleHashtag}}',
  CONTACT_EMAIL: 'changeme@example.com',
  WHATSAPP_LINK: '', // e.g. 'https://wa.me/15555550123'; leave empty to hide

  // Other events (welcome drinks, a brunch). Each gets an "Add to calendar"
  // file named key.ics.
  // EVENTS: [
  //   { key: 'brunch', title: 'Sunday Brunch', start: '2027-06-13T11:30:00-04:00',
  //     end: '2027-06-13T13:30:00-04:00', location: 'The Garden Room, 123 Main St, City' },
  // ],
  EVENTS: [],

  // --- RSVP ------------------------------------------------------------------

  // Public embed link for rsvp.html. The page assigns this to the iframe
  // in script. This is the tester form. Replace it with the guest-facing
  // form when that exists. Anyone with the link can submit.
  RSVP_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSf-09-yVyApZ6Gzg4o97DEE-u_8fNvbzuYWnhMmQKTesqGs8A/viewform?embedded=true',

  // --- Wedding weekend -------------------------------------------------------

  // Optional: open every page without the code for a window (e.g. the
  // wedding weekend, when people scan table cards and nobody remembers the
  // code). Nothing is saved to the device, so the gate is back afterwards.
  // OPEN_WINDOW: { from: '2027-06-12T00:00:00-04:00', until: '2027-06-14T00:00:00-04:00' },
  OPEN_WINDOW: null,

  // Optional: a floating button on the home page during a window, e.g.
  // "Today's Program" linking to another page on this site.
  // DAY_OF_BUTTON: { from: '2027-06-12T00:00:00-04:00', until: '2027-06-13T06:00:00-04:00',
  //                  label: "Today's Program", href: 'index.html#details' },
  DAY_OF_BUTTON: null,
};
