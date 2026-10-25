// Couples who want more: install every example the way its own header says.
'use strict';
const fs = require('fs');
const path = require('path');
const { journey, check, makeSite, config, serve, newDevice, noProblems, link, installAllExamples, PASSWORD } = require('./lib');


journey('Couple adds every extra: Our Story + wedding party, gallery, gifts, day-of, menu, brunch page, short link', async () => {
  const site = makeSite('extras', { config: config({
    DAY_OF_BUTTON: { from: '2099-06-12T00:00:00-04:00', until: '2099-06-13T06:00:00-04:00', label: "Today's Program", href: 'live.html' },
  }), edit: dir => { installAllExamples(dir);
  } });
  const r = site.build();
  check(r.ok, r.output);
  for (const f of ['our-story.html', 'live.html', 'menu.html', 'brunch.html', 'photos.html', 'css/day-of.css', 'js/photos.js', 'images/story-1.jpg'])
    check(fs.existsSync(site.file(`_site/${f}`)), `not published: ${f}`);
  const srv = await serve(site.file('_site'));
  try {
    // Before the day: gallery, gifts, our story + party, lightbox
    let page = await newDevice({ at: '2099-05-01T12:00:00-04:00' });
    await page.goto(link(srv.url, { pw: PASSWORD }));
    await page.waitForSelector('#password-gate', { state: 'detached' });
    check((await page.$$('.gift-option')).length === 3, 'gift options');
    await page.focus('.gallery-item >> nth=0'); await page.keyboard.press('Enter');
    await page.waitForSelector('#lightbox.open');
    await page.keyboard.press('Escape');
    check(!(await page.isVisible('.day-of-program-btn')), 'no day-of button before the day');
    await page.goto(srv.url + 'our-story.html'); await page.waitForTimeout(600);
    check(!(await page.isVisible('#gate-input')), 'unlocked on every page');
    check((await page.$$('.bp-card')).length >= 3, 'wedding party');
    // Each timeline entry's text sits beside its photo, not on the row below
    const misaligned = await page.evaluate(() => Array.from(document.querySelectorAll('.timeline-item')).filter(item => {
      const img = item.querySelector('.timeline-img-wrap').getBoundingClientRect();
      const txt = item.querySelector('.timeline-content').getBoundingClientRect();
      return txt.top > img.bottom || txt.bottom < img.top;
    }).length);
    check(misaligned === 0, `${misaligned} timeline entries have their text off to another row`);
    noProblems(page);
    // On the evening: button, current item, menu folded, brunch countdown
    page = await newDevice({ at: '2099-06-12T20:40:00-04:00' });
    await page.goto(link(srv.url, { pw: PASSWORD }));
    await page.waitForSelector('#password-gate', { state: 'detached' });
    await page.click('.day-of-program-btn');
    await page.waitForSelector('.program-item.is-current');
    check((await page.textContent('.program-item.is-current .program-title')) === 'Speeches', 'current item');
    check(/UK$/.test(await page.textContent('.program-time-alt')), 'second time zone');
    await page.goto(srv.url + 'menu.html'); await page.waitForTimeout(500);
    check(await page.evaluate(() => !document.querySelector('details[data-fold-after]').open), 'dinner folded after the speeches');
    page = await newDevice({ at: '2099-06-13T10:30:00-04:00' });
    await page.goto(link(srv.url + 'brunch.html', { pw: PASSWORD })); await page.waitForTimeout(500);
    check((await page.textContent('#cd-hours')) === '01' && (await page.textContent('#cd-days')) === '00', 'brunch countdown');
    // Short link is public and redirects
    page = await newDevice();
    await page.goto(srv.url + 'photos.html').catch(() => {});
    await page.waitForURL(/photos\.example\.com/, { timeout: 5000 });
    // Phones
    for (const w of [320, 375]) {
      page = await newDevice({ viewport: { width: w, height: 700 }, at: '2099-05-01T12:00:00-04:00' });
      for (const p of ['', 'our-story.html', 'live.html', 'menu.html']) {
        await page.goto(link(srv.url + p, { pw: PASSWORD })); await page.waitForTimeout(500);
        check(await page.evaluate(w => document.documentElement.scrollWidth <= w, w), `sideways scroll on ${p || 'index'} at ${w}px`);
      }
    }
  } finally { srv.close(); }
});
