#!/usr/bin/env node
// npm test — runs every journey in tests/*.test.js against throwaway copies
// of the template (in test-results/, gitignored). Needs, once:
//   npm install && npx playwright install chromium
// Run one file or filter by name:  node tests/run.js rsvp   (matches journey names)
'use strict';
const fs = require('fs');
const path = require('path');
const lib = require('./lib');

(async () => {
  const filter = (process.argv[2] || '').toLowerCase();
  for (const f of fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort()) require(path.join(__dirname, f));
  const list = lib.tests.filter(t => !filter || t.name.toLowerCase().includes(filter));
  let failed = 0;
  const started = Date.now();
  for (const t of list) {
    const t0 = Date.now();
    try {
      await t.fn();
      console.log(`  ✓ ${t.name} (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    } catch (e) {
      failed++;
      console.log(`  ✗ ${t.name}\n      ${String(e && e.message || e).split('\n').join('\n      ')}`);
    }
  }
  await lib.closeBrowser();
  console.log(`\n${list.length - failed}/${list.length} journeys passed in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  process.exit(failed ? 1 : 0);
})();
