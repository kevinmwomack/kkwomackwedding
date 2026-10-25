// What guests actually do on the default site.
'use strict';
const { journey, check, makeSite, config, serve, newDevice, noProblems, link, PASSWORD } = require('./lib');
const { fakeAppsScript } = require('./fake-apps-script');

let site, server;
async function defaultSite() {
  if (server) return server;
  site = makeSite('guests', { config: config({
    RSVP_VISA_QUESTION: true,
    RSVP_NOTICE: 'Final numbers are with the venue.',
    WELCOME: {
      message: 'Join us!',
      schedule: [{ event: 'Ceremony', time: '4:00 PM' }],
      buttons: [{ label: 'RSVP', href: '#rsvp', variant: 'primary' }],
      groups: { remote: { message: 'Watch the livestream.', schedule: [], buttons: [{ label: 'Livestream', href: 'https://example.com/live' }] } },
    },
  }) });
  const r = site.build();
  check(r.ok, r.output);
  server = await serve(site.file('_site'));
  return server;
}
process.on('exit', () => server && server.close());

journey('Guest types the code: wrong, then right; stays unlocked after closing the tab', async () => {
  const { url } = await defaultSite();
  const page = await newDevice();
  await page.goto(url);
  await page.waitForSelector('body.gate-visible');
  await page.fill('#gate-input', 'nope'); await page.click('.gate-btn');
  await page.waitForFunction(() => /Incorrect/.test(document.getElementById('gate-error').textContent));
  await page.fill('#gate-input', PASSWORD); await page.click('.gate-btn');
  await page.waitForSelector('#password-gate', { state: 'detached' });
  check(!(await page.$('#welcome-overlay')), 'no welcome card without a personal link');
  check((await page.textContent('.hero-names')) === 'Sam & Riley', 'config applied');
  const stored = await page.evaluate(() => localStorage.getItem('wedding_key'));
  check(stored && !stored.includes('velvet'), 'remembers a key, not the code');
  await page.reload(); await page.waitForTimeout(800);
  check(!(await page.isVisible('#gate-input')), 'still unlocked');
  noProblems(page);
});

journey('Guest scans their QR: welcome card with full name, code leaves the address bar, RSVP pre-filled', async () => {
  const { url } = await defaultSite();
  const backend = fakeAppsScript();
  const page = await newDevice({ backend });
  await page.goto(link(url, { name: 'Jane Smith and Guest', pw: PASSWORD }, '#rsvp'));
  await page.waitForFunction(() => document.querySelector('.welcome-name')?.textContent === 'Jane Smith and Guest', null, { timeout: 8000 });
  check(!/pw=|name=/.test(page.url()), `address bar still has the code: ${page.url()}`);
  await page.click('.welcome-btn--primary');
  await page.waitForSelector('#rsvp-form');
  check((await page.inputValue('#rsvp-name')) === 'Jane Smith and Guest', 'pre-filled');
  check((await page.textContent('.rsvp-notice')).includes('Final numbers'), 'notice above the form');
  await page.check('input[name="attending"][value="yes"]');
  await page.fill('#rsvp-phone', '+1 555 0100');
  await page.click('#rsvp-submit');
  await page.waitForSelector('.rsvp-success-panel');
  check(backend.row('Jane Smith and Guest').Phone === '+1 555 0100', 'saved');
  noProblems(page);
});

journey('Guest changes their mind: one confirmation screen; cancelling keeps the phone', async () => {
  const { url } = await defaultSite();
  const backend = fakeAppsScript();
  backend.post({ name: 'Alex Johnson', attending: 'yes', guestCount: '1', phone: '+44 20 0000' });
  const page = await newDevice({ backend });
  await page.goto(link(url, { pw: PASSWORD }, '#rsvp'));
  await page.fill('#rsvp-name-input', 'alex');
  await page.click('#rsvp-suggestions li');
  await page.check('input[name="attending"][value="no"]');
  await page.click('#rsvp-submit');
  await page.waitForSelector('#rsvp-duplicate-confirm');
  check((await page.textContent('.rsvp-duplicate-heading')).includes("Can't make it"), 'kind cancel wording');
  await page.click('#rsvp-confirm-back');
  await page.waitForSelector('#rsvp-form');
  check(backend.row('Alex Johnson').Attending === 'Yes', '"Go back" changed nothing');
  await page.check('input[name="attending"][value="no"]');
  await page.click('#rsvp-submit');
  await page.waitForSelector('.rsvp-success-panel');
  check(backend.row('Alex Johnson').Attending === 'No' && backend.row('Alex Johnson').Phone === '+44 20 0000', 'cancelled, phone kept');
  noProblems(page);
});

journey('Guest with a typo in their link, or not on the list, is never locked out', async () => {
  const { url } = await defaultSite();
  let page = await newDevice();
  await page.goto(link(url, { name: 'Nobody Here', pw: PASSWORD }));
  await page.waitForSelector('.gate-not-found');
  await page.click('.gate-btn--ghost');
  await page.waitForSelector('#password-gate', { state: 'detached' });
  await page.fill('#rsvp-name-input', 'zz nobody');
  check(await page.isVisible('#rsvp-not-found'), 'search miss shows the contact link');
  page = await newDevice();
  await page.goto(link(url, { name: 'Kim Remote', pw: 'wrong' }));
  await page.fill('#gate-input', PASSWORD); await page.click('.gate-btn');
  await page.waitForSelector('#welcome-overlay');
  check((await page.textContent('.welcome-message')).includes('livestream'), 'typed code after a bad link → their group welcome');
});

journey('Guest on a small phone: no sideways scrolling', async () => {
  const { url } = await defaultSite();
  const page = await newDevice({ viewport: { width: 320, height: 640 } });
  await page.goto(link(url, { pw: PASSWORD }));
  await page.waitForSelector('#password-gate', { state: 'detached' });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= 320), 'horizontal scroll at 320px');
});

journey('Late guest after the deadline sees how to reach the couple, not a form', async () => {
  const s = makeSite('guests-closed', { config: config({ RSVP_DEADLINE: '2020-01-01T00:00:00Z', WHATSAPP_LINK: 'https://wa.me/15555550123' }) });
  check(s.build().ok, 'build');
  const srv = await serve(s.file('_site'));
  try {
    const page = await newDevice();
    await page.goto(link(srv.url, { pw: PASSWORD }, '#rsvp'));
    await page.waitForSelector('.rsvp-closed');
    check(await page.isVisible('.rsvp-closed a[href^="https://wa.me"]'), 'WhatsApp link offered');
    check(!(await page.$('#rsvp-form')), 'no form');
  } finally { srv.close(); }
});

journey('Wedding weekend: everything opens without the code; Today\'s Program button; RSVP asks for the code', async () => {
  const s = makeSite('guests-weekend', { config: config({
    OPEN_WINDOW: { from: '2099-06-12T00:00:00-04:00', until: '2099-06-14T00:00:00-04:00' },
    DAY_OF_BUTTON: { from: '2099-06-12T00:00:00-04:00', until: '2099-06-13T06:00:00-04:00', label: "Today's Program", href: 'index.html#details' },
    RSVP_DEADLINE: '2099-06-12T15:00:00-04:00',
  }) });
  check(s.build().ok, 'build');
  const srv = await serve(s.file('_site'));
  try {
    let page = await newDevice({ at: '2099-06-12T10:00:00-04:00' });
    await page.goto(srv.url); await page.waitForTimeout(800);
    check(!(await page.isVisible('#gate-input')), 'gate open in the window');
    check(await page.isVisible('.day-of-program-btn'), 'button on the day');
    check(await page.isVisible('#rsvp-unlock-input'), 'RSVP asks for the code while the list is locked');
    await page.fill('#rsvp-unlock-input', PASSWORD); await page.click('#rsvp-unlock button');
    await page.waitForSelector('#rsvp-name-input');
    noProblems(page);
    page = await newDevice({ at: '2099-06-15T10:00:00-04:00' });
    await page.goto(srv.url); await page.waitForTimeout(800);
    check(await page.isVisible('#gate-input'), 'gate back after the window');
    check(!(await page.isVisible('.day-of-program-btn')), 'button gone');
  } finally { srv.close(); }
});
