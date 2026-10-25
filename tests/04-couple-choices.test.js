// Couples who want less (or different) than the default site. Each journey
// follows the choices that still apply on this fork: no on-site RSVP form.
'use strict';
const fs = require('fs');
const path = require('path');
const { journey, check, makeSite, config, serve, newDevice, noProblems, link, editFile, PASSWORD } = require('./lib');

// Drop the Coming Soon block and the links that point at it.
function removeRsvp(dir, replacement = '') {
  editFile(path.join(dir, 'index.html'), h => h
    .replace(/  <!-- ===== RSVP ===== -->\s*<section id="rsvp-coming"[\s\S]*?<\/section>/, replacement)
    .replace(/\s*<li><a href="#rsvp-coming" class="nav-cta">RSVP<\/a><\/li>/, '')
    .replace(/\s*<a href="#rsvp-coming" class="hero-btn">RSVP Now<\/a>/, ''));
}
// A public page: delete the gate's include line. A short-link page has none.
function removeGates(dir) {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.html'))) {
    if (!fs.readFileSync(path.join(dir, f), 'utf8').includes('<!-- include: password-gate')) continue;
    editFile(path.join(dir, f), h => h.replace(/ *<!-- include: password-gate[^>]*-->\n/, ''));
  }
}

async function withSite(site, fn) {
  const r = site.build();
  check(r.ok, r.output);
  const srv = await serve(site.file('_site'));
  try { await fn(srv.url); } finally { srv.close(); }
}

journey('Couple uses another RSVP service: no guest list, a button to their RSVP page', async () => {
  const button = `<section id="rsvp-elsewhere" class="rsvp-section section-pad">
    <div class="rsvp-bg"></div>
    <div class="container container--narrow">
      <h2 class="section-title">RSVP</h2>
      <a href="https://your-rsvp-service.example" class="hero-btn" target="_blank" rel="noopener">RSVP here</a>
    </div>
  </section>`;
  const site = makeSite('choice-no-rsvp', { guests: null, config: config({ RSVP_ENDPOINT: undefined }), edit: dir => removeRsvp(dir, button) });
  await withSite(site, async url => {
    const page = await newDevice();
    await page.goto(url);
    await page.fill('#gate-input', PASSWORD); await page.click('.gate-btn');
    await page.waitForSelector('#password-gate', { state: 'detached' });
    check(await page.isVisible('a[href="https://your-rsvp-service.example"]'), 'external RSVP button');
    check(!(await page.$('#rsvp-upgrade-container')), 'no built-in form');
    noProblems(page);
  });
});

journey('Couple wants a fully public site: no code, no guest list, no RSVP form', async () => {
  const site = makeSite('choice-public', { guests: null, config: config({ SITE_PASSWORD: undefined, RSVP_ENDPOINT: undefined }), edit: dir => { removeRsvp(dir); removeGates(dir); } });
  await withSite(site, async url => {
    check(!fs.readFileSync(site.file('_site/js/config.js'), 'utf8').includes('"AUTH"'), 'no key check published');
    const page = await newDevice();
    await page.goto(url); await page.waitForTimeout(600);
    check(await page.isVisible('.hero-names'), 'page visible straight away');
    check(!(await page.$('#password-gate')), 'no gate');
    noProblems(page);
  });
});

journey('Couple strips the page down: no countdown, travel, registry or FAQ', async () => {
  const site = makeSite('choice-minimal', { edit: dir => editFile(path.join(dir, 'index.html'), h => h
    .replace(/  <!-- ===== COUNTDOWN ===== -->[\s\S]*?<\/section>/, '')
    .replace(/  <!-- ===== REGISTRY ===== -->[\s\S]*?<\/section>/, '')
    .replace(/  <!-- ===== TRAVEL ===== -->[\s\S]*?<\/section>/, '')
    .replace(/  <!-- ===== FAQ ===== -->[\s\S]*?<\/section>/, '')
    .replace(/\s*<li><a href="#(travel|faq)">[^<]*<\/a><\/li>/g, '')) });
  await withSite(site, async url => {
    const page = await newDevice();
    await page.goto(link(url, { pw: PASSWORD }));
    await page.waitForSelector('#password-gate', { state: 'detached' });
    check(!(await page.$('#countdown')) && /coming soon/i.test(await page.textContent('#rsvp-coming')), 'sections gone, coming soon remains');
    noProblems(page);
  });
});

journey('Couple shows a new fact anywhere with data-field', async () => {
  const site = makeSite('choice-data-field', {
    config: config({ BRUNCH_TIME: '11:30 AM' }),
    guests: null,
    edit: dir => editFile(path.join(dir, 'index.html'), h => h.replace('<h3>Ceremony</h3>', '<h3>Ceremony</h3><p id="brunch" data-field="BRUNCH_TIME">{{time}}</p>')),
  });
  await withSite(site, async url => {
    const page = await newDevice();
    await page.goto(link(url, { pw: PASSWORD }));
    await page.waitForSelector('#password-gate', { state: 'detached' });
    check((await page.textContent('#brunch')) === '11:30 AM', 'custom field shown');
  });
});

journey('Couple has a brunch: calendar files, Google links, and a map link', async () => {
  const site = makeSite('choice-events', {
    config: config({
      VENUE_ADDRESS: '1 Glass Lane, Springfield', WEDDING_END: '2099-06-12T23:00:00-04:00',
      EVENTS: [{ key: 'brunch', title: 'Sunday Brunch', start: '2099-06-13T11:30:00-04:00', end: '2099-06-13T13:30:00-04:00', location: 'The Garden Room, Springfield' }],
    }),
    guests: null,
  });
  await withSite(site, async url => {
    const wedding = fs.readFileSync(site.file('_site/wedding.ics'), 'utf8');
    check(/BEGIN:VEVENT[\s\S]*DTSTART:20990612T200000Z[\s\S]*DTEND:20990613T030000Z/.test(wedding), `wedding.ics times: ${wedding}`);
    check(/LOCATION:The Glasshouse\\, 1 Glass Lane\\, Springfield/.test(wedding), 'location escaped');
    check(/\r\n/.test(wedding), 'CRLF line endings');
    check(/SUMMARY:Sunday Brunch/.test(fs.readFileSync(site.file('_site/brunch.ics'), 'utf8')), 'brunch.ics');
    const page = await newDevice();
    await page.goto(link(url, { pw: PASSWORD }));
    await page.waitForSelector('#password-gate', { state: 'detached' });
    const g = await page.getAttribute('[data-google-calendar="wedding"]', 'href');
    check(g.startsWith('https://calendar.google.com/') && g.includes('20990612T200000Z%2F20990613T030000Z'), `google link: ${g}`);
    check((await page.getAttribute('[data-href-field="map"]', 'href')).includes('1%20Glass%20Lane'), 'map link from the address');
    const ics = await page.request.get(url + 'wedding.ics');
    check(ics.ok(), 'wedding.ics served');
    noProblems(page);
  });
});
