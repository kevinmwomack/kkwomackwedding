// Small helpers for the journey tests: make a throwaway copy of the
// template, edit it the way a couple would, build it, serve it, and drive
// it with a real browser. No test framework; see run.js.
'use strict';
const fs   = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const WORK = path.join(ROOT, 'test-results');
const PASSWORD = 'velvet lantern orchard';

// ── A tiny test runner ──────────────────────────────────────────────────────
const tests = [];
function journey(name, fn) { tests.push({ name, fn }); }
function check(cond, msg) { if (!cond) throw new Error(msg); }

// ── Site fixtures ───────────────────────────────────────────────────────────
// Everything a fork would have, minus the private files and test output.
// Docs and the tests themselves are left out too: a copy holding AGENTS.md or
// CLAUDE.md would look like a second set of instructions to coding agents.
const SKIP = new Set(['.git', 'node_modules', 'test-results', '_site', 'invite-cards', 'print', 'tests',
  'js/config.js', 'js/guests.js', 'AGENTS.md', 'CLAUDE.md', 'README.md', 'SETUP.md', 'SECURITY.md',
  'LESSONS.md', 'CUSTOMIZING.md', 'JOURNEYS.md']);
function copyTemplate(dest) {
  (function copy(rel) {
    for (const e of fs.readdirSync(path.join(ROOT, rel), { withFileTypes: true })) {
      const r = path.posix.join(rel, e.name);
      if (SKIP.has(r) || SKIP.has(e.name)) continue;
      if (e.isDirectory()) { fs.mkdirSync(path.join(dest, r), { recursive: true }); copy(r); }
      else fs.copyFileSync(path.join(ROOT, r), path.join(dest, r));
    }
  })('');
}

// A config the way a couple fills it in, from config.example.js, with overrides.
function config(overrides = {}) {
  const base = {
    SITE_PASSWORD: PASSWORD,
    SITE_URL: 'http://localhost',
    COUPLE_NAMES: 'Sam & Riley',
    WEDDING_DATE: '2099-06-12T16:00:00-04:00',
    WEDDING_DATE_DISPLAY: 'June 12, 2099',
    VENUE_NAME: 'The Glasshouse',
    VENUE_CITY: 'Springfield',
    DRESS_CODE: 'Cocktail attire',
    HASHTAG: '#SamAndRiley',
    CONTACT_EMAIL: 'hello@example.com',
    WHATSAPP_LINK: '',
    RSVP_FORM_URL: 'https://docs.google.com/forms/d/e/1FAIpQLSf-09-yVyApZ6Gzg4o97DEE-u_8fNvbzuYWnhMmQKTesqGs8A/viewform?embedded=true',
    AUTH_ITERATIONS: 20000, // faster than the default; one journey uses the default
  };
  const cfg = Object.assign(base, overrides);
  Object.keys(cfg).forEach(k => cfg[k] === undefined && delete cfg[k]);
  return `window.SITE_CONFIG = ${JSON.stringify(cfg, null, 2)};\n`;
}

// makeSite('name', { config, edit(dir) }) → { dir, build(args) }
function makeSite(name, { config: cfg, edit } = {}) {
  const dir = path.join(WORK, name);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  copyTemplate(dir);
  fs.writeFileSync(path.join(dir, 'js/config.js'), cfg === undefined ? config() : cfg);
  if (edit) edit(dir);
  return {
    dir,
    file: rel => path.join(dir, rel),
    read: rel => fs.readFileSync(path.join(dir, rel), 'utf8'),
    write: (rel, text) => fs.writeFileSync(path.join(dir, rel), text),
    build(args = []) {
      const r = spawnSync(process.execPath, ['setup/build.js', ...args], { cwd: dir, encoding: 'utf8', env: Object.assign({}, process.env, { SITE_CONFIG_JS: '', GUESTS_JS: '' }) });
      return { ok: r.status === 0, output: (r.stdout || '') + (r.stderr || '') };
    },
  };
}

// Edit an HTML file with a function, failing loudly if the edit didn't apply
// (so a doc instruction that no longer matches the markup is caught).
function editFile(file, fn) {
  const before = fs.readFileSync(file, 'utf8');
  const after = fn(before);
  if (after === before) throw new Error(`edit to ${path.basename(file)} changed nothing`);
  fs.writeFileSync(file, after);
}
function cut(html, startMarker, endMarker) {
  const a = html.indexOf(startMarker);
  const b = html.indexOf(endMarker, a);
  if (a < 0 || b < 0) throw new Error(`markers not found: ${startMarker} … ${endMarker}`);
  return html.slice(0, a) + html.slice(b + endMarker.length);
}

// ── Serving ─────────────────────────────────────────────────────────────────
const { serve } = require('../setup/serve');

// ── Browser ─────────────────────────────────────────────────────────────────
let browser;
async function getBrowser() {
  if (!browser) {
    let chromium;
    try { ({ chromium } = require('playwright')); }
    catch (e) { throw new Error('Playwright missing: run  npm install && npx playwright install chromium'); }
    browser = await chromium.launch();
  }
  return browser;
}
async function closeBrowser() { if (browser) await browser.close(); }

// A fresh device (empty storage), optionally at a fixed time. page.problems
// collects 404s, script errors and console errors.
async function newDevice({ at, viewport, reducedMotion } = {}) {
  const b = await getBrowser();
  const context = await b.newContext({ viewport: viewport || { width: 1280, height: 900 }, reducedMotion: reducedMotion || 'no-preference' });
  if (at) await context.clock.setFixedTime(new Date(at));
  const page = await context.newPage();
  page.problems = [];
  page.on('pageerror', e => page.problems.push(`script error: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) page.problems.push(`console: ${m.text()}`); });
  page.on('response', r => { if (r.url().startsWith('http://localhost') && r.status() >= 400) page.problems.push(`${r.status()} ${r.url()}`); });
  // Everything off-site (the form embed, maps, registries) answers blank, so tests run offline.
  await context.route(u => !u.hostname.startsWith('localhost'), route => route.fulfill({ status: 200, body: '' }));
  return page;
}
const noProblems = page => check(page.problems.length === 0, `page problems: ${page.problems.join(' | ')}`);
const link = (base, params, hash = '') => `${base}?${new URLSearchParams(params)}${hash}`;

module.exports = {
  ROOT, WORK, PASSWORD, tests, journey, check, config, makeSite, editFile, cut,
  serve, newDevice, closeBrowser, noProblems, link,
};
