/**
 * Generate a simple monogram favicon — a colored circle with initials.
 *
 * Usage:
 *   node setup/generate-favicon.js "A+B"              circle in the theme's --primary-dark
 *   node setup/generate-favicon.js "A+B" "#2e3a55"    or any color you like
 *
 * Writes favicon.svg in the project root, overwriting the existing one.
 * Escape & as &amp; if you use it ("A&amp;B").
 */
const fs = require('fs');
const path = require('path');

// The active palette's --primary-dark from css/theme.css (comments removed,
// so the commented-out palettes don't count).
function themeColor() {
  const css = fs.readFileSync(path.join(__dirname, '..', 'css', 'theme.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const m = css.match(/--primary-dark:\s*(#[0-9a-fA-F]{3,8})/);
  return m ? m[1] : '#333333';
}

const initials = process.argv[2] || 'A+B';
const bgColor  = process.argv[3] || themeColor();

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="16" fill="${bgColor}"/>
  <text x="16" y="21" font-family="Georgia, serif" font-size="11" font-weight="bold"
        fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${initials}</text>
</svg>
`;

const outPath = path.join(__dirname, '..', 'favicon.svg');
fs.writeFileSync(outPath, svg);
console.log(`Wrote ${outPath} with initials "${initials}" on ${bgColor}`);
