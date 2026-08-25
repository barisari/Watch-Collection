/* İstatistik: özet kutuları, rotasyon dağılımı, ihmal edilenler, servis takvimi.

   Grafik notu — "hangi saat kaç gün takıldı" tek bir seridir, dolayısıyla tüm
   çubuklar tek renktedir (uzunluk zaten büyüklüğü taşır; renge ikinci bir iş
   yüklemek yanıltıcı olur). Değerler her satırın sonunda yazılıdır ve altta
   aynı veriyi veren bir tablo görünümü vardır. */

import { state, canShow } from '../data.js';
import {
  perWatchStats, collectionSummary, valueSummary, monthlyCounts, suggestNext, serviceDue,
} from '../stats.js';
import {
  el, fmtDate, fmtMoney, fmtNum, fmtPct, relDays, watchLabel, colorOrAxis,
  attachTip, emptyState, tableView,
} from '../ui.js';

export function renderStats(root, navigate) {
  const rows = perWatchStats();
  const summary = collectionSummary(rows);

  if (!state.watches.length) {
    root.append(el('h1', 'İstatistik'), emptyState('📊', 'Henüz saat yok.',
      '“Kayıt ekle” sekmesinden başlayabilirsin.'));
    return;
  }

  root.append(
    el('div.section-head', el('div',
      el('h1', 'İstatistik'),
      el('p.muted', summary.firstEntry
        ? `${fmtDate(summary.firstEntry)} tarihinden bu yana ${summary.totalEntries} kayıt`
        : 'Henüz rotasyon kaydı yok'))),

    tiles(summary, rows),
    el('div.stack', { style: { marginTop: 'var(--gap)' } },
      distributionCard(rows, summary),
      twoUp(neglectedCard(summary, navigate), suggestionCard(rows, navigate)),
      monthlyCard(),
      twoUp(serviceCard(), valueCard(rows)),
    ),
  );
}

const twoUp = (a, b) => {
  const items = [a, b].filter(Boolean);
  if (!items.length) return null;
  return el('div', {
    style: { display: 'grid', gap: 'var(--gap)', gridTemplateColumns: items.length > 1 ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr' },
  }, items);
};

/* ------------------------------------------------------------------ kutular */

function tiles(summary, rows) {
  const worn = rows.filter((r) => r.days > 0);
  const leastWorn = worn.length ? worn.reduce((a, b) => (a.days <= b.days ? a : b)) : null;

  return el('div.tiles',
    tile('Koleksiyon', String(summary.watchCount), 'sahip olunan saat'),
    tile('Kayıtlı gün', fmtNum(summary.uniqueDays),
      summary.span ? `son ${fmtNum(summary.span)} günün ${fmtPct(summary.coverage)}'i` : ''),
    tile('En çok takılan',
      summary.mostWorn ? String(summary.mostWorn.days) : '—',
      summary.mostWorn ? `gün · ${watchLabel(summary.mostWorn.watch)}` : 'kayıt yok'),
    tile('En az takılan',
      leastWorn ? String(leastWorn.days) : '—',
      leastWorn ? `gün · ${watchLabel(leastWorn.watch)}` : 'kayıt yok'),
    summary.neglected.length
      ? tile('İhmal edilen', String(summary.neglected.length),
             `${summary.neglectedThreshold}+ gündür takılmadı`)
      : null,
  );
}

const tile = (label, value, sub) =>
  el('div.tile',
    el('div.tile-label', label),
    el('div.tile-value', value),
    sub ? el('div.tile-sub', sub) : null);

/* --------------------------------------------------------- rotasyon dağılımı */

function distributionCard(rows, summary) {
  const data = [...rows].sort((a, b) => b.days - a.days);
  const max = Math.max(1, ...data.map((r) => r.days));

  const bars = el('div.bars');
  for (const r of data) {
    const pct = (r.days / max) * 100;
    const row = el('div.bar-row',
      el('span.bar-name', { title: watchLabel(r.watch) }, watchLabel(r.watch)),
      el('div.bar-track', el('div.bar-fill', { style: { width: `${pct}%` } })),
      el('span.bar-value', r.days ? `${r.days} g · ${fmtPct(r.share)}` : '—'));

    attachTip(row, watchLabel(r.watch), [
      `${r.days} gün takıldı (${fmtPct(r.share)})`,
      `Son: ${r.lastWorn ? `${fmtDate(r.lastWorn)} — ${relDays(r.daysSince)}` : 'hiç'}`,
      r.longestStreak ? `En uzun seri: ${r.longestStreak} gün` : null,
    ].filter(Boolean));
    bars.append(row);
  }

  return el('div.card',
    el('h2', 'Rotasyon dağılımı'),
    el('p.muted', { style: { marginTop: '-6px' } },
      `Toplam ${summary.totalEntries} kayıt üzerinden, saat başına takılan gün sayısı.`),
    bars,
    tableView('Tablo görünümü', distributionTable(data)));
}

function distributionTable(data) {
  const showCost = canShow('acquisition.price');
  return el('table.data-table',
    el('thead', el('tr',
      el('th', 'Saat'),
      el('th.num', 'Gün'),
      el('th.num', 'Pay'),
      el('th', 'Son takılma'),
      el('th.num', 'En uzun seri'),
      showCost ? el('th.num', 'Takılma başına') : null)),
    el('tbody', data.map((r) => el('tr',
      el('td', watchLabel(r.watch)),
      el('td.num', String(r.days)),
      el('td.num', r.days ? fmtPct(r.share) : '—'),
      el('td', r.lastWorn ? fmtDate(r.lastWorn, { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'),
      el('td.num', r.longestStreak || '—'),
      showCost ? el('td.num', r.costPerWear != null ? fmtMoney(r.costPerWear, r.currency) : '—') : null))));
}

/* ------------------------------------------------------------ ihmal edilenler */

function neglectedCard(summary, navigate) {
  return el('div.card',
    el('h2', 'Uzun süredir takılmayanlar'),
    el('p.muted', { style: { marginTop: '-6px' } },
      `${summary.neglectedThreshold} gün ve üzeri. Eşiği site.config.json içindeki neglectedAfterDays ile değiştirebilirsin.`),
    summary.neglected.length
      ? el('table.data-table',
          el('tbody', summary.neglected.map((r) => el('tr',
            el('td',
              el('span.swatch', { style: { background: colorOrAxis(r.id), display: 'inline-block', marginRight: '8px' }, 'aria-hidden': 'true' }),
              el('a', {
                href: `#/saat/${encodeURIComponent(r.id)}`,
                onclick: (e) => { e.preventDefault(); navigate(`#/saat/${encodeURIComponent(r.id)}`); },
              }, watchLabel(r.watch))),
            el('td.num', relDays(r.daysSince))))))
      : el('p', { style: { margin: 0 } },
          el('span.badge.badge-good', '✓ Tüm saatler rotasyonda')));
}

function suggestionCard(rows, navigate) {
  // Dün takılan bir saati "sıradaki" diye önermek anlamsız — en az üç gün
  // dinlenmiş olanları göster.
  const picks = suggestNext(rows, 3).filter((r) => r.daysSince == null || r.daysSince >= 3);
  if (!picks.length) return null;
  return el('div.card',
    el('h2', 'Sıradaki için öneri'),
    el('p.muted', { style: { marginTop: '-6px' } }, 'En uzun süredir bileğe çıkmayanlar.'),
    el('div.stack', { style: { gap: '10px' } },
      picks.map((r, i) => el('div', { style: { display: 'flex', alignItems: 'center', gap: '10px' } },
        el('span.tile-label', { style: { minWidth: '18px' } }, `${i + 1}.`),
        el('span.swatch', { style: { background: colorOrAxis(r.id) }, 'aria-hidden': 'true' }),
        el('a', {
          href: `#/saat/${encodeURIComponent(r.id)}`,
          style: { flex: '1' },
          onclick: (e) => { e.preventDefault(); navigate(`#/saat/${encodeURIComponent(r.id)}`); },
        }, watchLabel(r.watch)),
        el('span.muted', relDays(r.daysSince))))));
}

/* ------------------------------------------------------------------ aylık akış */

function monthlyCard() {
  const months = monthlyCounts();
  if (months.length < 2) return null;
  const max = Math.max(...months.map((m) => m.count));
  const MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const label = (ym) => {
    const [y, m] = ym.split('-').map(Number);
    return `${MONTHS_SHORT[m - 1]} ${String(y).slice(2)}`;
  };

  const bars = el('div.bars');
  for (const m of months) {
    const row = el('div.bar-row',
      el('span.bar-name', label(m.month)),
      el('div.bar-track', el('div.bar-fill', { style: { width: `${(m.count / max) * 100}%` } })),
      el('span.bar-value', `${m.count} g`));
    attachTip(row, label(m.month), [`${m.count} kayıtlı gün`,
      `${Object.keys(m.byWatch).length} farklı saat`]);
    bars.append(row);
  }

  return el('div.card',
    el('h2', 'Aylara göre kayıt'),
    el('p.muted', { style: { marginTop: '-6px' } }, 'Her ay kaç gün kayıt tuttuğun.'),
    bars);
}

/* ----------------------------------------------------------------- servis */

function serviceCard() {
  const due = serviceDue().filter((d) => d.daysLeft < 365 * 2);
  if (!due.length) return null;
  return el('div.card',
    el('h2', 'Servis takvimi'),
    el('table.data-table',
      el('tbody', due.map((d) => el('tr',
        el('td', watchLabel(d.watch)),
        el('td.num', d.overdue
          ? el('span.badge.badge-critical', `⚠ ${fmtDate(d.dueISO, { month: 'short', year: 'numeric' })} — geçti`)
          : `${fmtDate(d.dueISO, { month: 'short', year: 'numeric' })}`))))));
}

/* ------------------------------------------------- değer (koleksiyoner modu) */

function valueCard(rows) {
  if (!canShow('acquisition.price') && !canShow('valuation')) return null;
  const v = valueSummary();
  const costs = Object.entries(v.cost);
  const values = Object.entries(v.value);
  if (!costs.length && !values.length) return null;

  return el('div.card',
    el('h2', 'Koleksiyon değeri'),
    el('table.spec-table', el('tbody',
      costs.map(([cur, amt]) => el('tr', el('th', `Toplam maliyet (${cur})`), el('td', fmtMoney(amt, cur)))),
      values.map(([cur, amt]) => el('tr', el('th', `Güncel değer (${cur})`), el('td', fmtMoney(amt, cur)))),
      costs.map(([cur, amt]) => {
        const now = v.value[cur];
        if (now == null) return null;
        const diff = now - amt;
        return el('tr',
          el('th', `Fark (${cur})`),
          el('td', { style: { color: diff >= 0 ? 'var(--status-good)' : 'var(--status-critical)' } },
            `${diff >= 0 ? '+' : '−'}${fmtMoney(Math.abs(diff), cur)}`));
      }).filter(Boolean))),
    el('p.muted', { style: { marginBottom: 0 } },
      'Bu kart yalnızca koleksiyoner modunda görünür.'));
}
