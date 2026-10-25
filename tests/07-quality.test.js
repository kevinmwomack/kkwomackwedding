// Quality checks on every page and important state, with every example
// installed: accessibility (axe), touch targets, reduced motion, links,
// images, and guest-facing copy.
'use strict';
const fs = require('fs');
const path = require('path');
const { journey, check, makeSite, config, serve, newDevice, installAllExamples, PASSWORD } = require('./lib');

let srv;
async function qualitySite() {
  if (srv) return srv;
  const site = makeSite('quality', { config: config({ WHATSAPP_LINK: 'https://wa.me/15555550123', VENUE_ADDRESS: '1 Glass Lane' }), edit: installAllExamples });
  const r = site.build();
  check(r.ok, r.output);
  srv = await serve(site.file('_site'));
  return srv;
}
process.on('exit', () => srv && srv.close());

async function axe(page) {
  let src;
  try { src = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8'); }
  catch (e) { throw new Error('axe-core missing: run npm install'); }
  await page.addScriptTag({ content: src });
  return page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] }))
    .violations.map(v => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map(n => n.target.join(' ')).join(', ')}`));
}

journey('Accessibility: no axe violations on the gated page or example pages', async () => {
  const { url } = await qualitySite();
  const pw = new URLSearchParams({ pw: PASSWORD });
  const states = [
    ['gate', url, null],
    ['home', `${url}?${pw}`, null],
    ['lightbox open', `${url}?${pw}`, async p => { await p.focus('.gallery-item >> nth=0'); await p.keyboard.press('Enter'); await p.waitForSelector('#lightbox.open'); }],
    ['our story', `${url}our-story.html?${pw}`, null],
    ['day-of program', `${url}live.html?${pw}`, null],
    ['menu', `${url}menu.html?${pw}`, null],
  ];
  const problems = [];
  for (const [label, u, steps] of states) {
    // Reduced motion, so axe never measures a card halfway through fading in.
    const page = await newDevice({ at: '2099-05-01T12:00:00-04:00', reducedMotion: 'reduce' });
    await page.goto(u); await page.waitForTimeout(900);
    if (steps) await steps(page);
    for (const v of await axe(page)) problems.push(`${label}: ${v}`);
  }
  check(problems.length === 0, problems.join('\n'));
});

journey('Phones: buttons and links are big enough to tap (44px)', async () => {
  const { url } = await qualitySite();
  const page = await newDevice({ viewport: { width: 375, height: 760 } });
  const small = [];
  for (const p of ['', 'our-story.html', 'live.html', 'menu.html']) {
    await page.goto(`${url}${p}?${new URLSearchParams({ pw: PASSWORD })}`); await page.waitForTimeout(800);
    small.push(...await page.evaluate(page => Array.from(document.querySelectorAll('button, a[href], input[type="radio"] + *, select'))
      .filter(el => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && s.visibility !== 'hidden' && !el.closest('[hidden], #lightbox:not(.open), .skip-link'); })
      // Links inside a sentence are exempt (WCAG 2.5.8 "inline" exception)
      .filter(el => !(el.tagName === 'A' && el.closest('p') && el.closest('p').textContent.trim().length > el.textContent.trim().length + 20))
      .filter(el => el.getBoundingClientRect().height < 44)
      .map(el => `${page || 'index'}: <${el.tagName.toLowerCase()} class="${el.className}">${(el.textContent || '').trim().slice(0, 30)} (${Math.round(el.getBoundingClientRect().height)}px)`), p));
  }
  check(small.length === 0, `too small to tap:\n${small.join('\n')}`);
});

journey('Reduced motion: everything is visible straight away, nothing animates', async () => {
  const { url } = await qualitySite();
  const page = await newDevice({ reducedMotion: 'reduce' });
  await page.goto(`${url}?${new URLSearchParams({ pw: PASSWORD })}`);
  await page.waitForTimeout(400);
  const hidden = await page.evaluate(() => Array.from(document.querySelectorAll('.reveal, .fade-in')).filter(el => getComputedStyle(el).opacity !== '1').length);
  check(hidden === 0, `${hidden} elements still faded out with reduced motion`);
});

journey('Links, images and guest-facing copy', async () => {
  const { url } = await qualitySite();
  const page = await newDevice();
  const issues = [];
  for (const p of ['', 'our-story.html', 'live.html', 'menu.html']) {
    await page.goto(`${url}${p}?${new URLSearchParams({ pw: PASSWORD })}`); await page.waitForTimeout(600);
    issues.push(...await page.evaluate(p => {
      const out = [];
      document.querySelectorAll('a[target="_blank"]').forEach(a => { if (!/noopener/.test(a.rel)) out.push(`${p}: new-tab link without rel="noopener": ${a.href}`); });
      document.querySelectorAll('img').forEach(i => { if (!i.hasAttribute('alt')) out.push(`${p}: image without alt: ${i.src}`); });
      if (!document.querySelector('meta[name="robots"][content*="noindex"]')) out.push(`${p}: missing noindex`);
      if (!document.documentElement.lang) out.push(`${p}: missing lang`);
      return out;
    }, p || 'index'));
  }
  // Built-in guest-facing strings: no em-dashes (they read as a typo on a
  // phone, and our copy style avoids them), no leftover "TODO"
  const strings = fs.readFileSync(path.join(__dirname, '..', 'js/main.js'), 'utf8')
    .match(/(["'`])(?:(?!\1)[^\\\n]|\\.)*\1/g) || [];
  strings.filter(s => /—/.test(s) && /\s/.test(s)).forEach(s => issues.push(`em-dash in guest-facing text: ${s.slice(0, 60)}`));
  check(issues.length === 0, issues.join('\n'));
});
