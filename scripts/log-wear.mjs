#!/usr/bin/env node
/* Terminalden rotasyon kaydı ekle.
 *
 *   node scripts/log-wear.mjs "Speedmaster"              # bugün
 *   node scripts/log-wear.mjs "BB58" 2026-08-20          # belirli gün
 *   node scripts/log-wear.mjs "SKX" dün                  # dün
 *   node scripts/log-wear.mjs "Square" bugün "yağmurlu"  # notlu
 *
 * Saati marka/model/takma ad/referans içinde arar; tek eşleşme bulursa
 * data/wears.json dosyasına yazar. */

import { readFile, writeFile } from 'node:fs/promises';

const WATCHES = 'data/watches.json';
const WEARS = 'data/wears.json';

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function parseDate(token) {
  if (!token) return iso(new Date());
  const t = token.toLowerCase();
  if (t === 'bugün' || t === 'bugun' || t === 'today') return iso(new Date());
  if (t === 'dün' || t === 'dun' || t === 'yesterday') {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return iso(d);
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return token;
  return null;
}

const fold = (s) =>
  String(s ?? '').toLocaleLowerCase('tr')
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');

function findWatch(watches, query) {
  const q = fold(query);
  const hits = watches.filter((w) =>
    [w.id, w.brand, w.model, w.nickname, w.reference].some((f) => fold(f).includes(q)));
  if (hits.length === 1) return hits[0];
  if (hits.length === 0) {
    console.error(`\n  "${query}" ile eşleşen saat yok. Koleksiyondakiler:\n`);
    for (const w of watches) console.error(`    ${w.brand} ${w.model}${w.nickname ? ` (${w.nickname})` : ''}`);
    process.exit(1);
  }
  console.error(`\n  "${query}" birden fazla saatle eşleşti — daha belirgin yaz:\n`);
  for (const w of hits) console.error(`    ${w.brand} ${w.model}${w.nickname ? ` (${w.nickname})` : ''}`);
  process.exit(1);
}

async function main() {
  const [query, dateToken, note] = process.argv.slice(2);
  if (!query) {
    console.error('Kullanım: node scripts/log-wear.mjs "<saat>" [YYYY-MM-DD|bugün|dün] ["not"]');
    process.exit(1);
  }

  const date = parseDate(dateToken);
  if (!date) {
    console.error(`Tarih anlaşılamadı: "${dateToken}". YYYY-MM-DD, "bugün" veya "dün" kullan.`);
    process.exit(1);
  }

  const watches = JSON.parse(await readFile(WATCHES, 'utf8'));
  const wears = JSON.parse(await readFile(WEARS, 'utf8'));
  const watch = findWatch(watches, query);

  const existing = wears.find((w) => w.date === date && w.watchId === watch.id);
  if (existing) {
    if (note) existing.note = note;
    console.log(`  Zaten kayıtlı: ${watch.brand} ${watch.model} — ${date}${note ? ` (not güncellendi)` : ''}`);
  } else {
    wears.push({ date, watchId: watch.id, note: note || '' });
    console.log(`  ✓ ${watch.brand} ${watch.model} → ${date}`);
  }

  wears.sort((a, b) => a.date.localeCompare(b.date) || a.watchId.localeCompare(b.watchId));
  await writeFile(WEARS, JSON.stringify(wears, null, 2) + '\n');
  console.log(`  ${WEARS} güncellendi (${wears.length} kayıt).`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
