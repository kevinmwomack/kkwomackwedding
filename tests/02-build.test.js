// The build is the safety net: these are the mistakes it must refuse.
'use strict';
const fs = require('fs');
const path = require('path');
const { journey, check, makeSite, config, guestsJs, PASSWORD, editFile } = require('./lib');

function allPublished(dir) {
  const out = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : out.push(p); } })(path.join(dir, '_site'));
  return out;
}

journey('Build: published files hold no code, no guest names, no private files', async () => {
  // Names that can't appear anywhere in the template's own code or comments
  const site = makeSite('build-clean', { guests: guestsJs([{ name: 'Zephyrine Quillfeather', max: 2 }, { name: 'Ottoline Brackenbury', max: 1 }]) });
  const r = site.build(['--guests-csv']);
  check(r.ok, r.output);
  const files = allPublished(site.dir);
  const text = files.filter(f => /\.(html|js|css|txt)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  check(!text.includes(PASSWORD), 'code published');
  check(!/Zephyrine|Quillfeather|Ottoline|Brackenbury/.test(text), 'guest names published');
  check(!files.some(f => /setup|tests|examples|\.md$|guests\.csv|package/.test(path.relative(site.dir, f))), 'non-site files published');
  check(fs.readFileSync(site.file('guests-sheet.csv'), 'utf8').indexOf('pw=') === -1, 'Sheet CSV has no links');
  check(fs.readFileSync(site.file('guests.csv'), 'utf8').includes('pw='), 'invite CSV has links');
});

journey('Build: refuses the example code, a code baked into a link, duplicate guests', async () => {
  let s = makeSite('build-example-pw', { config: config({ SITE_PASSWORD: 'ChangeMe123' }) });
  check(!s.build().ok, 'example code accepted');
  s = makeSite('build-pw-link', { edit: dir => fs.writeFileSync(path.join(dir, 'live.html'), `<a href="live.html?pw=${encodeURIComponent(PASSWORD)}">x</a>`) });
  check(/password appears in live.html/.test(s.build().output), 'code in link accepted');
  s = makeSite('build-dupes', { guests: guestsJs([{ name: 'A B', max: 1 }, { name: 'a b ', max: 2 }]) });
  check(/twice/.test(s.build().output), 'duplicate accepted');
});

journey('Build: half-removed features are caught (RSVP without guests, gate without code)', async () => {
  let s = makeSite('build-rsvp-no-guests', { guests: null });
  check(/RSVP section.*no guest list/.test(s.build().output), 'RSVP section without guest list accepted');
  s = makeSite('build-gate-no-code', { guests: null, config: config({ SITE_PASSWORD: undefined }), edit: dir => {
    editFile(path.join(dir, 'index.html'), h => h.replace(/<section id="rsvp"[\s\S]*?<\/section>/, ''));
  } });
  check(/password\s+gate/.test(s.build().output), 'gate without code accepted');
});

journey('Build: CI path reads secrets, not files; default PBKDF2 strength', async () => {
  const s = makeSite('build-ci', { guests: null, config: '// placeholder' });
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, ['setup/build.js'], { cwd: s.dir, encoding: 'utf8', env: Object.assign({}, process.env, {
    SITE_CONFIG_JS: config({ AUTH_ITERATIONS: undefined }), GUESTS_JS: guestsJs() }) });
  check(r.status === 0, r.stdout + r.stderr);
  const cfg = fs.readFileSync(s.file('_site/js/config.js'), 'utf8');
  check(/"iterations": 310000/.test(cfg), 'default iterations');
  check(fs.readFileSync(s.file('_site/js/guests.js'), 'utf8').includes('GUEST_LIST_SEALED = {'), 'guests from secret');
});

journey('Build: shared markup comes from partials; a misspelled include is caught', async () => {
  let s = makeSite('build-includes');
  check(s.build().ok, 'build');
  const html = fs.readFileSync(s.file('_site/index.html'), 'utf8');
  check(html.includes('id="password-gate"') && html.includes('class="site-footer"') && !html.includes('include:'), 'includes expanded');
  s = makeSite('build-bad-include', { edit: dir => editFile(path.join(dir, 'index.html'), h => h.replace('<!-- include: footer -->', '<!-- include: fooer -->')) });
  check(/partials\/fooer\.html doesn't exist/.test(s.build().output), 'bad include accepted');
});

journey('Build: an event without a time zone, or with a bad key, is refused', async () => {
  let s = makeSite('build-bad-event', { config: config({ EVENTS: [{ key: 'brunch', title: 'Brunch', start: '2099-06-13T11:30' }] }) });
  check(/start must be an ISO time with a UTC offset/.test(s.build().output), 'event without offset accepted');
  s = makeSite('build-bad-event-key', { config: config({ EVENTS: [{ key: 'Sunday Brunch', start: '2099-06-13T11:30:00-04:00' }] }) });
  check(/needs a key like/.test(s.build().output), 'bad key accepted');
});
