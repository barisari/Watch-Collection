#!/usr/bin/env node
/* Tarihsel döviz kurlarını indirir → data/fx-rates.json
 *
 *   node scripts/fetch-rates.mjs
 *
 * NEDEN TABLO: site statik, çalışırken dışarı istek atmıyor. Gereken kurlar
 * burada bir kez indirilip depoya yazılıyor; site onları okuyor.
 *
 * NEDEN TARİHSEL: 2013'teki ₺350 ile bugünkü ₺350 aynı şey değil. Bir tutarı
 * anlamlı biçimde çevirmek için o günün kuru gerekir — bugünkü kur değil.
 *
 * Kaynak: frankfurter.dev (Avrupa Merkez Bankası referans kurları).
 * ECB hafta içi yayımlar; hafta sonu/tatil için en yakın iş günü döner ve
 * dönen tarih tabloda ayrıca saklanır, hangi günün kuru kullanıldığı belli olsun.
 */

import { readFile, writeFile } from 'node:fs/promises';

const OUT = 'data/fx-rates.json';
const BASE = 'EUR';
const SYMBOLS = ['USD', 'JPY', 'TRY', 'GBP'];
const API = 'https://api.frankfurter.dev/v1';

/** "2019-08" → "2019-08-15" (ay ortası) · "2023" → "2023-06-15" */
function normaliseDate(value) {
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^\d{4}-\d{2}$/.test(s)) return `${s}-15`;
  if (/^\d{4}$/.test(s)) return `${s}-06-15`;
  return null;
}

/** Envanterde kuru gerekecek bütün tarihleri toplar. */
function neededDates(watches) {
  const set = new Set();
  for (const w of watches) {
    for (const v of [w.releaseDate, w.acquisition?.date]) {
      const d = normaliseDate(v);
      if (d) set.add(d);
    }
  }
  return [...set].sort();
}

async function fetchOne(date) {
  const url = `${API}/${date}?base=${BASE}&symbols=${SYMBOLS.join(',')}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${date}: HTTP ${res.status}`);
  const json = await res.json();
  if (!json.rates) throw new Error(`${date}: kur alanı yok`);
  return { asOf: json.date, rates: json.rates };
}

async function main() {
  const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));

  let existing = {};
  try { existing = JSON.parse(await readFile(OUT, 'utf8')).rates ?? {}; } catch {}

  const dates = neededDates(watches);
  const missing = dates.filter((d) => !existing[d]);

  console.log(`  ${dates.length} tarih gerekiyor, ${missing.length} tanesi eksik.`);

  const rates = { ...existing };
  let ok = 0, failed = [];
  for (const date of missing) {
    try {
      const r = await fetchOne(date);
      rates[date] = r;
      ok++;
      process.stdout.write(`  ${date} → ${r.asOf} kuru  (1 EUR = ${r.rates.TRY?.toFixed(2) ?? '—'} TRY)\n`);
    } catch (err) {
      failed.push(`${date}: ${err.message}`);
    }
    // ECB'nin sunucusunu yormayalım
    await new Promise((r) => setTimeout(r, 120));
  }

  const sorted = Object.fromEntries(Object.keys(rates).sort().map((k) => [k, rates[k]]));
  await writeFile(OUT, JSON.stringify({
    base: BASE,
    source: 'European Central Bank via frankfurter.dev',
    updatedAt: new Date().toISOString().slice(0, 10),
    rates: sorted,
  }, null, 2) + '\n');

  console.log(`\n  ${ok} kur eklendi, tabloda toplam ${Object.keys(sorted).length} tarih → ${OUT}`);
  if (failed.length) console.warn(`  alınamayan:\n    ${failed.join('\n    ')}`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
