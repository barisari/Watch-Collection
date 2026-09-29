#!/usr/bin/env node
/* Görsellerin ekran boylarını üretir — üç boy, hepsi bu betikten çıkar.
 *
 *   node scripts/build-photo-sizes.mjs            # kapaklar + ek kareler
 *   node scripts/build-photo-sizes.mjs --ekler    # yalnızca ek kareler
 *
 *   photos/watches/sm/      600 px  — ızgara kartları, künyedeki küçük kareler
 *   photos/watches/         900 px  — srcset'in üst basamağı, künye kapağı 1-2×
 *   photos/watches/large/  1500 px  — künye kapağı 3×, büyütme
 *
 * KAPAK (her saatin ilk görseli): içerik 770/900 kutusuna sığdırılır, tuvale
 * ortalanır — ızgarada hepsi aynı boyda dursun diye. (Kasa çapına göre "gerçek
 * ölçekli" üretim denendi ve kullanıcı reddetti — vitrin için saçma buldu.
 * Tekrar deneme.) CUTOUT=off yalnızca .jpg aslılarda — fon hiç kesilmiyor.
 *
 * EK KARE (ikinci ve sonrası): üreticinin kadrajıyla kalır — kırpma, küçültüp
 * pay ekleme, fon kesme YOK, yalnızca boyutlandırma. Kullanıcının kararı
 * (29 Eylül 2026): kapak kuralı ek karelere de uygulanıyordu; Casio'da kayış
 * kenara dayanırken bizde karenin dört yanında boşluk kalıyordu.
 *
 * İSTİSNA — kapak gibi çerçevelenen ek kareler (ESKI_CERCEVE): kaynağın
 * kendisi büyük saydam boşluk taşıyorsa (Seiko'nun 1231×1968 tuvali, saat
 * ~%50) olduğu gibi bırakınca saat karede küçülüyor. Kullanıcı SNE529 için
 * eski hâli seçti (29 Eylül): "Eski hali en güzeli duruyor bu saat için."
 *
 * İki yolda da kaynağı yetmeyen dosya büyütülmez (NO_ENLARGE).
 */
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname } from 'node:path';
import sharp from 'sharp';

const BOYLAR = [
  { ad: 'sm', canvas: 600, klasor: 'photos/watches/sm/' },
  { ad: 'base', canvas: 900, klasor: 'photos/watches/' },
  { ad: 'large', canvas: 1500, klasor: 'photos/watches/large/' },
];

const ESKI_CERCEVE = new Set(['seiko_sne529p-2', 'seiko_sne529p-3']);

const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));
const kapaklar = new Set(watches.map((w) => (w.photos || [])[0]).filter(Boolean));
const yalnizEkler = process.argv.includes('--ekler');
const hedefler = [...new Set(watches.flatMap((w) => w.photos || []))]
  .filter((p) => !yalnizEkler || !kapaklar.has(p));

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
    if (kapaklar.has(webp) || ESKI_CERCEVE.has(ad)) {
      const env = { ...process.env, CANVAS: String(boy.canvas), NO_ENLARGE: '1' };
      if (asil.endsWith('.jpg')) env.CUTOUT = 'off';
      execFileSync('node', ['scripts/normalize-photo.mjs', asil, out], { env, encoding: 'utf8' });
    } else {
      await sharp(asil)
        .resize(boy.canvas, boy.canvas, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 90 }).toFile(out);
    }
    n++;
  }
  console.log(`${boy.ad} (${boy.canvas} px): ${n} dosya` + (atla.length ? ` · ${atla.length} atlandı` : ''));
  for (const l of atla) console.log('  ! ' + l);
}
