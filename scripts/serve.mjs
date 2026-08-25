#!/usr/bin/env node
/* Bağımlılıksız yerel sunucu — siteyi geliştirirken kullan.
 *   node scripts/serve.mjs [port] [klasör]
 * Tarayıcıda dosyayı doğrudan açmak (file://) çalışmaz: JSON dosyaları
 * fetch ile okunduğu için sayfanın bir http:// adresinden gelmesi gerekir. */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';

const port = Number(process.argv[2]) || 8080;
const root = resolve(process.argv[3] || '.');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${port}`);
    let path = decodeURIComponent(url.pathname);
    if (path.endsWith('/')) path += 'index.html';

    // Kök klasörün dışına çıkmayı engelle.
    const filePath = join(root, normalize(path).replace(/^(\.\.[/\\])+/, ''));
    if (!filePath.startsWith(root)) {
      res.writeHead(403).end('Yasak');
      return;
    }

    const info = await stat(filePath);
    const target = info.isDirectory() ? join(filePath, 'index.html') : filePath;
    const body = await readFile(target);

    res.writeHead(200, {
      'Content-Type': TYPES[extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    }).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Bulunamadı');
  }
}).listen(port, () => {
  console.log(`\n  Saat koleksiyonu → http://localhost:${port}\n  Klasör: ${root}\n  Durdurmak için Ctrl+C\n`);
});
