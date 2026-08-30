/* ---------------------------------------------------------------------------
   Para birimi çevrimi.

   İLKE: tutarlar envanterde HER ZAMAN yazıldığı para biriminde durur. Çevrim
   yalnızca gösterim anında yapılır. Böylece bir kuru veriye gömmüş olmuyoruz
   ve kaynak değer geri alınabilir kalıyor.

   Kur, işlemin TARİHİNDEKİ kurdur — bugünkü değil. 2013'te 1 EUR 2,86 TRY,
   bugün 56 TRY: aynı ₺ tutarı iki tarihte bambaşka anlama geliyor.

   Kur tablosu data/fx-rates.json içinde, ECB verisinden (scripts/fetch-rates.mjs).
--------------------------------------------------------------------------- */

import { state } from './data.js';

/** Tabloda tam tarih yoksa en yakın (öncelikle önceki) tarihi kullanır. */
function rateEntry(date) {
  const table = state.fxRates?.rates;
  if (!table) return null;
  if (table[date]) return { key: date, ...table[date] };

  const keys = Object.keys(table);
  if (!keys.length) return null;

  let best = null, bestGap = Infinity;
  for (const k of keys) {
    const gap = Math.abs(Date.parse(k) - Date.parse(date));
    if (gap < bestGap) { bestGap = gap; best = k; }
  }
  return best ? { key: best, approximate: true, ...table[best] } : null;
}

/**
 * from → to çevirir. Tablo EUR tabanlı.
 * Döner: { amount, rateDate, approximate } · kur bulunamazsa null.
 */
export function convert(amount, from, to, date) {
  if (amount == null) return null;
  if (from === to) return { amount, rateDate: null, approximate: false };

  const entry = rateEntry(date);
  if (!entry) return null;
  const r = entry.rates;

  const toEur = from === 'EUR' ? amount : (r[from] ? amount / r[from] : null);
  if (toEur == null) return null;

  const out = to === 'EUR' ? toEur : (r[to] ? toEur * r[to] : null);
  if (out == null) return null;

  return { amount: out, rateDate: entry.asOf ?? entry.key, approximate: !!entry.approximate };
}

export const displayCurrency = () => state.config.displayCurrency || 'EUR';

/**
 * Bir tutarı gösterim para birimine çevirir.
 * Zaten o para birimindeyse olduğu gibi döner (converted:false) — çevrilmiş
 * değerle asıl değeri ekranda ayırt edebilmek için.
 */
export function inDisplayCurrency(amount, currency, date) {
  const target = displayCurrency();
  if (currency === target) return { amount, currency: target, converted: false };
  const c = convert(amount, currency, target, date);
  if (!c) return null;
  return { amount: c.amount, currency: target, converted: true, rateDate: c.rateDate };
}
