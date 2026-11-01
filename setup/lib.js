// Shared by setup/build.js: reading js/config.js, or the SITE_CONFIG_JS secret.
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

module.exports = { ROOT, fail, readSource, loadConfig };
