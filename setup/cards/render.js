#!/usr/bin/env node
/**
 * Render invitations, cards and signs from HTML designs, with the site's
 * fonts and real QR codes.
 *
 *   One-time setup:  npm install && npx playwright install chromium
 *
 *   node setup/cards/render.js invites
 *       One PNG per guest in invite-cards/, from setup/cards/invite.html:
 *       their name on the card and a QR code of their personal link
 *       (?name=...&pw=...#rsvp, opens the site with the welcome card).
 *   node setup/cards/render.js invites --only "Jane Smith and Guest" "Alex Johnson"
 *       Just those guests (after a name change or a late addition).
 *   node setup/cards/render.js invites --only "Sam Lee" --qr https://example.com/live.html --site-text example.com/live
 *       A card whose QR goes somewhere else, e.g. a livestream-only card for
 *       family who can't travel.
 *   node setup/cards/render.js blank [--with-code]
 *       One card with no name, QR to the site (add the code to the link with
 *       --with-code, e.g. for a card shared in a family group chat).
 *   node setup/cards/render.js page setup/cards/sign.html --out print/sign.pdf [--qr URL]
 *       Any design, to PDF (for printing) or PNG (for sending), at its real size.
 *
 *   Common options:  --template FILE   another card design (default invite.html)
 *                    --reply-by TEXT   replaces the [data-reply-by] line
 *                    --site-text TEXT  the address printed under the QR
 *                    --pdf             PDFs instead of PNGs (invites/blank)
 *                    --out PATH        output folder (invites/blank) or file (page)
 *
 * invite-cards/ is gitignored: every personal QR code contains the
 * invitation code. Scan a test print with a phone before printing a batch.
 */
'use strict';

const fs   = require('fs');
const path = require('path');
const { ROOT, fail, loadConfig, loadGuests, inviteLink } = require('../lib');

function need(mod) {
  try { return require(mod); }
  catch (e) { fail(`This needs "${mod}". Run once:  npm install && npx playwright install chromium`); }
}

// ── Arguments ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const mode = argv[0];
const opts = { only: [] };
for (let i = 1; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--only') { while (argv[i + 1] && !argv[i + 1].startsWith('--')) opts.only.push(argv[++i]); }
  else if (['--qr', '--site-text', '--reply-by', '--template', '--out'].includes(a)) opts[a.slice(2)] = argv[++i];
  else if (a === '--pdf') opts.pdf = true;
  else if (a === '--with-code') opts.withCode = true;
  else if (!a.startsWith('--') && mode === 'page' && !opts.file) opts.file = a;
  else fail(`Unknown option: ${a}`);
}
if (!['invites', 'blank', 'page'].includes(mode)) {
  fail('Usage: node setup/cards/render.js invites|blank|page ...  (see the top of this file)');
}

// ── Config and guests (the same private files the build reads) ─────────────
const cfg  = loadConfig();
const base = String(cfg.SITE_URL || '').replace(/\/+$/, '');
const siteText = opts['site-text'] || base.replace(/^https?:\/\//, '');

function personalUrl(name) {
  if (!base) fail('Set SITE_URL in js/config.js: the QR codes need the site address.');
  if (!cfg.SITE_PASSWORD) fail('Personal links carry the invitation code, and SITE_PASSWORD is empty.');
  return inviteLink(cfg, name);
}

const safeName = s => s.replace(/[^a-z0-9\-_() ]/gi, '').trim().replace(/\s+/g, ' ') || 'card';

// ── Rendering ───────────────────────────────────────────────────────────────
async function main() {
  const { chromium } = need('playwright');
  const QRCode       = need('qrcode');

  const browser = await chromium.launch();
  const page    = await browser.newPage({ deviceScaleFactor: 3 });

  // Fill a design: config fields, guest name (shrunk to fit), QR, address.
  // The QR code is drawn in the theme's ink on its background (css/theme.css).
  async function fill(file, { guestName, qrUrl }) {
    await page.goto('file://' + path.resolve(file));
    const colors = await page.evaluate(() => {
      const css = getComputedStyle(document.documentElement);
      return { dark: css.getPropertyValue('--ink').trim() || '#000000', light: css.getPropertyValue('--bg').trim() || '#ffffff' };
    });
    const qr = qrUrl ? await QRCode.toDataURL(qrUrl, { errorCorrectionLevel: 'M', margin: 1, width: 600, color: colors }) : null;
    await page.evaluate(async ({ cfg, guestName, qr, siteText, replyBy }) => {
      document.querySelectorAll('[data-field]').forEach(el => {
        const v = cfg[el.dataset.field];
        if (typeof v === 'string' || typeof v === 'number') el.textContent = v;
      });
      document.querySelectorAll('[data-site-text]').forEach(el => { if (siteText) el.textContent = siteText; });
      document.querySelectorAll('[data-reply-by]').forEach(el => { if (replyBy) el.textContent = replyBy; });
      document.querySelectorAll('[data-guest-name]').forEach(el => {
        el.textContent = guestName || '';
        let size = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth && size > 8) el.style.fontSize = `${--size}px`;
      });
      const imgs = Array.from(document.querySelectorAll('img[data-qr]'));
      imgs.forEach(img => { if (qr) img.src = qr; else img.closest('.qr, .reply')?.remove(); });
      await Promise.all(imgs.filter(i => i.isConnected).map(i => i.decode()));
      await document.fonts.ready;
    }, { cfg: Object.assign({}, cfg, { SITE_PASSWORD: undefined }), guestName, qr, siteText, replyBy: opts['reply-by'] });
    // Text the design still needs by hand (the time, the reply-by line).
    const left = await page.evaluate(() => [...new Set(document.body.innerText.match(/\{\{[^}]*\}\}/g) || [])]);
    if (left.length && !warned.has(file)) {
      warned.add(file);
      console.warn(`Warning: ${path.relative(ROOT, path.resolve(file))} still shows ${left.join(', ')}. Edit the design (or pass --reply-by) before printing.`);
    }
  }
  const warned = new Set();

  async function save(out) {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    if (out.endsWith('.pdf')) {
      const size = await page.evaluate(() => {
        const r = document.querySelector('.card').getBoundingClientRect();
        document.body.style.background = 'none';
        document.body.style.padding = '0';
        return { w: r.width, h: r.height };
      });
      await page.pdf({ path: out, width: `${size.w}px`, height: `${size.h}px`, printBackground: true, pageRanges: '1' });
    } else {
      await page.locator('.card').screenshot({ path: out });
    }
  }

  const template = opts.template || path.join(__dirname, 'invite.html');
  const outDir   = path.resolve(ROOT, opts.out || 'invite-cards');
  const ext      = opts.pdf ? '.pdf' : '.png';

  if (mode === 'invites') {
    const guests = loadGuests();
    if (!guests.length) fail('js/guests.js not found or empty: personal invitations need the guest list.');
    const list = opts.only.length ? guests.filter(g => opts.only.includes(g.name)) : guests;
    const missing = opts.only.filter(n => !guests.some(g => g.name === n));
    if (missing.length) fail(`Not on the guest list (names must match exactly): ${missing.join(', ')}`);
    for (const [i, g] of list.entries()) {
      // displayName changes only the printed text; the link keys off name,
      // so a card already sent keeps working if the printed name changes.
      await fill(template, { guestName: g.displayName || g.name, qrUrl: opts.qr || personalUrl(g.name) });
      await save(path.join(outDir, safeName(g.name) + ext));
      console.log(`  [${i + 1}/${list.length}] ${g.name}`);
    }
    console.log(`\nSaved ${list.length} card(s) to ${path.relative(ROOT, outDir)}/ (gitignored: the QR codes contain the invitation code).`);
  } else if (mode === 'blank') {
    if (!base && !opts.qr) fail('Set SITE_URL in js/config.js (or pass --qr URL).');
    const url = opts.qr || (opts.withCode ? `${base}/?${new URLSearchParams({ pw: cfg.SITE_PASSWORD || '' })}` : `${base}/`);
    await fill(template, { guestName: '', qrUrl: url });
    await save(path.join(outDir, '_blank' + ext));
    console.log(`Saved ${path.relative(ROOT, outDir)}/_blank${ext}` + (opts.withCode ? ' (its QR contains the invitation code)' : ''));
  } else {
    if (!opts.file) fail('Which design? node setup/cards/render.js page setup/cards/sign.html --out print/sign.pdf');
    if (!opts.out) fail('Where to? Add --out file.pdf (for printing) or --out file.png');
    await fill(opts.file, { qrUrl: opts.qr || null });
    await save(path.resolve(ROOT, opts.out));
    console.log(`Saved ${opts.out}`);
  }
  await browser.close();
}

main().catch(err => fail(`Couldn't render: ${err.message}`));
