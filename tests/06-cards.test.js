// Printed things: invitations, a livestream card, a blank card and a sign.
'use strict';
const fs = require('fs');
const { spawnSync } = require('child_process');
const { journey, check, makeSite, config } = require('./lib');

function render(site, args) {
  const r = spawnSync(process.execPath, ['setup/cards/render.js', ...args], { cwd: site.dir, encoding: 'utf8',
    env: Object.assign({}, process.env, { NODE_PATH: require('path').join(__dirname, '..', 'node_modules') }) });
  return { ok: r.status === 0, output: (r.stdout || '') + (r.stderr || '') };
}
const pngSize = f => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };
const pdfInches = f => {
  const m = fs.readFileSync(f, 'latin1').match(/\/MediaBox\s*\[\s*0 0 ([\d.]+) ([\d.]+)\s*\]/);
  return m && { w: Math.round(+m[1] / 72 * 10) / 10, h: Math.round(+m[2] / 72 * 10) / 10 };
};

journey('Couple makes invitations, a livestream card, a spare and a sign (setup/cards)', async () => {
  const site = makeSite('cards', {
    config: config({ SITE_URL: 'https://example.com' }),
    guests: `const GUEST_LIST = [
      { name: "Jane Smith and Guest", max: 2 },
      { name: "Alex Johnson", max: 1, displayName: "Mr. Alexander Johnson-Whitfield of a Very Long Family Name" },
      { name: "Kim Remote", max: 2 } ];\n`,
  });
  let r = render(site, ['invites']);
  check(r.ok, r.output);
  for (const n of ['Jane Smith and Guest', 'Alex Johnson', 'Kim Remote']) {
    const s = pngSize(site.file(`invite-cards/${n}.png`));
    check(s.w === 1440 && s.h === 2016, `${n}: ${s.w}x${s.h}, expected a 5x7in card at 3x`);
  }
  r = render(site, ['invites', '--only', 'Kim Remote', '--qr', 'https://example.com/live.html', '--out', 'invite-cards/livestream']);
  check(r.ok && fs.existsSync(site.file('invite-cards/livestream/Kim Remote.png')), r.output);
  check(!render(site, ['invites', '--only', 'Not A Guest']).ok, 'unknown name accepted');
  r = render(site, ['blank', '--pdf']);
  check(r.ok, r.output);
  check(JSON.stringify(pdfInches(site.file('invite-cards/_blank.pdf'))) === '{"w":5,"h":7}', 'blank card is 5x7in');
  r = render(site, ['page', 'setup/cards/sign.html', '--qr', 'https://example.com/photos', '--out', 'print/sign.pdf']);
  check(r.ok, r.output);
  check(JSON.stringify(pdfInches(site.file('print/sign.pdf'))) === '{"w":18,"h":24}', 'sign is 18x24in');
});
