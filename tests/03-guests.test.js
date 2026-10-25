// What guests actually do on the default site.
'use strict';
const { journey, check, makeSite, config, serve, newDevice, noProblems, link, PASSWORD } = require('./lib');

let site, server;
async function defaultSite() {
  if (server) return server;
  site = makeSite('guests');
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
  check(!(await page.$('#welcome-overlay')), 'no welcome card');
  check(!(await page.$('.gate-not-found')), 'a typed code does not show not-on-the-list');
  check(/coming soon/i.test(await page.textContent('#rsvp-coming')), 'RSVP area says coming soon');
  check((await page.textContent('.hero-names')) === 'Sam & Riley', 'config applied');
  const stored = await page.evaluate(() => localStorage.getItem('wedding_key'));
  check(stored && !stored.includes('velvet'), 'remembers a key, not the code');
  await page.reload(); await page.waitForTimeout(800);
  check(!(await page.isVisible('#gate-input')), 'still unlocked');
  noProblems(page);
});

journey('A link with ?name= and the right code opens the page and strips those params', async () => {
  const { url } = await defaultSite();
  const page = await newDevice();
  await page.goto(link(url, { name: 'Nobody Here', pw: PASSWORD }, '#rsvp-coming'));
  await page.waitForSelector('#password-gate', { state: 'detached' });
  check(!/pw=|name=/.test(page.url()), `address bar still has the code: ${page.url()}`);
  check(!(await page.$('.gate-not-found')), 'name in the link does not block the page');
  check(!(await page.$('#welcome-overlay')), 'no welcome card');
  check(/coming soon/i.test(await page.textContent('#rsvp-coming')), 'coming soon section');
  noProblems(page);
});

journey('Guest on a small phone: no sideways scrolling', async () => {
  const { url } = await defaultSite();
  const page = await newDevice({ viewport: { width: 320, height: 640 } });
  await page.goto(link(url, { pw: PASSWORD }));
  await page.waitForSelector('#password-gate', { state: 'detached' });
  check(await page.evaluate(() => document.documentElement.scrollWidth <= 320), 'horizontal scroll at 320px');
});

journey('Wedding weekend: everything opens without the code; Today\'s Program button', async () => {
  const s = makeSite('guests-weekend', { config: config({
    OPEN_WINDOW: { from: '2099-06-12T00:00:00-04:00', until: '2099-06-14T00:00:00-04:00' },
    DAY_OF_BUTTON: { from: '2099-06-12T00:00:00-04:00', until: '2099-06-13T06:00:00-04:00', label: "Today's Program", href: 'index.html#details' },
  }) });
  check(s.build().ok, 'build');
  const srv = await serve(s.file('_site'));
  try {
    let page = await newDevice({ at: '2099-06-12T10:00:00-04:00' });
    await page.goto(srv.url); await page.waitForTimeout(800);
    check(!(await page.isVisible('#gate-input')), 'gate open in the window');
    check(await page.isVisible('.day-of-program-btn'), 'button on the day');
    check(/coming soon/i.test(await page.textContent('#rsvp-coming')), 'coming soon is on the open page');
    noProblems(page);
    page = await newDevice({ at: '2099-06-15T10:00:00-04:00' });
    await page.goto(srv.url); await page.waitForTimeout(800);
    check(await page.isVisible('#gate-input'), 'gate back after the window');
    check(!(await page.isVisible('.day-of-program-btn')), 'button gone');
  } finally { srv.close(); }
});
