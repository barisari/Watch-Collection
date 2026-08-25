/* ---------------------------------------------------------------------------
   Rotasyon istatistikleri.
   Tüm tarihler 'YYYY-MM-DD' metin biçiminde tutulur; bu biçim hem sıralanabilir
   hem de saat dilimi kaymasından etkilenmez.
--------------------------------------------------------------------------- */

import { state } from './data.js';

export const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export const parseISO = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const toISO = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function daysBetween(a, b) {
  const ms = parseISO(b).setHours(12, 0, 0, 0) - parseISO(a).setHours(12, 0, 0, 0);
  return Math.round(ms / 86400000);
}

export const addDays = (iso, n) => {
  const d = parseISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

/* --------------------------------------------------------- saat başına özet */

/**
 * Her saat için rotasyon özeti döner:
 * days, share, lastWorn, daysSince, firstWorn, longestStreak, costPerWear
 */
export function perWatchStats(wears = state.wears, watches = state.watches) {
  const today = todayISO();
  const byWatch = new Map(watches.map((w) => [w.id, []]));
  for (const entry of wears) {
    if (byWatch.has(entry.watchId)) byWatch.get(entry.watchId).push(entry.date);
  }

  const total = wears.length;

  return watches.map((watch) => {
    const dates = (byWatch.get(watch.id) || []).sort();
    const days = dates.length;
    const lastWorn = days ? dates[days - 1] : null;
    const firstWorn = days ? dates[0] : null;

    let longestStreak = 0;
    let run = 0;
    let prev = null;
    for (const d of dates) {
      run = prev && daysBetween(prev, d) === 1 ? run + 1 : 1;
      if (run > longestStreak) longestStreak = run;
      prev = d;
    }

    const price = watch.acquisition?.price?.amount ?? null;

    return {
      watch,
      id: watch.id,
      days,
      share: total ? days / total : 0,
      lastWorn,
      firstWorn,
      daysSince: lastWorn ? daysBetween(lastWorn, today) : null,
      longestStreak,
      costPerWear: price != null && days > 0 ? price / days : null,
      currency: watch.acquisition?.price?.currency ?? state.config.defaultCurrency,
    };
  });
}

/* ------------------------------------------------------------ genel özetler */

export function collectionSummary(rows = perWatchStats()) {
  const owned = rows.filter((r) => (r.watch.status ?? 'owned') === 'owned');
  const worn = rows.filter((r) => r.days > 0);
  const threshold = state.config.neglectedAfterDays ?? 60;

  const mostWorn = worn.length
    ? worn.reduce((best, r) => (r.days > best.days ? r : best))
    : null;

  const neglected = owned
    .filter((r) => r.daysSince == null || r.daysSince >= threshold)
    .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));

  const dates = state.wears.map((w) => w.date).sort();
  const span = dates.length ? daysBetween(dates[0], todayISO()) + 1 : 0;
  const uniqueDays = new Set(dates).size;

  return {
    watchCount: owned.length,
    totalEntries: state.wears.length,
    uniqueDays,
    span,
    coverage: span ? uniqueDays / span : 0,
    firstEntry: dates[0] ?? null,
    mostWorn,
    neglected,
    neglectedThreshold: threshold,
    neverWorn: owned.filter((r) => r.days === 0),
  };
}

/** Koleksiyonun toplam maliyeti / güncel değeri (yalnız koleksiyoner modunda gösterilir). */
export function valueSummary(watches = state.watches) {
  const acc = { cost: {}, value: {} };
  for (const w of watches) {
    if ((w.status ?? 'owned') !== 'owned') continue;
    const p = w.acquisition?.price;
    if (p?.amount != null) acc.cost[p.currency] = (acc.cost[p.currency] || 0) + p.amount;
    const v = w.valuation;
    if (v?.amount != null) acc.value[v.currency] = (acc.value[v.currency] || 0) + v.amount;
  }
  return acc;
}

/* ----------------------------------------------------------- takvim yardımı */

/** 'YYYY-MM-DD' -> o güne ait kayıt dizisi. */
export function wearsByDate(wears = state.wears) {
  const map = new Map();
  for (const entry of wears) {
    if (!map.has(entry.date)) map.set(entry.date, []);
    map.get(entry.date).push(entry);
  }
  return map;
}

/** Ay ay kayıt sayısı: [{ month:'2026-08', count, byWatch:{id:count} }] artan sırada. */
export function monthlyCounts(wears = state.wears) {
  const map = new Map();
  for (const entry of wears) {
    const key = entry.date.slice(0, 7);
    if (!map.has(key)) map.set(key, { month: key, count: 0, byWatch: {} });
    const m = map.get(key);
    m.count += 1;
    m.byWatch[entry.watchId] = (m.byWatch[entry.watchId] || 0) + 1;
  }
  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Rotasyon önerisi: en uzun süredir takılmayan sahip olunan saatler. */
export function suggestNext(rows = perWatchStats(), limit = 3) {
  return rows
    .filter((r) => (r.watch.status ?? 'owned') === 'owned')
    .sort((a, b) => (b.daysSince ?? 9999) - (a.daysSince ?? 9999))
    .slice(0, limit);
}

/** Servis zamanı gelmiş saatler. */
export function serviceDue(watches = state.watches) {
  const today = todayISO();
  return watches.flatMap((w) => {
    const { lastServiceDate, intervalYears } = w.service || {};
    if (!lastServiceDate || !intervalYears) return [];
    const due = parseISO(lastServiceDate);
    due.setFullYear(due.getFullYear() + intervalYears);
    const dueISO = toISO(due);
    return [{ watch: w, dueISO, overdue: dueISO <= today, daysLeft: daysBetween(today, dueISO) }];
  }).sort((a, b) => a.dueISO.localeCompare(b.dueISO));
}
