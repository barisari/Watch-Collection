#!/usr/bin/env node
/* Görsellerin ekran boylarını üretir.
 *
 *   node scripts/build-photo-sizes.mjs
 *
 * ÜÇ BOY, her biri ölçülmüş bir ihtiyaca karşılık geliyor:
 *
 *   photos/watches/sm/      600 px  — ızgara kartları ve künyedeki küçük kareler
 *   photos/watches/         900 px  — srcset'in üst basamağı (3× telefon)
 *   photos/watches/large/  1500 px  — künye kapağı ve büyütme
 *
 * NEDEN sm EKLENDİ: ızgara kartı ekranda 268-333 px görünüyor, yani 2× ekranda
 * 536-666 px gerekiyor. Tek başına 900 px yollamak 28 kart için 1,63 MB demekti.
 * 600 px'lik basamak bunu yarıya indiriyor; 3× telefon yine 900'ü seçiyor.
 * Künyedeki küçük kareler 90-130 px görünüyor, orada 600 fazlasıyla yetiyor.
 *
 * NO_ENLARGE=1 ile çalışır: kaynağı hedefi taşımayan dosya büyütülmez, gerçek
 * boyunda kalır (üreticinin 1080 px'lik ek kareleri böyle). Sahte ayrıntı yok.
 *
 * MOD: aslı .png ise zaten saydam zeminli, betik kesimi kendiliğinden atlar.
 * Yalnızca .jpg aslılarda CUTOUT=off verilir — kullanıcının kararı gereği fon
 * hiç kesilmiyor.
 */
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';

const BOYLAR = [
  { ad: 'sm', canvas: 600, klasor: 'photos/watches/sm/' },
  { ad: 'large', canvas: 1500, klasor: 'photos/watches/large/' },
];

const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));
const hedefler = [...new Set(watches.flatMap((w) => w.photos || []))];

for (const boy of BOYLAR) {
  const done = [], atla = [];
  for (const webp of hedefler) {
    const ad = basename(webp, '.webp');
    const png = `photos/originals/${ad}.png`, jpg = `photos/originals/${ad}.jpg`;
    const asil = existsSync(png) ? png : existsSync(jpg) ? jpg : null;
    if (!asil) { atla.push(`${webp} · aslı yok`); continue; }

    const out = webp.replace('photos/watches/', boy.klasor);
    await mkdir(dirname(out), { recursive: true });
    const env = { ...process.env, CANVAS: String(boy.canvas), NO_ENLARGE: '1' };
    if (asil.endsWith('.jpg')) env.CUTOUT = 'off';

    execFileSync('node', ['scripts/normalize-photo.mjs', asil, out], { env, encoding: 'utf8' });
    done.push(out);
  }
  console.log(`${boy.ad} (${boy.canvas}px): ${done.length} dosya` + (atla.length ? ` · ${atla.length} atlandı` : ''));
  for (const l of atla) console.log('  ! ' + l);
}
