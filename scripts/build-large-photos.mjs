#!/usr/bin/env node
/* Büyütmede açılan 1500 px sürümleri üretir → photos/watches/large/
 *
 *   node scripts/build-large-photos.mjs
 *
 * NEDEN İKİ BOY: galeri karesi 90-130 CSS px, 3× ekranda bile 900'lük dosya
 * fazlasıyla yetiyor. Ama kapak panelde ~400 px görünüyor, 3× ekran 1200
 * istiyor — orada 900 yetmiyor. O yüzden 900'ler thumb olarak KALIR, büyükler
 * ayrı klasörde durur ve yalnızca kapakta + büyütmede yüklenir.
 *
 * NO_ENLARGE=1 ile çalıştırılır: kaynağı 1284 piksellik içeriği taşımayan
 * dosyalar (üreticinin 1080'lik ek kareleri) büyütülmez, gerçek boyunda kalır.
 * Sahte ayrıntı üretmiyoruz.
 *
 * MOD SEÇİMİ: aslı .png ise zaten saydam zeminli → betik kesimi kendiliğinden
 * atlar. Yalnızca .jpg olan aslılarda CUTOUT=off verilir; kullanıcının kararı
 * gereği fon HİÇ kesilmiyor.
 */
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';

const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));
const hedefler = [...new Set(watches.flatMap((w) => w.photos || []))];

const done = [], atla = [];
for (const webp of hedefler) {
  const ad = basename(webp, '.webp');
  const png = `photos/originals/${ad}.png`, jpg = `photos/originals/${ad}.jpg`;
  const asil = existsSync(png) ? png : existsSync(jpg) ? jpg : null;
  if (!asil) { atla.push(`${webp} · aslı yok`); continue; }

  const out = webp.replace('photos/watches/', 'photos/watches/large/');
  await mkdir(dirname(out), { recursive: true });
  const env = { ...process.env, CANVAS: '1500', NO_ENLARGE: '1' };
  if (asil.endsWith('.jpg')) env.CUTOUT = 'off';

  const log = execFileSync('node', ['scripts/normalize-photo.mjs', asil, out], { env, encoding: 'utf8' });
  done.push(log.trim().split('\n').at(-1).replace('yazıldı: ', ''));
}

console.log(`${done.length} büyük sürüm üretildi` + (atla.length ? ` · ${atla.length} atlandı` : ''));
for (const l of done) console.log('  ' + l);
for (const l of atla) console.log('  ! ' + l);
