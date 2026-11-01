// The build is the safety net: these are the mistakes it must refuse.
'use strict';
const fs = require('fs');
const path = require('path');
const { journey, check, makeSite, config, PASSWORD, editFile } = require('./lib');

function allPublished(dir) {
  const out = [];
  (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : out.push(p); } })(path.join(dir, '_site'));
  return out;
}

journey('Build: published files hold no invitation code and no private files', async () => {
  const site = makeSite('build-clean');
  const r = site.build();
  check(r.ok, r.output);
  const files = allPublished(site.dir);
  const text = files.filter(f => /\.(html|js|css|txt)$/.test(f)).map(f => fs.readFileSync(f, 'utf8')).join('\n');
  check(!text.includes(PASSWORD), 'code published');
  check(!files.some(f => /setup|tests|examples|\.md$|guests\.csv|package/.test(path.relative(site.dir, f))), 'non-site files published');
  check(!fs.existsSync(site.file('_site/js/guests.js')), 'guest list file published');
});

journey('Build: refuses the example code and a code baked into a link', async () => {
  let s = makeSite('build-example-pw', { config: config({ SITE_PASSWORD: 'ChangeMe123' }) });
  check(!s.build().ok, 'example code accepted');
  s = makeSite('build-pw-link', { edit: dir => fs.writeFileSync(path.join(dir, 'live.html'), `<a href="live.html?pw=${encodeURIComponent(PASSWORD)}">x</a>`) });
  check(/password appears in live.html/.test(s.build().output), 'code in link accepted');
});

journey('Build: a section with id="rsvp", or a gate with no code, is refused', async () => {
  let s = makeSite('build-rsvp-id', { edit: dir => {
    editFile(path.join(dir, 'rsvp.html'), h => h.replace('id="rsvp-coming"', 'id="rsvp"'));
  } });
  const refused = s.build();
  check(!refused.ok && /id="rsvp"/.test(refused.output), 'section with id="rsvp" accepted');
  check(!/guests\.js/.test(refused.output), 'error tells someone to add js/guests.js');
  s = makeSite('build-gate-no-code', { config: config({ SITE_PASSWORD: undefined }) });
  check(/password\s+gate/.test(s.build().output), 'gate without code accepted');
});

journey('Build: CI path reads SITE_CONFIG_JS, not files; default PBKDF2 strength', async () => {
  const s = makeSite('build-ci', { config: '// placeholder' });
  const { spawnSync } = require('child_process');
  const r = spawnSync(process.execPath, ['setup/build.js'], { cwd: s.dir, encoding: 'utf8', env: Object.assign({}, process.env, {
    SITE_CONFIG_JS: config({ AUTH_ITERATIONS: undefined }) }) });
  check(r.status === 0, r.stdout + r.stderr);
  const cfg = fs.readFileSync(s.file('_site/js/config.js'), 'utf8');
  check(/"iterations": 310000/.test(cfg), 'default iterations');
  check(!fs.existsSync(s.file('_site/js/guests.js')), 'guest list file published from the environment');
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
