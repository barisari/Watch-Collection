#!/usr/bin/env node
/* Listeden toplu saat ekleme — envanteri parça parça kurarken kullan.
 *
 *   node scripts/add-watches.mjs liste.txt
 *   node scripts/add-watches.mjs liste.txt --reset   # örnek veriyi silip sıfırdan kur
 *
 * --reset hem envanteri hem rotasyon günlüğünü boşaltır. İkisi birlikte
 * sıfırlanmalı: günlük kayıtları saat kimliklerine bağlı olduğu için yalnızca
 * envanteri silmek geride sahipsiz kayıtlar bırakır.
 *
 * Dosya biçimi — her satır bir saat, alanlar | ile ayrılır:
 *
 *   Marka | Model | referans | satın alma tarihi | takma ad
 *
 * Sadece ilk ikisi zorunlu. Sonraki alanları boş bırakabilir ya da hiç
 * yazmayabilirsin; teknik özellikleri sonra doldurursun.
 *
 *   Omega  | Speedmaster Professional | 310.30.42.50.01.001 | 2022-04-12 | Moonwatch
 *   Tudor  | Black Bay Fifty-Eight    | 79030N
 *   Seiko  | SKX007
 *
 * # ile başlayan satırlar ve boş satırlar atlanır.
 * Aynı marka+model zaten varsa üzerine yazılmaz, atlanır — listeyi tekrar
 * çalıştırman güvenlidir.
 */

import { readFile, writeFile } from 'node:fs/promises';

const WATCHES = 'data/watches.json';
const WEARS = 'data/wears.json';

const slug = (s) =>
  String(s ?? '').toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

function makeId(existing, brand, model, reference) {
  const base = slug([brand, model, reference].filter(Boolean).join(' ')).slice(0, 60) || 'saat';
  let id = base;
  let n = 2;
  while (existing.has(id)) id = `${base}-${n++}`;
  return id;
}

/** Takvim hücresine sığan kısa ad üretir (≤6 karakter). */
function shortCodeFor(nickname, model) {
  const base = nickname || model || '';
  if (base.length <= 6) return base;
  const first = base.split(/\s+/)[0];
  return first.length <= 6 ? first : first.slice(0, 6);
}

function parseLine(line, lineNo) {
  const parts = line.split('|').map((s) => s.trim());
  const [brand, model, reference, date, nickname] = parts;

  if (!brand || !model) {
    console.warn(`  atlandı (satır ${lineNo}): marka ve model gerekli → "${line}"`);
    return null;
  }
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    console.warn(`  uyarı (satır ${lineNo}): "${date}" YYYY-AA-GG değil, tarih boş bırakıldı.`);
  }

  return {
    brand,
    model,
    nickname: nickname || null,
    reference: reference || null,
    date: /^\d{4}-\d{2}-\d{2}$/.test(date || '') ? date : null,
  };
}

/** Boş bir iskelet kayıt — alanları sonra doldurulur. */
function skeleton(id, p) {
  return {
    id,
    brand: p.brand,
    model: p.model,
    nickname: p.nickname,
    shortCode: shortCodeFor(p.nickname, p.model),
    reference: p.reference,
    year: null,
    category: null,
    status: 'owned',
    specs: {
      movement: { caliber: null, type: null, powerReserve: null, frequency: null, jewels: null, certification: null },
      case: { material: null, diameter: null, thickness: null, lugToLug: null, lugWidth: null, crystal: null, waterResistance: null, bezel: null },
      dial: { color: null, indices: null, lume: null, complications: [] },
      strap: { type: null, material: null, clasp: null },
    },
    acquisition: { date: p.date, condition: null, boxPapers: null },
    service: { lastServiceDate: null, intervalYears: null },
    photos: [],
    tags: [],
    notes: null,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const reset = args.includes('--reset');
  const file = args.find((a) => !a.startsWith('--'));

  if (!file) {
    console.error('Kullanım: node scripts/add-watches.mjs <liste.txt> [--reset]');
    process.exit(1);
  }

  const lines = (await readFile(file, 'utf8')).split('\n');

  if (reset) {
    const oldWatches = JSON.parse(await readFile(WATCHES, 'utf8'));
    const oldWears = JSON.parse(await readFile(WEARS, 'utf8'));
    await writeFile(WEARS, '[]\n');
    console.log(`  --reset: ${oldWatches.length} saat ve ${oldWears.length} rotasyon kaydı silindi.\n`);
  }

  const existing = reset ? [] : JSON.parse(await readFile(WATCHES, 'utf8'));
  const ids = new Set(existing.map((w) => w.id));
  const seen = new Set(existing.map((w) => `${slug(w.brand)}|${slug(w.model)}`));

  let added = 0;
  let skipped = 0;

  lines.forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;

    const p = parseLine(line, i + 1);
    if (!p) return;

    const key = `${slug(p.brand)}|${slug(p.model)}`;
    if (seen.has(key)) {
      console.log(`  zaten var: ${p.brand} ${p.model}`);
      skipped++;
      return;
    }

    const id = makeId(ids, p.brand, p.model, p.reference);
    ids.add(id);
    seen.add(key);
    existing.push(skeleton(id, p));
    console.log(`  + ${p.brand} ${p.model}${p.reference ? ` (${p.reference})` : ''} → ${id}`);
    added++;
  });

  existing.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'tr'));
  await writeFile(WATCHES, JSON.stringify(existing, null, 2) + '\n');

  console.log(`\n  ${added} saat eklendi${skipped ? `, ${skipped} zaten kayıtlıydı` : ''}.`);
  console.log(`  Toplam: ${existing.length} saat → ${WATCHES}\n`);
  console.log('  Sonraki adım: node scripts/validate-data.mjs');
}

main().catch((err) => { console.error(err.message); process.exit(1); });
