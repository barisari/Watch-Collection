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

/** Serinin resmi sayfasının hangi yerelde durduğu. Oceanus yalnızca Japonya'da. */
const LOCALE = { Oceanus: 'jp' };
const URL_PATH = {
  'Casio': 'casio', 'G-Shock': 'gshock', 'Edifice': 'edifice',
  'Pro Trek': 'protrek', 'Oceanus': 'oceanus',
};

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

/**
 * Casio model kodu üç katmanlıdır:  A1100D  -1  DF
 *                                   model   renk  pazar
 * Casio kendi ürün sayfalarında pazar sonekini atar (A1100D-1). Bu yüzden
 * "model + renk" saatin ürün kimliği, tam kod ise senin aldığın haliyle
 * referansı olur — ve model alanı doğrudan resmi sayfanın adresini verir.
 *
 * Renk kodu: rakam + isteğe bağlı harf + isteğe bağlı rakam (1, 1A, 1A1, 2A2).
 * Kalan harfler pazar sonekidir (DF, DR, ER, JF, JR, VDF, UDF, AVDF, Z…).
 *
 * Sınır her zaman kesin değil: "5AVDF" → 5A+VDF mi, 5AV+DF mi? Bu yüzden
 * ikinci bir aday da üretiliyor; hangisinin gerçek olduğu resmi sayfa
 * çekilirken (200 mü 404 mü) belirlenir.
 */
/* Pazar sonekleri. A ile BAŞLAYAN biçimler (AUDF, AVDF…) bilinçli olarak yok:
 * oradaki A her zaman renk kodunun parçasıdır (…-3A + UDF), sonekin değil.
 * Bunu EFS-S570D-3AUDF'de doğruladım — resmi sayfa EFS-S570D-3A. */
const MARKET_SUFFIXES = [
  'VUDF', 'VUDR', 'VDF', 'VDR', 'UDF', 'UDR',
  'DF', 'DR', 'ER', 'EF', 'JF', 'JR', 'Z',
];

/** Renk kodu bir rakamla başlar, en fazla bir harf ve bir rakam daha alır. */
const looksLikeColour = (model) => /-\d[A-Z]?\d?$/.test(model);

/**
 * Olası "model + renk" adaylarını en olasıdan en az olasıya döndürür.
 * Hangisinin gerçek olduğu resmi sayfa çekilirken belli olur (200 mü 404 mü).
 */
export function splitModelRef(fullCode) {
  const candidates = MARKET_SUFFIXES
    .filter((s) => fullCode.endsWith(s))
    .map((s) => fullCode.slice(0, -s.length))
    .filter(looksLikeColour)
    .sort((a, b) => a.length - b.length);   // kısa = uzun sonek = daha olası

  const unique = [...new Set(candidates)];
  return {
    model: unique[0] ?? fullCode,
    candidates: unique.length ? unique : [fullCode],
  };
}

/** Resmi ürün sayfasının adresi. */
export const productUrl = (brand, model) =>
  `https://www.casio.com/${LOCALE[brand] ?? 'intl'}/watches/${URL_PATH[brand]}/product.${model}/`;

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

/* Teknik değerler üreticinin yazdığı haliyle (İngilizce) saklanır; ekranda
 * terim sözlüğüyle çevrilir. Böylece yeni bir dil eklemek sözlüğe sütun
 * eklemek olur, 24 kaydı yeniden doldurmak değil. Serbest metinler (hikâye,
 * slogan) gerçekten iki ayrı metin olduğu için dile göre anahtarlanır. */
function skeleton(id, brand, code, date) {
  const { model } = splitModelRef(code);
  return {
    id,
    brand,
    model,                       // ürün kimliği — casio.com'daki hali
    reference: code,             // satın alındığı haliyle tam kod (pazar soneki dahil)
    nickname: null,
    shortCode: shortCodeFor(model),
    year: null,
    category: null,
    status: 'owned',
    specs: {
      movement: {
        caliber: null,           // Casio modül numarası
        type: null,              // quartz | solar | automatic | manual
        battery: null,           // CR1616
        batteryLife: null,       // "Approx. 3 years"
        accuracy: null,          // "±30 seconds per month"
        radioControlled: null,   // "Multi-Band 6"
        bluetooth: null,
        powerReserve: null, frequency: null, jewels: null, certification: null,
      },
      case: {
        material: null, bezelMaterial: null,
        diameter: null, thickness: null, lugToLug: null, lugWidth: null,
        weight: null,            // gram
        crystal: null,           // Mineral | Sapphire
        crystalCoating: null,    // "Anti-reflective"
        crystalShape: null,      // Flat | Curved
        waterResistance: null,   // metre
        bezel: null,
        backlight: null,         // "LED (yellow)"
      },
      dial: {
        color: null,
        display: null,           // digital | analog | ana-digi
        indices: null, lume: null, complications: [],
      },
      strap: {
        type: null, material: null, color: null, clasp: null,
        sizeRange: null,         // "150–205 mm"
      },
    },
    tagline: { en: null, tr: null },
    story: { en: null, tr: null },
    source: { productUrl: null, fetchedAt: null },
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

// Yalnızca doğrudan çalıştırıldığında içe aktar; başka betikler
// splitModelRef / productUrl için bu dosyayı modül olarak kullanabilsin.
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}
