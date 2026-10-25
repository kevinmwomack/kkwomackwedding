// Couples who want less (or different) than the default site. Each journey
// follows CUSTOMIZING.md's instructions literally, then checks the result.
'use strict';
const fs = require('fs');
const path = require('path');
const { journey, check, makeSite, config, serve, newDevice, noProblems, link, editFile, PASSWORD } = require('./lib');
const { fakeAppsScript } = require('./fake-apps-script');

// CUSTOMIZING.md "No RSVP form", steps 1 and 2
function removeRsvp(dir, replacement = '') {
  editFile(path.join(dir, 'index.html'), h => h
    .replace(/  <!-- ===== RSVP ===== -->\s*<section id="rsvp"[\s\S]*?<\/section>/, replacement)
    .replace(/\s*<li><a href="#rsvp" class="nav-cta">RSVP<\/a><\/li>/, '')
    .replace(/\s*<a href="#rsvp" class="hero-btn">RSVP Now<\/a>/, '')
    .replace(/\s*<script src="js\/guests.js" defer><\/script>/, '')
    .replace(/\s*<script src="js\/rsvp-upgrade.js" defer><\/script>/, ''));
}
// CUSTOMIZING.md "No password", step 1: delete the gate's include line
// (on the pages that have one: a public page like a short link has none)
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

journey('Couple wants a public site but a private guest list: only the RSVP asks for the code', async () => {
  const backend = fakeAppsScript();
  const site = makeSite('choice-public-rsvp', { edit: removeGates });
  await withSite(site, async url => {
    let page = await newDevice({ backend });
    await page.goto(url); await page.waitForTimeout(600);
    check(await page.isVisible('.hero-names'), 'site is public');
    check(await page.isVisible('#rsvp-unlock-input'), 'RSVP asks for the code');
    await page.fill('#rsvp-unlock-input', PASSWORD); await page.click('#rsvp-unlock button');
    await page.waitForSelector('#rsvp-name-input');
    noProblems(page);
    page = await newDevice({ backend });
    await page.goto(link(url, { name: 'Alex Johnson', pw: PASSWORD }, '#rsvp'));
    await page.waitForSelector('#rsvp-form');
    check((await page.inputValue('#rsvp-name')) === 'Alex Johnson', 'personal link still opens their form');
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
    check(!(await page.$('#countdown')) && await page.isVisible('#rsvp-name-input'), 'sections gone, RSVP still works');
    noProblems(page);
  });
});

journey('Couple adds a required meal question (config + one Apps Script line)', async () => {
  const backend = fakeAppsScript({
    extraHeaders: ['Meal'],
    edit: code => code
      .replace('const NOTE_COL      = 11; // K — Note', 'const NOTE_COL      = 11; // K — Note\nconst MEAL_COL = 12; // L — Meal')
      .replace('  note:    NOTE_COL,\n};', '  note:    NOTE_COL,\n  meal: MEAL_COL,\n};'),
  });
  const site = makeSite('choice-meal', { config: config({ RSVP_QUESTIONS: [
    { key: 'meal', label: 'Meal choice', type: 'radio', options: ['Chicken', 'Fish', 'Vegetarian'], attendingOnly: true, required: true },
    { key: 'shuttle', label: 'Shuttle from the hotel?', type: 'select', options: ['Yes', 'No'] },
  ] }) });
  await withSite(site, async url => {
    const page = await newDevice({ backend });
    await page.goto(link(url, { name: 'Jane Smith and Guest', pw: PASSWORD }, '#rsvp'));
    await page.click('.welcome-close');
    await page.waitForSelector('#rsvp-form');
    await page.check('input[name="attending"][value="yes"]');
    check(await page.isVisible('[data-rsvp-question="meal"]'), 'meal question shown to attending guests');
    await page.click('#rsvp-submit');
    await page.waitForFunction(() => /Meal choice/.test(document.getElementById('rsvp-error').textContent));
    await page.check('input[name="rsvp-q-meal"][value="Fish"]');
    await page.click('#rsvp-submit');
    await page.waitForSelector('.rsvp-success-panel');
    check((await page.textContent('.rsvp-success-summary')).includes('Fish'), 'answer on the thank-you screen');
    check(backend.row('Jane Smith and Guest').Meal === 'Fish', `stored: ${JSON.stringify(backend.row('Jane Smith and Guest'))}`);
    await page.click('#rsvp-success-update');
    check(await page.isChecked('input[name="rsvp-q-meal"][value="Fish"]'), 'pre-filled on update');
    await page.check('input[name="attending"][value="no"]');
    check(!(await page.isVisible('[data-rsvp-question="meal"]')), 'hidden when declining');
    check(await page.isVisible('[data-rsvp-question="shuttle"]'), 'everyone-question still shown');
    noProblems(page);
  });
});

journey('Couple shows a new fact anywhere with data-field, and keeps extra guest fields', async () => {
  const site = makeSite('choice-data-field', {
    config: config({ BRUNCH_TIME: '11:30 AM' }),
    guests: `const GUEST_LIST = [{ name: "Alex Johnson", max: 1, table: 7 }];\n`,
    edit: dir => editFile(path.join(dir, 'index.html'), h => h.replace('<h3>Ceremony</h3>', '<h3>Ceremony</h3><p id="brunch" data-field="BRUNCH_TIME">{{time}}</p>')),
  });
  await withSite(site, async url => {
    const page = await newDevice();
    await page.goto(link(url, { name: 'Alex Johnson', pw: PASSWORD }));
    await page.waitForSelector('#welcome-overlay');
    check((await page.textContent('#brunch')) === '11:30 AM', 'custom field shown');
    check((await page.evaluate(() => window.WeddingSite.invitedGuest.table)) === 7, 'extra guest field available to scripts');
  });
});

journey('Couple has a brunch for some guests: calendar files, Google links, and a brunch question only invitees see', async () => {
  const backend = fakeAppsScript({
    extraHeaders: ['Brunch', 'Guest Names'],
    edit: code => code
      .replace('const NOTE_COL      = 11; // K — Note', 'const NOTE_COL      = 11; // K — Note\nconst BRUNCH_COL = 12;\nconst NAMES_COL = 13;')
      .replace('  note:    NOTE_COL,\n};', '  note:    NOTE_COL,\n  brunch: BRUNCH_COL,\n  guestNames: NAMES_COL,\n};'),
  });
  const site = makeSite('choice-events', {
    config: config({
      VENUE_ADDRESS: '1 Glass Lane, Springfield', WEDDING_END: '2099-06-12T23:00:00-04:00',
      EVENTS: [{ key: 'brunch', title: 'Sunday Brunch', start: '2099-06-13T11:30:00-04:00', end: '2099-06-13T13:30:00-04:00', location: 'The Garden Room, Springfield' }],
      RSVP_QUESTIONS: [
        { key: 'guestNames', label: "Names of everyone you're bringing", type: 'text', attendingOnly: true, partyOnly: true },
        { key: 'brunch', label: 'Will you join us for Sunday brunch?', type: 'radio', options: ['Yes', 'No'], invitedTo: 'brunch', attendingOnly: true },
      ],
    }),
    guests: `const GUEST_LIST = [
      { name: "The Rivera Family", max: 4, events: ["brunch"] },
      { name: "Alex Johnson", max: 1 } ];\n`,
  });
  await withSite(site, async url => {
    const wedding = fs.readFileSync(site.file('_site/wedding.ics'), 'utf8');
    check(/BEGIN:VEVENT[\s\S]*DTSTART:20990612T200000Z[\s\S]*DTEND:20990613T030000Z/.test(wedding), `wedding.ics times: ${wedding}`);
    check(/LOCATION:The Glasshouse\\, 1 Glass Lane\\, Springfield/.test(wedding), 'location escaped');
    check(/\r\n/.test(wedding), 'CRLF line endings');
    check(/SUMMARY:Sunday Brunch/.test(fs.readFileSync(site.file('_site/brunch.ics'), 'utf8')), 'brunch.ics');
    let page = await newDevice({ backend });
    await page.goto(link(url, { name: 'The Rivera Family', pw: PASSWORD }, '#rsvp'));
    await page.click('.welcome-close');
    await page.waitForSelector('#rsvp-form');
    const g = await page.getAttribute('[data-google-calendar="wedding"]', 'href');
    check(g.startsWith('https://calendar.google.com/') && g.includes('20990612T200000Z%2F20990613T030000Z'), `google link: ${g}`);
    check((await page.getAttribute('[data-href-field="map"]', 'href')).includes('1%20Glass%20Lane'), 'map link from the address');
    const ics = await page.request.get(url + 'wedding.ics');
    check(ics.ok(), 'wedding.ics served');
    await page.check('input[name="attending"][value="yes"]');
    check(await page.isVisible('[data-rsvp-question="brunch"]') && await page.isVisible('[data-rsvp-question="guestNames"]'), 'invitee with a party sees both');
    await page.fill('#rsvp-q-guestNames', 'Ana, Luis, Sofia');
    await page.check('input[name="rsvp-q-brunch"][value="Yes"]');
    await page.click('#rsvp-submit');
    await page.waitForSelector('.rsvp-success-panel');
    const row = backend.row('The Rivera Family');
    check(row.Brunch === 'Yes' && row['Guest Names'] === 'Ana, Luis, Sofia', `stored: ${JSON.stringify(row)}`);
    noProblems(page);
    page = await newDevice({ backend });
    await page.goto(link(url, { name: 'Alex Johnson', pw: PASSWORD }, '#rsvp'));
    await page.click('.welcome-close');
    await page.waitForSelector('#rsvp-form');
    await page.check('input[name="attending"][value="yes"]');
    check(!(await page.$('[data-rsvp-question="brunch"]')) && !(await page.$('[data-rsvp-question="guestNames"]')), 'solo guest not invited to brunch sees neither');
  });
});
