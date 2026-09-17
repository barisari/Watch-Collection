#!/usr/bin/env node
/* Görsellerin ekran boylarını üretir — üç boy, hepsi bu betikten çıkar.
 *
 *   node scripts/build-photo-sizes.mjs
 *
 *   photos/watches/sm/      600 px  — ızgara kartları, künyedeki küçük kareler
 *   photos/watches/         900 px  — srcset'in üst basamağı, künye kapağı 1-2×
 *   photos/watches/large/  1500 px  — künye kapağı 3×, büyütme
 *
 * Çerçeveleme: içerik 770/900 kutusuna sığdırılır, tuvale ortalanır. (Kasa
 * çapına göre "gerçek ölçekli" üretim denendi ve kullanıcı reddetti — vitrin
 * için saçma buldu. Tekrar deneme.)
 *
 * NO_ENLARGE=1: kaynağı yetmeyen dosya büyütülmez. CUTOUT=off yalnızca .jpg
 * aslılarda — fon hiç kesilmiyor, kullanıcının kararı.
 */
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';

const BOYLAR = [
  { ad: 'sm', canvas: 600, klasor: 'photos/watches/sm/' },
  { ad: 'base', canvas: 900, klasor: 'photos/watches/' },
  { ad: 'large', canvas: 1500, klasor: 'photos/watches/large/' },
];

const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));
const hedefler = [...new Set(watches.flatMap((w) => w.photos || []))];

for (const boy of BOYLAR) {
  const atla = [];
  let n = 0;
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
    n++;
  }
  console.log(`${boy.ad} (${boy.canvas} px): ${n} dosya` + (atla.length ? ` · ${atla.length} atlandı` : ''));
  for (const l of atla) console.log('  ! ' + l);
}
