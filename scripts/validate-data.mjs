#!/usr/bin/env node
/* Veri doğrulama — commit etmeden önce çalıştır.
 *   node scripts/validate-data.mjs
 * Hata bulursa 1 ile çıkar; böylece CI'da da kullanılabilir. */

import { readFile } from 'node:fs/promises';

const errors = [];
const warnings = [];

const isISODate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(s));

async function readJSON(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch (err) {
    errors.push(`${path} okunamadı veya geçerli JSON değil: ${err.message}`);
    return null;
  }
}

function checkWatches(watches) {
  if (!Array.isArray(watches)) {
    errors.push('data/watches.json bir dizi (array) olmalı.');
    return new Set();
  }

  const ids = new Set();
  watches.forEach((w, i) => {
    const at = `watches[${i}]${w?.id ? ` (${w.id})` : ''}`;

    if (!w || typeof w !== 'object') { errors.push(`${at}: nesne değil.`); return; }
    if (!w.id) errors.push(`${at}: "id" zorunlu.`);
    else if (ids.has(w.id)) errors.push(`${at}: "${w.id}" kimliği tekrar ediyor.`);
    else ids.add(w.id);

    if (!w.brand) errors.push(`${at}: "brand" zorunlu.`);
    if (!w.model) errors.push(`${at}: "model" zorunlu.`);

    const status = w.status ?? 'owned';
    if (!['owned', 'sold', 'wishlist'].includes(status)) {
      errors.push(`${at}: status "${status}" geçersiz (owned | sold | wishlist).`);
    }

    const d = w.acquisition?.date;
    if (d && !isISODate(d)) errors.push(`${at}: acquisition.date "${d}" YYYY-MM-DD olmalı.`);

    const s = w.service?.lastServiceDate;
    if (s && !isISODate(s)) errors.push(`${at}: service.lastServiceDate "${s}" YYYY-MM-DD olmalı.`);

    const price = w.acquisition?.price;
    if (price && (typeof price.amount !== 'number' || !price.currency)) {
      errors.push(`${at}: acquisition.price hem sayısal "amount" hem "currency" istiyor.`);
    }

    if (w.shortCode && String(w.shortCode).length > 6) {
      warnings.push(`${at}: shortCode "${w.shortCode}" 6 karakterden uzun — takvim hücresinde kırpılabilir.`);
    }

    if (w.photos && !Array.isArray(w.photos)) errors.push(`${at}: photos bir dizi olmalı.`);
    if (w.tags && !Array.isArray(w.tags)) errors.push(`${at}: tags bir dizi olmalı.`);

    const dia = w.specs?.case?.diameter;
    if (dia != null && (typeof dia !== 'number' || dia < 15 || dia > 70)) {
      warnings.push(`${at}: kasa çapı ${dia} mm — beklenmedik bir değer.`);
    }
  });

  return ids;
}

function checkWears(wears, watchIds) {
  if (!Array.isArray(wears)) {
    errors.push('data/wears.json bir dizi (array) olmalı.');
    return;
  }

  const seen = new Set();
  const today = new Date().toISOString().slice(0, 10);

  wears.forEach((w, i) => {
    const at = `wears[${i}]`;
    if (!w || typeof w !== 'object') { errors.push(`${at}: nesne değil.`); return; }

    if (!isISODate(w.date)) errors.push(`${at}: date "${w.date}" YYYY-MM-DD olmalı.`);
    else if (w.date > today) warnings.push(`${at}: ${w.date} gelecekte bir tarih.`);

    if (!w.watchId) errors.push(`${at}: watchId zorunlu.`);
    else if (watchIds.size && !watchIds.has(w.watchId)) {
      errors.push(`${at}: "${w.watchId}" kimliğinde bir saat yok.`);
    }

    const key = `${w.date}|${w.watchId}`;
    if (seen.has(key)) warnings.push(`${at}: ${w.date} için "${w.watchId}" iki kez kayıtlı.`);
    seen.add(key);
  });
}

async function main() {
  const watches = await readJSON('data/watches.json');
  const wears = await readJSON('data/wears.json');

  const ids = watches ? checkWatches(watches) : new Set();
  if (wears) checkWears(wears, ids);

  for (const w of warnings) console.warn(`  uyarı  ${w}`);
  for (const e of errors) console.error(`  HATA   ${e}`);

  if (errors.length) {
    console.error(`\n  ${errors.length} hata bulundu.\n`);
    process.exit(1);
  }
  console.log(`\n  ✓ Veri geçerli — ${watches?.length ?? 0} saat, ${wears?.length ?? 0} rotasyon kaydı` +
    (warnings.length ? `, ${warnings.length} uyarı` : '') + '.\n');
}

main();
