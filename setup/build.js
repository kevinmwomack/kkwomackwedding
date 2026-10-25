#!/usr/bin/env node
/**
 * Build the deployable site into _site/.
 *
 *   node setup/build.js                 build _site/ from js/config.js + js/guests.js
 *   node setup/build.js --out DIR       build somewhere else
 *   node setup/build.js --guests-csv    also write guests.csv (Name,Max,Group,URL)
 *                                       for a mail merge or stationer, and
 *                                       guests-sheet.csv (Name,Max) for the
 *                                       Apps Script "Guests" tab
 *
 * In GitHub Actions the two source files come from repository secrets
 * instead of disk (SITE_CONFIG_JS and GUESTS_JS hold their full contents),
 * so neither file ever needs to be committed.
 *
 * What the build does, and why:
 *   - js/config.js keeps the plaintext SITE_PASSWORD on your machine only.
 *     The published config.js gets a PBKDF2 key check instead, never the
 *     password itself.
 *   - js/guests.js is published encrypted (AES-GCM, key derived from the
 *     site password), so the guest list can't be read by fetching the file
 *     without the invitation code.
 *   - Only an allowlist of site files is copied (HTML at the root, css/,
 *     fonts/, images/, js/), so docs, setup scripts, CSVs and notes never
 *     get published by accident.
 *   - Every css/js reference in the HTML gets a ?v=<content hash>, so
 *     guests' phones never run a stale script after you deploy a fix.
 *   - <!-- include: name --> comments pull in shared markup from partials/
 *     (the password gate, the footer, the photo lightbox).
 */
'use strict';

const crypto = require('crypto');
const fs     = require('fs');
const path   = require('path');
const { ROOT, fail, loadConfig, loadGuests, inviteLink } = require('./lib');
const args = process.argv.slice(2);
const OUT  = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : '_site');
const WRITE_GUESTS_CSV = args.includes('--guests-csv');

// PBKDF2 work factor. Higher is slower to brute-force but also slower to
// unlock on an old phone (it runs once per device). Override with
// AUTH_ITERATIONS in config.js if you need to.
const DEFAULT_ITERATIONS = 310000;

// ── Checks that catch the mistakes we actually made ─────────────────────────
function checkConfig(cfg, guests, gatedPages, rsvpPages) {
  const pw = cfg.SITE_PASSWORD;
  if (rsvpPages.length && !guests.length) {
    fail(`${rsvpPages.join(', ')} has an RSVP section (id="rsvp") but there's no guest list. ` +
         'Add js/guests.js, or take the RSVP section out (see CUSTOMIZING.md, "No RSVP form").');
  }
  if (!pw) {
    // A fully public site is allowed, as long as nothing expects a code.
    if (guests.length) fail('SITE_PASSWORD is missing, but there is a guest list: it is published ' +
                            'encrypted with the code, so it needs one.');
    if (gatedPages.length) fail(`SITE_PASSWORD is missing, but ${gatedPages.join(', ')} has a password ` +
                                'gate. Set a code, or remove the #password-gate block for a public site.');
    return;
  }
  if (typeof pw !== 'string') fail('SITE_PASSWORD must be text');
  if (pw === 'ChangeMe123') fail('SITE_PASSWORD is still the example value; pick your own');
  if (pw.length < 10) {
    console.warn(`Warning: SITE_PASSWORD is only ${pw.length} characters. Anyone can download the site ` +
                 'and try guesses offline, so a three-word phrase is much safer than a short code.');
  }
}

const hasOffset = v => !Number.isNaN(Date.parse(v)) && /(Z|[+-]\d\d:\d\d)$/.test(String(v));
const OFFSET_HELP = "(e.g. 2027-06-12T16:00:00-04:00), otherwise it means a different moment in every guest's time zone.";

function checkFacts(cfg, guests) {
  ['WEDDING_DATE', guests.length ? 'RSVP_DEADLINE' : null, cfg.WEDDING_END ? 'WEDDING_END' : null].filter(Boolean).forEach(k => {
    if (!hasOffset(cfg[k])) console.warn(`Warning: ${k} should be an ISO time with a UTC offset ${OFFSET_HELP}`);
  });
  (cfg.EVENTS || []).forEach((e, i) => {
    if (!e || !/^[a-z][a-z0-9-]*$/.test(e.key || '')) fail(`EVENTS #${i + 1} needs a key like "brunch" (lowercase letters, numbers, dashes)`);
    if (e.key === 'wedding') fail('EVENTS: "wedding" is taken by the wedding itself; pick another key');
    if (!hasOffset(e.start)) fail(`EVENTS "${e.key}": start must be an ISO time with a UTC offset ${OFFSET_HELP}`);
    if (e.end && !hasOffset(e.end)) fail(`EVENTS "${e.key}": end must be an ISO time with a UTC offset`);
  });
  const leftovers = Object.entries(cfg)
    .filter(([k]) => guests.length || k !== 'RSVP_ENDPOINT')
    .filter(([, v]) => typeof v === 'string' && /\{\{|changeme@|YOUR_GOOGLE_APPS_SCRIPT/i.test(v))
    .map(([k]) => k);
  if (leftovers.length) console.warn(`Warning: still placeholder values in config.js: ${leftovers.join(', ')}`);
}

// Things in the pages themselves that are easy to miss: {{placeholders}} that
// config doesn't fill (times, travel, FAQ) and a day-of program still dated
// for some other day. Warnings, not failures, so a draft still builds.
function checkPages(cfg, rendered) {
  const filled = s => s
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/(<title>[^<]*)\{\{COUPLE_NAMES\}\}/, '$1')
    .replace(/<(\w+)[^>]*\bdata-field="[^"]*"[^>]*>\{\{[^}]*\}\}<\/\1>/g, '')
    .replace(/<[^>]*\bdata-href-field="[^"]*"[^>]*>/g, '');
  for (const [name, html] of Object.entries(rendered)) {
    const left = [...new Set(filled(html).match(/\{\{[^}]*\}\}/g) || [])];
    if (left.length) {
      const shown = left.slice(0, 5).map(t => t.length > 40 ? t.slice(0, 37) + '...}}' : t).join(', ');
      console.warn(`Warning: ${name} still has placeholders to replace by hand: ${shown}${left.length > 5 ? `, and ${left.length - 5} more` : ''}`);
    }
  }
  const day = iso => Date.parse(String(iso).slice(0, 10));
  const dates = [cfg.WEDDING_DATE, ...(cfg.EVENTS || []).map(e => e && e.start)].map(day).filter(Number.isFinite);
  for (const [name, html] of Object.entries(rendered)) {
    const odd = [...html.matchAll(/data-start="(\d{4}-\d{2}-\d{2})/g)].map(m => m[1])
      .filter(d => !dates.some(w => Math.abs(day(d) - w) <= 3 * 864e5));
    if (dates.length && odd.length) {
      console.warn(`Warning: ${name} has program times on ${[...new Set(odd)].join(', ')}, not near WEDDING_DATE or any of EVENTS. Update the data-start dates.`);
    }
  }
}

// ── Crypto (matches the WebCrypto code in js/main.js) ───────────────────────
function siteSalt(cfg) {
  if (cfg.AUTH_SALT) return String(cfg.AUTH_SALT);
  // Stable per site (so a redeploy doesn't log every guest out) and unique
  // per couple (so one precomputed table can't crack every site built from
  // this template).
  return crypto.createHash('sha256')
    .update(`wedding-website-template|${cfg.COUPLE_NAMES}|${cfg.WEDDING_DATE}`)
    .digest('hex').slice(0, 32);
}

function deriveKey(password, salt, iterations) {
  return crypto.pbkdf2Sync(password.normalize('NFC'), salt, iterations, 32, 'sha256');
}

function seal(key, obj) {
  const iv     = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data   = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString('base64'), data: data.toString('base64') };
}

// ── "Add to calendar" files ─────────────────────────────────────────────────
// wedding.ics plus one per EVENTS entry. A real file (not a data: link) so
// iPhones open it straight in Calendar.
function calendarEvents(cfg) {
  const where = [cfg.VENUE_NAME, cfg.VENUE_ADDRESS || cfg.VENUE_CITY].filter(Boolean).join(', ');
  const wedding = { key: 'wedding', title: `${cfg.COUPLE_NAMES}'s Wedding`, start: cfg.WEDDING_DATE, end: cfg.WEDDING_END, location: where };
  return [wedding].concat(cfg.EVENTS || []).filter(e => hasOffset(e.start));
}

function icsFor(cfg, e) {
  const stamp = t => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const text  = s => String(s || '').replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1').replace(/\n/g, '\\n');
  const end   = e.end ? Date.parse(e.end) : Date.parse(e.start) + 6 * 3600e3;
  return [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//wedding-website-template//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${e.key}-${stamp(e.start)}@${String(cfg.SITE_URL || 'wedding').replace(/^https?:\/\//, '').replace(/\/.*$/, '')}`,
    `DTSTAMP:${stamp(Date.now())}`, `DTSTART:${stamp(e.start)}`, `DTEND:${stamp(end)}`,
    `SUMMARY:${text(e.title)}`,
    e.location ? `LOCATION:${text(e.location)}` : null,
    cfg.SITE_URL ? `URL:${cfg.SITE_URL}` : null,
    'END:VEVENT', 'END:VCALENDAR',
  ].filter(Boolean).join('\r\n') + '\r\n';
}

// ── Copy the allowlisted site files ─────────────────────────────────────────
const ROOT_FILE  = /^(.*\.html|favicon\.(svg|ico|png)|robots\.txt|CNAME|\.nojekyll|site\.webmanifest)$/;
const SITE_DIRS  = ['css', 'fonts', 'images', 'js'];
const NEVER_COPY = /^js\/(config|guests)(\.example)?\.js$/;

function copyDir(rel) {
  const src = path.join(ROOT, rel);
  if (!fs.existsSync(src)) return;
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const childRel = path.posix.join(rel, entry.name);
    if (entry.name.startsWith('.')) continue;
    if (entry.isDirectory()) { copyDir(childRel); continue; }
    if (NEVER_COPY.test(childRel)) continue;
    fs.mkdirSync(path.join(OUT, rel), { recursive: true });
    fs.copyFileSync(path.join(ROOT, childRel), path.join(OUT, childRel));
  }
}

// <!-- include: name attr="value" --> → partials/name.html, with [[attr|default]]
// filled in. Shared markup (the gate, the footer) lives in one place.
function expandIncludes(html, from) {
  return html.replace(/<!--\s*include:\s*([\w-]+)((?:\s+[\w-]+="[^"]*")*)\s*-->\n?/g, (m, name, attrs) => {
    const file = path.join(ROOT, 'partials', `${name}.html`);
    if (!fs.existsSync(file)) fail(`${from} includes "${name}", but partials/${name}.html doesn't exist.`);
    const vals = {};
    attrs.replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => { vals[k] = v; });
    return fs.readFileSync(file, 'utf8').replace(/\[\[([\w-]+)(?:\|([^\]]*))?\]\]/g, (_, k, d) => vals[k] ?? d ?? '');
  });
}

function cacheBust(html) {
  return html.replace(/(src|href)="((?:css|js)\/[^"?#]+\.(?:css|js))(?:\?[^"]*)?"/g, (m, attr, ref) => {
    const file = path.join(OUT, ref);
    if (!fs.existsSync(file)) return m;
    const v = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
    return `${attr}="${ref}?v=${v}"`;
  });
}

// ── Main ────────────────────────────────────────────────────────────────────
const cfg    = loadConfig();
const guests = loadGuests();

const rootHtml   = fs.readdirSync(ROOT).filter(n => n.endsWith('.html'));
const rendered   = Object.fromEntries(rootHtml.map(n => [n, expandIncludes(fs.readFileSync(path.join(ROOT, n), 'utf8'), n)]));
const pagesWith  = re => rootHtml.filter(n => re.test(rendered[n]));
checkConfig(cfg, guests, pagesWith(/id="password-gate"/), pagesWith(/<section[^>]*\bid="rsvp"/));
checkFacts(cfg, guests);
checkPages(cfg, rendered);

const hasCode    = !!cfg.SITE_PASSWORD;
const iterations = Number(cfg.AUTH_ITERATIONS) || DEFAULT_ITERATIONS;
const salt       = siteSalt(cfg);
const key        = hasCode ? deriveKey(cfg.SITE_PASSWORD, salt, iterations) : null;

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

for (const name of fs.readdirSync(ROOT)) {
  if (ROOT_FILE.test(name) && fs.statSync(path.join(ROOT, name)).isFile()) {
    fs.copyFileSync(path.join(ROOT, name), path.join(OUT, name));
  }
}
SITE_DIRS.forEach(copyDir);

// Public config: everything except the password, plus what the gate needs.
const publicCfg = Object.assign({}, cfg);
delete publicCfg.SITE_PASSWORD;
delete publicCfg.AUTH_SALT;
delete publicCfg.AUTH_ITERATIONS;
if (hasCode) {
  publicCfg.AUTH = {
    salt,
    iterations,
    check: crypto.createHash('sha256').update(key).digest('hex'),
  };
}
fs.writeFileSync(path.join(OUT, 'js/config.js'),
  `// Generated by setup/build.js. Edit js/config.js, not this file.\n` +
  `window.SITE_CONFIG = ${JSON.stringify(publicCfg, null, 2)};\n`);

for (const e of calendarEvents(cfg)) fs.writeFileSync(path.join(OUT, `${e.key}.ics`), icsFor(cfg, e));

fs.writeFileSync(path.join(OUT, 'js/guests.js'), guests.length
  ? `// Generated by setup/build.js: the guest list, encrypted with the invitation code.\n` +
    `window.GUEST_LIST_SEALED = ${JSON.stringify(seal(key, guests))};\n`
  : `// Generated by setup/build.js: no guest list on this site.\nwindow.GUEST_LIST_SEALED = null;\n`);

for (const name of rootHtml) {
  fs.writeFileSync(path.join(OUT, name), cacheBust(rendered[name]));
}

// Last line of defence: the plaintext password must not be published, either
// hardcoded in a script or baked into a link (we did both at one point).
const pwPatterns = !hasCode ? [] : [
  `pw=${cfg.SITE_PASSWORD}`, `pw=${encodeURIComponent(cfg.SITE_PASSWORD)}`,
  new URLSearchParams({ pw: cfg.SITE_PASSWORD }).toString(),
  `'${cfg.SITE_PASSWORD}'`, `"${cfg.SITE_PASSWORD}"`, `\`${cfg.SITE_PASSWORD}\``,
];
(function scanForPassword(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) { scanForPassword(p); continue; }
    if (!/\.(html|js|css|txt|json|svg|webmanifest)$/.test(entry.name)) continue;
    const text = fs.readFileSync(p, 'utf8');
    if (pwPatterns.some(s => text.includes(s))) {
      fail(`the site password appears in ${path.relative(OUT, p)}. Remove it (use a link without ?pw=, ` +
           'or let guests type the code) and build again.');
    }
  }
})(OUT);

if (WRITE_GUESTS_CSV && !guests.length) {
  console.warn('Warning: --guests-csv needs a guest list (js/guests.js); nothing written.');
} else if (WRITE_GUESTS_CSV) {
  if (!cfg.SITE_URL) console.warn('Warning: set SITE_URL in config.js to put invite links in guests.csv.');
  const csvCell = s => `"${String(s).replace(/"/g, '""')}"`;
  const rows = guests.map(g => [g.name, g.max, g.group || '', inviteLink(cfg, g.name)].map(csvCell).join(','));
  fs.writeFileSync(path.join(ROOT, 'guests.csv'), ['Name,Max,Group,URL', ...rows].join('\n') + '\n');
  // A separate file for the Sheet: no links, so the code never ends up in a
  // spreadsheet you might share with a caterer or planner.
  const sheetRows = guests.map(g => [g.name, g.max].map(csvCell).join(','));
  fs.writeFileSync(path.join(ROOT, 'guests-sheet.csv'), ['Name,Max', ...sheetRows].join('\n') + '\n');
  console.log('Wrote guests.csv (invite links, for the QR cards) and guests-sheet.csv (Name,Max, for the ' +
              'Sheet\'s Guests tab). Both are gitignored; guests.csv has the invitation code in every link.');
}

console.log(`Built ${path.relative(ROOT, OUT) || OUT}/: ` +
  (guests.length ? `${guests.length} guest entries (guest list encrypted)` : 'no guest list') +
  (hasCode ? ', gated by the invitation code.' : ', public (no invitation code).'));
