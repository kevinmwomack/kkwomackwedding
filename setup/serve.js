#!/usr/bin/env node
// Preview the built site:  node setup/serve.js [folder] [port]
// (npm start builds _site/ and runs this on port 3000). No dependencies, so
// it works offline. The tests use the same server on a random port.
'use strict';
const fs   = require('fs');
const http = require('http');
const path = require('path');

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.ics': 'text/calendar', '.txt': 'text/plain', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.mp4': 'video/mp4' };

function serve(dir, port = 0) {
  dir = path.resolve(dir);
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const f = path.join(dir, p);
      if (!f.startsWith(dir) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    server.on('error', reject);
    server.listen(port, () => resolve({ url: `http://localhost:${server.address().port}/`, close: () => server.close() }));
  });
}

if (require.main === module) {
  const dir  = process.argv[2] || path.join(__dirname, '..', '_site');
  const port = Number(process.argv[3]) || 3000;
  if (!fs.existsSync(dir)) { console.error(`${dir} doesn't exist yet: run  npm run build  first.`); process.exit(1); }
  serve(dir, port)
    .then(s => console.log(`Serving ${path.relative(process.cwd(), dir) || '.'} at ${s.url}  (Ctrl+C to stop)`))
    .catch(e => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is busy: try  node setup/serve.js _site 3001` : e.message); process.exit(1); });
}

module.exports = { serve };
