/* Rotasyon takvimi: hangi gün hangi saat takıldı.

   Tasarım notu — kimlik hiçbir zaman yalnızca renkle taşınmaz: her dolu gün
   hücresinde saatin kısa adı yazılıdır. Renk yalnızca ikinci bir ipucudur ve
   koleksiyon 8 saatten büyükse tamamen devre dışı kalır (bkz. ui.colorForWatch).
   Ayrıca her takvimin altında aynı veriyi veren bir tablo görünümü vardır. */

import { state, upsertWear, deleteWear, getWatch } from '../data.js';
import { wearsByDate, todayISO, toISO } from '../stats.js';
import {
  el, appendAll, fmtDate, watchLabel, watchCode, colorOrAxis, colorForWatch,
  attachTip, toast, tableView,
} from '../ui.js';

const DOW = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
                'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

const view = { anchor: null, months: 3, highlight: null, selectedDate: null };

export function renderCalendar(root, navigate) {
  if (!view.anchor) view.anchor = todayISO().slice(0, 7);
  if (!state.watches.length) {
    root.append(el('h1', 'Rotasyon takvimi'),
      el('p.lead', 'Takvimi kullanmak için önce koleksiyona en az bir saat eklemelisin.'));
    return;
  }
  root.append(el('div#cal-root'));
  paint(root, navigate);
}

function shiftMonth(ym, delta) {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function paint(root, navigate) {
  const host = root.querySelector('#cal-root');
  if (!host) return;
  host.replaceChildren();

  const rerender = () => paint(root, navigate);
  const byDate = wearsByDate();

  const months = [];
  for (let i = view.months - 1; i >= 0; i--) months.push(shiftMonth(view.anchor, -i));

  appendAll(host,
    el('div.section-head',
      el('div',
        el('h1', 'Rotasyon takvimi'),
        el('p.muted', 'Bir güne tıklayarak o günün kaydını ekleyebilir veya değiştirebilirsin.')),
      el('div.cal-nav',
        el('button.btn.btn-icon', {
          type: 'button', 'aria-label': 'Önceki ay',
          onclick: () => { view.anchor = shiftMonth(view.anchor, -1); rerender(); },
        }, '‹'),
        el('span.cal-title', monthTitle(view.anchor)),
        el('button.btn.btn-icon', {
          type: 'button', 'aria-label': 'Sonraki ay',
          onclick: () => { view.anchor = shiftMonth(view.anchor, 1); rerender(); },
        }, '›'),
        el('button.btn.btn-sm', {
          type: 'button',
          onclick: () => { view.anchor = todayISO().slice(0, 7); rerender(); },
        }, 'Bugün'),
        el('select', {
          'aria-label': 'Gösterilecek ay sayısı',
          onchange: (e) => { view.months = Number(e.target.value); rerender(); },
        },
          [1, 3, 6, 12].map((n) =>
            el('option', { value: n, selected: view.months === n }, n === 1 ? '1 ay' : `${n} ay`))),
      )),

    view.selectedDate && dayEditor(view.selectedDate, rerender),

    el('div.cal-months', months.map((ym) => monthCard(ym, byDate, rerender, navigate))),

    legend(rerender),

    tableView(`Tablo görünümü — ${months.length === 1 ? 'bu ay' : `son ${months.length} ay`} (${countIn(months, byDate)} kayıt)`,
      entriesTable(months, byDate)),
  );
}

const monthTitle = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

function countIn(months, byDate) {
  let n = 0;
  for (const [date, list] of byDate) if (months.includes(date.slice(0, 7))) n += list.length;
  return n;
}

/* ------------------------------------------------------------------- ay kartı */

function monthCard(ym, byDate, rerender, navigate) {
  const [year, month] = ym.split('-').map(Number);
  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7;   // pazartesi = 0
  const today = todayISO();

  const grid = el('div.cal-grid', { role: 'grid', 'aria-label': `${monthTitle(ym)} rotasyon takvimi` });
  for (const d of DOW) grid.append(el('div.cal-dow', { role: 'columnheader' }, d));
  for (let i = 0; i < lead; i++) grid.append(el('div.cal-day.empty', { 'aria-hidden': 'true' }));

  for (let day = 1; day <= daysInMonth; day++) {
    const iso = toISO(new Date(year, month - 1, day));
    const entries = byDate.get(iso) || [];
    const dimmed = view.highlight && !entries.some((e) => e.watchId === view.highlight);

    const cell = el('button.cal-day', {
      type: 'button',
      role: 'gridcell',
      onclick: () => { view.selectedDate = iso; rerender(); },
      'aria-label': entries.length
        ? `${fmtDate(iso)}: ${entries.map((e) => watchLabel(getWatch(e.watchId))).join(', ')}`
        : `${fmtDate(iso)}: kayıt yok`,
    }, el('span.cal-daynum', String(day)));

    if (entries.length) cell.classList.add('worn');
    if (iso === today) cell.classList.add('today');
    if (dimmed) cell.classList.add('dimmed');
    if (iso === view.selectedDate) cell.style.outline = '2px solid var(--accent)';

    for (const entry of entries.slice(0, 2)) {
      const w = getWatch(entry.watchId);
      cell.append(el('span.cal-tag', {
        style: { borderLeftColor: colorOrAxis(entry.watchId) },
        title: watchLabel(w),
      }, watchCode(w)));
    }
    if (entries.length > 2) cell.append(el('span.cal-more', `+${entries.length - 2}`));

    if (entries.length) {
      attachTip(cell, fmtDate(iso),
        entries.map((e) => `${watchLabel(getWatch(e.watchId))}${e.note ? ` — ${e.note}` : ''}`));
    }
    grid.append(cell);
  }

  return el('div.cal-month', el('h2', monthTitle(ym)), grid);
}

/* -------------------------------------------------------------------- açıklama */

function legend(rerender) {
  if (state.watches.length < 2) return null;
  const wrap = el('div.legend', { 'aria-label': 'Saatler — birine tıklayarak takvimde vurgula' });

  for (const w of state.watches) {
    const color = colorForWatch(w.id);
    const active = view.highlight === w.id;
    wrap.append(el('button.legend-item', {
      type: 'button',
      'aria-pressed': String(active),
      onclick: () => { view.highlight = active ? null : w.id; rerender(); },
    },
      el('span.swatch', { style: { background: color || 'var(--axis)' }, 'aria-hidden': 'true' }),
      watchLabel(w)));
  }

  if (view.highlight) {
    wrap.append(el('button.legend-item', {
      type: 'button',
      style: { color: 'var(--accent)' },
      onclick: () => { view.highlight = null; rerender(); },
    }, 'Vurgulamayı kaldır'));
  }
  return wrap;
}

/* ------------------------------------------------------------------ gün düzenleyici */

function dayEditor(iso, rerender) {
  const entries = state.wears.filter((w) => w.date === iso);
  const select = el('select', { 'aria-label': 'Saat seç' },
    el('option', { value: '' }, 'Saat seç…'),
    state.watches
      .filter((w) => (w.status ?? 'owned') === 'owned')
      .map((w) => el('option', { value: w.id }, watchLabel(w))));
  const note = el('input', { type: 'text', placeholder: 'Not (isteğe bağlı)', 'aria-label': 'Not' });

  return el('div.card', { style: { marginBottom: 'var(--gap)' } },
    el('div.section-head', { style: { marginBottom: '10px' } },
      el('h2', { style: { margin: 0 } }, fmtDate(iso)),
      el('button.btn.btn-sm', {
        type: 'button', onclick: () => { view.selectedDate = null; rerender(); },
      }, 'Kapat')),

    entries.length
      ? el('div.chips', { style: { marginBottom: '12px' } },
          entries.map((e) => el('span.chip',
            el('span.swatch', { style: { background: colorOrAxis(e.watchId) }, 'aria-hidden': 'true' }),
            watchLabel(getWatch(e.watchId)),
            el('button.btn.btn-sm', {
              type: 'button',
              style: { border: 0, background: 'none', padding: '0 0 0 4px', minHeight: 'auto' },
              'aria-label': `${watchLabel(getWatch(e.watchId))} kaydını sil`,
              onclick: () => { deleteWear(e); toast('Kayıt silindi.'); rerender(); },
            }, '✕'))))
      : el('p.muted', { style: { marginBottom: '12px' } }, 'Bu güne ait kayıt yok.'),

    el('div.form-actions',
      select, note,
      el('button.btn.btn-primary', {
        type: 'button',
        onclick: () => {
          if (!select.value) { toast('Önce bir saat seç.'); return; }
          upsertWear({ date: iso, watchId: select.value, note: note.value.trim() });
          toast(`${watchLabel(getWatch(select.value))} → ${fmtDate(iso)}`);
          rerender();
        },
      }, 'Kaydet')),
    el('p.muted', { style: { marginTop: '10px', marginBottom: 0 } },
      'Kayıt bu tarayıcıdaki taslağa yazılır. Kalıcı hale gelmesi için “Kayıt ekle” sekmesinden wears.json dosyasını indirip depoya işle.'),
  );
}

/* ------------------------------------------------------------------ tablo ikizi */

function entriesTable(months, byDate) {
  const rows = [];
  for (const [date, list] of [...byDate].sort((a, b) => b[0].localeCompare(a[0]))) {
    if (!months.includes(date.slice(0, 7))) continue;
    for (const e of list) rows.push({ date, e });
  }

  return el('table.data-table',
    el('thead', el('tr',
      el('th', 'Tarih'), el('th', 'Saat'), el('th', 'Referans'), el('th', 'Not'))),
    el('tbody', rows.length
      ? rows.map(({ date, e }) => {
          const w = getWatch(e.watchId);
          return el('tr',
            el('td', fmtDate(date, { day: '2-digit', month: '2-digit', year: 'numeric' })),
            el('td', watchLabel(w)),
            el('td', w?.reference || '—'),
            el('td', e.note || '—'));
        })
      : el('tr', el('td', { colspan: '4' }, 'Bu aralıkta kayıt yok.'))));
}
