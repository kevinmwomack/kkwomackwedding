// Guest list: one entry per invitation (household).
//   name:  exactly as it should appear pre-filled on the RSVP form. Also the
//          key for the RSVP sheet, so it must be unique.
//   max:   how many people the invitation covers, including the guest.
//   group: optional; picks a different welcome card (see WELCOME.groups in
//          js/config.js).
//   events: optional; other events they're invited to, e.g. ['brunch']
//          (see EVENTS and RSVP_QUESTIONS in js/config.js).
//
// Copy to js/guests.js (gitignored). setup/build.js publishes it encrypted,
// so the list can't be read without the invitation code.
//
// Naming conventions that saved us trouble: honorifics with dots (Dr., Mr.,
// Mrs.), "and Guest" with a lowercase "and" and capital "G", and no
// abbreviations a guest wouldn't type when searching for themselves.

const GUEST_LIST = [
  { name: "Jane Smith and Guest", max: 2 },
  { name: "John & Mary Doe", max: 2 },
  { name: "Alex Johnson", max: 1 },
  // { name: "Sam Lee", max: 2, group: "remote" },
  // { name: "The Rivera Family", max: 4, events: ["brunch"] },

  // Keep one test entry for smoke-testing the live RSVP endpoint without
  // touching a real guest's row. Delete its row from the sheet afterwards.
  { name: "ZZZ QA Test — Do Not Use", max: 2 },
];
