#!/usr/bin/env node
/* Google Drive'daki "Casio Collection" tablosundan envanter kurar.
 *
 *   node scripts/import-casio-sheet.mjs casio.csv
 *   node scripts/import-casio-sheet.mjs casio.csv --reset   # örnek veriyi siler
 *
 * Tabloyu CSV olarak dışa aktar (Dosya → İndir → Virgülle ayrılmış değerler).
 *
 * NE ALINIR: model numarası ve satın alma tarihi. Model numarası Casio'da
 * rengi ve varyantı da belirlediği için saatin kimliğini tek başına taşır.
 *
 * NE ALINMAZ — ve neden:
 *   · Fiyat        → depo public olduğu sürece envantere yazılmıyor.
 *   · Solar / Bluetooth / Modül no → tabloda eksik veya kısmen doğru;
 *     bunlar üreticinin verisinden doğrulanarak sonra doldurulacak.
 *   · Görsel URL'leri → hotlink kırılgan; kendi fotoğrafları eklenecek.
 *
 * Betik yeniden çalıştırılabilir: aynı model numarası iki kez eklenmez,
 * var olan kayıtların elle doldurulmuş alanlarına dokunulmaz.
 */

import { readFile, writeFile } from 'node:fs/promises';

const WATCHES = 'data/watches.json';
const WEARS = 'data/wears.json';

/** MODEL hücresindeki seri adları — uzundan kısaya denenir. */
const BRANDS = ['Pro Trek', 'G-Shock', 'Oceanus', 'Edifice', 'Casio'];

function parseCSV(text) {
  const rows = [];
  let row = [], cur = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; } else quoted = false;
      } else cur += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cur); cur = ''; }
    else if (c === '\n') { row.push(cur); rows.push(row); row = []; cur = ''; }
    else if (c !== '\r') cur += c;
  }
  if (cur || row.length) { row.push(cur); rows.push(row); }
  return rows;
}

/** "G-Shock GA-2100-1A1DR" → { brand: 'G-Shock', code: 'GA-2100-1A1DR' } */
function splitModel(cell) {
  const text = cell.trim();
  for (const brand of BRANDS) {
    if (text.toLowerCase().startsWith(brand.toLowerCase() + ' ')) {
      return { brand, code: text.slice(brand.length).trim() };
    }
  }
  return { brand: 'Casio', code: text };
}

/** "21.12.2013" → "2013-12-21" */
function parseDate(cell) {
  const m = String(cell).trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}

/** Takvim hücresine sığan kod: "GA-2100-1A1DR" → "GA2100" */
const shortCodeFor = (code) =>
  code.replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();

const slug = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

function skeleton(id, brand, code, date) {
  return {
    id,
    brand,
    model: code,
    nickname: null,
    shortCode: shortCodeFor(code),
    reference: code,
    year: null,
    category: null,
    status: 'owned',
    specs: {
      movement: { caliber: null, type: null, powerReserve: null, frequency: null, jewels: null, certification: null },
      case: { material: null, diameter: null, thickness: null, lugToLug: null, lugWidth: null, crystal: null, waterResistance: null, bezel: null },
      dial: { color: null, indices: null, lume: null, complications: [] },
      strap: { type: null, material: null, clasp: null },
    },
    acquisition: { date, condition: null, boxPapers: null },
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
    console.error('Kullanım: node scripts/import-casio-sheet.mjs <casio.csv> [--reset]');
    process.exit(1);
  }

  const rows = parseCSV(await readFile(file, 'utf8'));

  // Başlık satırını bul, MODEL ve Buy Date sütunlarının yerini oradan çıkar.
  const headerIndex = rows.findIndex((r) => r.some((c) => c.trim() === 'MODEL'));
  if (headerIndex === -1) throw new Error('Tabloda "MODEL" başlıklı sütun bulunamadı.');
  const header = rows[headerIndex];
  const modelCol = header.findIndex((c) => c.trim() === 'MODEL');
  const dateCol = header.findIndex((c) => c.trim() === 'Buy Date');
  if (dateCol === -1) throw new Error('Tabloda "Buy Date" başlıklı sütun bulunamadı.');

  if (reset) {
    const oldW = JSON.parse(await readFile(WATCHES, 'utf8'));
    const oldR = JSON.parse(await readFile(WEARS, 'utf8'));
    await writeFile(WEARS, '[]\n');
    console.log(`  --reset: ${oldW.length} saat ve ${oldR.length} rotasyon kaydı silindi.\n`);
  }

  const existing = reset ? [] : JSON.parse(await readFile(WATCHES, 'utf8'));
  const ids = new Set(existing.map((w) => w.id));
  const codes = new Set(existing.map((w) => String(w.reference ?? '').toUpperCase()));

  let added = 0, skipped = 0, undated = 0;

  for (const row of rows.slice(headerIndex + 1)) {
    const cell = (row[modelCol] ?? '').trim();
    if (!cell) continue;

    const { brand, code } = splitModel(cell);
    // Kod en az bir rakam içermeli — "Lenti", "CSATek" gibi satıcı satırlarını eler.
    if (!/\d/.test(code)) continue;

    if (codes.has(code.toUpperCase())) {
      console.log(`  zaten var: ${brand} ${code}`);
      skipped++;
      continue;
    }

    const date = parseDate(row[dateCol] ?? '');
    if (!date) {
      console.log(`  ATLANDI:   ${brand} ${code} — satın alma tarihi yok`);
      undated++;
      continue;
    }

    let id = slug(`${brand} ${code}`);
    let n = 2;
    while (ids.has(id)) id = `${slug(`${brand} ${code}`)}-${n++}`;
    ids.add(id);
    codes.add(code.toUpperCase());

    existing.push(skeleton(id, brand, code, date));
    console.log(`  + ${brand.padEnd(9)} ${code.padEnd(18)} ${date}`);
    added++;
  }

  existing.sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'tr'));
  await writeFile(WATCHES, JSON.stringify(existing, null, 2) + '\n');

  console.log(`\n  ${added} saat eklendi` +
    (skipped ? `, ${skipped} zaten kayıtlıydı` : '') +
    (undated ? `, ${undated} tarihsiz atlandı` : '') + '.');
  console.log(`  Toplam: ${existing.length} saat → ${WATCHES}\n`);
}

main().catch((err) => { console.error(err.message); process.exit(1); });
