// Shared by setup/build.js: reading the private source files. An optional
// guest list can still be sealed into the build; this site does not require one.
'use strict';

const fs   = require('fs');
const path = require('path');
const vm   = require('vm');

const ROOT = path.join(__dirname, '..');

function fail(msg) {
  console.error(`\n${msg}\n`);
  process.exit(1);
}

// The file's text: from an environment variable when set (GitHub Actions
// secrets), otherwise from the repo. null when optional and missing.
function readSource(envVar, file, optional) {
  if (process.env[envVar]) return { code: process.env[envVar], from: `$${envVar}` };
  const p = path.join(ROOT, file);
  if (!fs.existsSync(p)) {
    if (optional) return null;
    fail(`${file} not found. Copy ${file.replace('.js', '.example.js')} to ${file} and fill it in ` +
         `(or set the ${envVar} secret when building in GitHub Actions).`);
  }
  return { code: fs.readFileSync(p, 'utf8'), from: file };
}

function loadConfig() {
  const src = readSource('SITE_CONFIG_JS', 'js/config.js');
  const ctx = vm.createContext({ window: {} });
  try { vm.runInContext(src.code, ctx, { filename: src.from }); }
  catch (e) { fail(`couldn't read ${src.from}: ${e.message}`); }
  const cfg = ctx.window.SITE_CONFIG;
  if (!cfg || typeof cfg !== 'object') fail(`${src.from} must set window.SITE_CONFIG = { ... }`);
  return cfg;
}

// The guest list, checked. Optional: a site without RSVPs or personal
// invite links doesn't need one ([] when missing).
function loadGuests() {
  const src = readSource('GUESTS_JS', 'js/guests.js', true);
  if (!src) return [];
  let list;
  try { list = vm.runInContext(`${src.code}\n;GUEST_LIST`, vm.createContext({}), { filename: src.from }); }
  catch (e) { fail(`couldn't read ${src.from}: ${e.message}`); }
  if (!Array.isArray(list)) fail(`${src.from} must define const GUEST_LIST = [ ... ]`);

  const seen = new Set();
  list.forEach((g, i) => {
    if (!g || typeof g.name !== 'string' || !g.name.trim()) fail(`guest #${i + 1} has no name`);
    if (!Number.isInteger(g.max) || g.max < 1) fail(`"${g.name}" needs a whole-number max of 1 or more`);
    const key = g.name.trim().toLowerCase();
    if (seen.has(key)) fail(`"${g.name}" is on the guest list twice (names must be unique, they key the RSVP sheet)`);
    seen.add(key);
  });
  // Extra fields (a table number, the events they're invited to) are kept
  // and encrypted with the rest, for features to use.
  return list.map(g => Object.assign({}, g, { name: g.name.trim() }));
}

// Optional guests.csv link. This page does not read ?name=; a correct code
// opens the site either way. The plaintext code stays in the gitignored CSV.
function inviteLink(cfg, name) {
  const base = String(cfg.SITE_URL || '').replace(/\/+$/, '');
  if (!base) return '';
  return `${base}/?${new URLSearchParams({ name, pw: cfg.SITE_PASSWORD || '' })}#rsvp-coming`;
}

module.exports = { ROOT, fail, readSource, loadConfig, loadGuests, inviteLink };
