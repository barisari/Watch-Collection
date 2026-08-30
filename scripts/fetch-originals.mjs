#!/usr/bin/env node
/* Üreticinin ürün görsellerinin ASILLARINI indirir → photos/originals/
 *
 *   node scripts/fetch-originals.mjs [--force]
 *
 * Adresler envanterde duruyor: her saatin `source.imageOriginal` alanı.
 * Kaynakları kullanıcının "Casio Collection" tablosundaki CDN sütunu.
 *
 * NEDEN TAHMİN ETMİYORUZ: yol kalıbı modelden modele değişiyor — yerel
 * (`tr/tr`, `jp/ja`, `in/en`, `europe/en-gb`, `ca/en`), klasör harflerinin
 * büyük/küçüklüğü ve dosya adındaki `_Seq01` / `_Seq1` ekleri tutarsız.
 * Kalıbı türetmeye çalışmak 24 modelin ancak 4'ünde tutuyor.
 *
 * DİKKAT — aynı model, yerele göre farklı ÇÖZÜNÜRLÜKTE olabiliyor:
 * GA-2100-1A1 `tr/intl/in/europe` yerellerinde 500×600, `jp` yerelinde
 * 2000×2000. Yeni bir saat eklerken jp'yi de dene.
 *
 * Asıllar depoda saklanır ama `build.mjs` bunları `dist/`e KOPYALAMAZ
 * (SKIP listesi) — Pages yayını şişmesin.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const force = process.argv.includes('--force');
const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));
await mkdir('photos/originals', { recursive: true });

/** photos/watches/x.webp → photos/originals/x.png */
const originalPath = (webp) =>
  webp.replace('photos/watches/', 'photos/originals/').replace(/\.webp$/, '.png');

const done = [], skip = [], fail = [];

for (const w of watches) {
  const url = w.source?.imageOriginal;
  const webp = (w.photos || [])[0];
  if (!url) { skip.push(`${w.reference} · adres yok`); continue; }
  if (!webp) { fail.push(`${w.reference}: envanterde fotoğraf yolu yok`); continue; }

  const out = originalPath(webp);
  if (existsSync(out) && !force) { skip.push(`${w.reference} · zaten var`); continue; }

  try {
    const res = await fetch(url);
    if (!res.ok) { fail.push(`${w.reference}: HTTP ${res.status}`); continue; }
    const buf = Buffer.from(await res.arrayBuffer());
    // Casio bazı yerellerde küçük bir yer tutucu döndürüyor; onu asıl sanmayalım.
    if (buf.length < 100_000) { fail.push(`${w.reference}: dosya şüpheli küçük (${buf.length} B)`); continue; }
    await writeFile(out, buf);
    done.push(`${w.reference} · ${(buf.length / 1024 / 1024).toFixed(1)} MB`);
  } catch (err) {
    fail.push(`${w.reference}: ${err.message}`);
  }
  await new Promise((r) => setTimeout(r, 150));    // CDN'i yormayalım
}

console.log(`indirildi ${done.length} · atlandı ${skip.length} · başarısız ${fail.length}`);
for (const l of done) console.log('  + ' + l);
if (fail.length) {
  console.log('\nBAŞARISIZ:');
  for (const l of fail) console.log('  ! ' + l);
  process.exit(1);
}
