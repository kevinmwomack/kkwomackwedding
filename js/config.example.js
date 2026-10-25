/* =============================================
   config.example.js
   Copy to js/config.js and fill in. js/config.js is gitignored: it holds
   the plaintext invitation code, so it never goes into git. setup/build.js
   turns it into the public config the site actually serves (with a key
   check in place of the password). See SETUP.md.
   ============================================= */

window.SITE_CONFIG = {
  // --- Private: never published --------------------------------------------

  // The invitation code guests type (or that rides in their QR link). The
  // whole site uses this one code; see LESSONS.md for why we ended up with
  // one password instead of several. Anyone can download the built site and
  // try guesses offline, so a three-word phrase beats a short code.
  SITE_PASSWORD: 'ChangeMe123',

  // --- Published with the site (visible to anyone who opens the page source)

  // Not read by this page. RSVPs will be an embedded form in a later change.
  RSVP_ENDPOINT: 'YOUR_GOOGLE_APPS_SCRIPT_URL_HERE',

  // The site's address, used for the QR invite links in guests.csv.
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
  // file (key.ics) and can have its own RSVP question for just the guests
  // invited to it: give those guests events: ['brunch'] in js/guests.js and
  // the question invitedTo: 'brunch' (see RSVP_QUESTIONS below).
  // EVENTS: [
  //   { key: 'brunch', title: 'Sunday Brunch', start: '2027-06-13T11:30:00-04:00',
  //     end: '2027-06-13T13:30:00-04:00', location: 'The Garden Room, 123 Main St, City' },
  // ],
  EVENTS: [],

  // --- RSVP ------------------------------------------------------------------

  // The exact moment the form closes, with a UTC offset. Not shown to
  // guests; put whatever "please reply by" date you like in the copy
  // (index.html). Keeping the real cutoff later than the printed date gives
  // you room for the late repliers you'll inevitably say yes to.
  RSVP_DEADLINE: '2027-05-15T23:59:00-04:00',

  // Optional note shown above the RSVP form, e.g. once final numbers are
  // with the venue but you still want to hear about cancellations.
  RSVP_NOTICE: '',

  // Shown to guests who decline. A livestream link is the natural thing to
  // offer; keep it vague until you actually have the link.
  RSVP_DECLINE_MESSAGE: "We'll miss you! Leave your number and we'll send you the livestream link so you can celebrate with us from wherever you are.",

  // Ask attending guests whether they need a visa support letter. The Apps
  // Script emails you when someone says yes.
  RSVP_VISA_QUESTION: false,

  // Extra questions the old on-site form used to render. This page does not
  // read them. type: 'text' | 'textarea' |
  // 'select' | 'radio'. attendingOnly hides it for guests who decline.
  // Two more options: partyOnly shows it only on invitations for more than
  // one person; invitedTo: 'brunch' only to guests with that event.
  // RSVP_QUESTIONS: [
  //   { key: 'meal', label: 'Meal choice', type: 'radio', options: ['Chicken', 'Fish', 'Vegetarian'],
  //     attendingOnly: true, required: true },
  //   { key: 'guestNames', label: "Names of everyone you're bringing", type: 'text',
  //     attendingOnly: true, partyOnly: true },
  //   { key: 'brunch', label: 'Will you join us for Sunday brunch?', type: 'radio',
  //     options: ['Yes', 'No'], invitedTo: 'brunch', attendingOnly: true },
  // ],
  RSVP_QUESTIONS: [],

  // --- Personalized welcome card (QR links: ?name=...&pw=...) ---------------

  WELCOME: {
    message: 'Together with our families, we joyfully invite you to join us in celebrating our union.',
    schedule: [
      { event: 'Doors Open',    time: '{{TIME}}' },
      { event: 'Ceremony',      time: '{{TIME}}' },
      { event: 'Cocktail Hour', time: '{{TIME}}' },
      { event: 'Reception',     time: '{{TIME}}' },
    ],
    buttons: [
      { label: 'Wedding Details', href: '#details', variant: 'primary' },
      { label: 'RSVP', href: '#rsvp' },
    ],
    // Optional: different wording for a group of guests, picked by the
    // `group` field on their js/guests.js entry. Anything left out falls
    // back to the defaults above. Example: guests you know can't travel.
    groups: {
      // remote: {
      //   message: "We know the trip isn't easy, and we don't expect you to make it. Please join us on the livestream.",
      //   schedule: [],
      //   buttons: [
      //     { label: 'Livestream', href: 'https://www.youtube.com/...' },
      //     { label: 'I Actually Will Be There', href: '#rsvp', variant: 'primary' },
      //   ],
      // },
    },
  },

  // --- Wedding weekend -------------------------------------------------------

  // Optional: open every page without the code for a window (e.g. the
  // wedding weekend, when people scan table cards and nobody remembers the
  // code). Nothing is saved to the device, so the gate is back afterwards.
  // The guest list stays encrypted, so the RSVP form still asks for the code.
  // OPEN_WINDOW: { from: '2027-06-12T00:00:00-04:00', until: '2027-06-14T00:00:00-04:00' },
  OPEN_WINDOW: null,

  // Optional: a floating button on the home page during a window, e.g.
  // "Today's Program" linking to a day-of page (examples/day-of/).
  // DAY_OF_BUTTON: { from: '2027-06-12T00:00:00-04:00', until: '2027-06-13T06:00:00-04:00',
  //                  label: "Today's Program", href: 'live.html' },
  DAY_OF_BUTTON: null,
};
