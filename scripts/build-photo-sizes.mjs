#!/usr/bin/env node
/* Görsellerin ekran boylarını üretir — üç boy, hepsi bu betikten çıkar.
 *
 *   node scripts/build-photo-sizes.mjs
 *
 *   photos/watches/sm/      600 px  — ızgara kartları, künyedeki küçük kareler
 *   photos/watches/         900 px  — srcset'in üst basamağı, künye kapağı 1-2×
 *   photos/watches/large/  1500 px  — künye kapağı 3×, büyütme
 *
 * KAPAKLAR GERÇEK ÖLÇEKLİ. Her saatin kapağı kasa çapına göre ölçeklenir:
 * mm başına piksel sabit (PX_PER_MM = tuval × K). En büyük kasa (50 mm,
 * DW-6900) tuvalin %72'sini kaplar; 32,5 mm MTP-B185D ona göre küçük kalır.
 * Böylece ızgara gerçek boyut farkını gösterir, kayış uzunluğu ölçeği
 * bozmaz. Çapı olmayan saat (MRS-301) ve yan/arka ek kareler eski
 * çerçevelemeyle (içerik 770/900) üretilir — onlarda en geniş satır kasa
 * değil.
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
const capMax = Math.max(...watches.map((w) => w.specs?.case?.diameter || 0));
const K = 0.72 / capMax;                       // tuvalin oranı / mm

/** kapak yolu → kasa çapı (mm). Ek kareler haritada yok. */
const kapakCapi = new Map(watches.filter((w) => w.photos?.[0] && w.specs?.case?.diameter)
  .map((w) => [w.photos[0], w.specs.case.diameter]));
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
    const mm = kapakCapi.get(webp);
    if (mm) { env.CASE_MM = String(mm); env.PX_PER_MM = String(boy.canvas * K); }

    execFileSync('node', ['scripts/normalize-photo.mjs', asil, out], { env, encoding: 'utf8' });
    n++;
  }
  console.log(`${boy.ad} (${boy.canvas} px): ${n} dosya` + (atla.length ? ` · ${atla.length} atlandı` : ''));
  for (const l of atla) console.log('  ! ' + l);
}
console.log(`ölçek: ${(900 * K).toFixed(2)} px/mm @900 · en büyük kasa ${capMax} mm`);
