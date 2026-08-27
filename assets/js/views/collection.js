/* Koleksiyon ızgarası: arama, filtre, sıralama ve saat kartları. */

import { state, canShow } from '../data.js';
import { perWatchStats } from '../stats.js';
import { el, fmtDate, fmtMoney, relDays, watchLabel, colorForWatch, emptyState } from '../ui.js';

const filters = { q: '', brand: '', category: '', status: 'owned', sort: 'brand' };

const SORTS = {
  brand: { label: 'Marka (A→Z)', cmp: (a, b) => watchLabel(a.watch).localeCompare(watchLabel(b.watch), 'tr') },
  mostWorn: { label: 'En çok takılan', cmp: (a, b) => b.days - a.days },
  leastWorn: { label: 'En az takılan', cmp: (a, b) => a.days - b.days },
  recent: { label: 'En son takılan', cmp: (a, b) => (b.lastWorn || '').localeCompare(a.lastWorn || '') },
  stale: { label: 'En uzun süredir takılmayan', cmp: (a, b) => (b.daysSince ?? 1e9) - (a.daysSince ?? 1e9) },
  acquired: { label: 'Satın alma (yeniden eskiye)', cmp: (a, b) => (b.watch.acquisition?.date || '').localeCompare(a.watch.acquisition?.date || '') },
  size: { label: 'Kasa çapı', cmp: (a, b) => (a.watch.specs?.case?.diameter ?? 0) - (b.watch.specs?.case?.diameter ?? 0) },
};

const uniq = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));

export function renderCollection(root, navigate) {
  const rows = perWatchStats();

  root.append(
    el('div.section-head',
      el('div',
        el('h1', 'Koleksiyon'),
        el('p.muted', `${state.watches.length} saat kayıtlı`)),
    ),
    buildFilters(rows, root, navigate),
    el('div#collection-grid'),
  );

  paint(root, rows, navigate);
}

function buildFilters(rows, root, navigate) {
  const brands = uniq(state.watches.map((w) => w.brand));
  const categories = uniq(state.watches.map((w) => w.category));

  const rerender = () => paint(root, rows, navigate);

  const search = el('input', {
    type: 'search', placeholder: 'Marka, model, referans…', value: filters.q,
    'aria-label': 'Koleksiyonda ara',
    oninput: (e) => { filters.q = e.target.value; rerender(); },
  });

  const select = (key, options, allLabel) =>
    el('select', {
      'aria-label': allLabel,
      onchange: (e) => { filters[key] = e.target.value; rerender(); },
    }, el('option', { value: '' }, allLabel),
       options.map((o) => el('option', { value: o, selected: filters[key] === o }, o)));

  return el('div.filters',
    search,
    brands.length > 1 && select('brand', brands, 'Tüm markalar'),
    categories.length > 1 && select('category', categories, 'Tüm türler'),
    el('select', {
      'aria-label': 'Durum',
      onchange: (e) => { filters.status = e.target.value; rerender(); },
    },
      el('option', { value: 'owned', selected: filters.status === 'owned' }, 'Sahip olduklarım'),
      el('option', { value: '', selected: filters.status === '' }, 'Tümü (satılanlar dahil)'),
      el('option', { value: 'sold', selected: filters.status === 'sold' }, 'Satılanlar'),
      el('option', { value: 'wishlist', selected: filters.status === 'wishlist' }, 'İstek listesi'),
    ),
    el('span.spacer'),
    el('label', 'Sırala',
      el('select', {
        onchange: (e) => { filters.sort = e.target.value; rerender(); },
      }, Object.entries(SORTS).map(([key, s]) =>
        el('option', { value: key, selected: filters.sort === key }, s.label)))),
  );
}

function matches(row) {
  const w = row.watch;
  if (filters.status && (w.status ?? 'owned') !== filters.status) return false;
  if (filters.brand && w.brand !== filters.brand) return false;
  if (filters.category && w.category !== filters.category) return false;
  if (filters.q) {
    const hay = [w.brand, w.model, w.nickname, w.reference, ...(w.tags || [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('tr');
    if (!hay.includes(filters.q.toLocaleLowerCase('tr'))) return false;
  }
  return true;
}

function paint(root, rows, navigate) {
  const host = root.querySelector('#collection-grid');
  if (!host) return;
  host.replaceChildren();

  const visible = rows.filter(matches).sort(SORTS[filters.sort].cmp);

  if (!visible.length) {
    host.append(emptyState('⌚', 'Bu filtrelerle eşleşen saat yok.',
      state.watches.length ? 'Filtreleri gevşetmeyi dene.' : '“Kayıt ekle” sekmesinden ilk saatini ekleyebilirsin.'));
    return;
  }

  const grid = el('div.grid-watches');
  for (const row of visible) grid.append(watchCard(row, navigate));
  host.append(grid);
}

function watchCard(row, navigate) {
  const w = row.watch;
  const color = colorForWatch(w.id);
  const photo = w.photos?.[0];
  const price = canShow('acquisition.price') ? w.acquisition?.price : null;

  return el('button.watch-card', {
    type: 'button',
    onclick: () => navigate(`#/saat/${encodeURIComponent(w.id)}`),
    'aria-label': `${watchLabel(w)} detayları`,
  },
    el('div.watch-photo',
      photo
        ? el('img', { src: photo, alt: watchLabel(w), loading: 'lazy' })
        : el('span.placeholder', { 'aria-hidden': 'true' }, '⌚')),
    el('div.watch-body',
      el('div.watch-brand',
        color && el('span.swatch', { style: { background: color, display: 'inline-block', marginRight: '6px' }, 'aria-hidden': 'true' }),
        w.brand),
      el('div.watch-model', w.model),
      // Referans model adıyla aynıysa tekrar yazma (Casio'da kod ikisini de karşılar).
      el('div.watch-ref', [
        w.reference !== w.model ? w.reference : null,
        w.nickname && `“${w.nickname}”`,
      ].filter(Boolean).join(' · ')),
      el('div.watch-meta',
        el('span', row.days ? `${row.days} gün takıldı` : 'Henüz takılmadı'),
        el('span', { style: { color: 'var(--text-muted)' } },
          price ? fmtMoney(price.amount, price.currency)
                : row.lastWorn ? relDays(row.daysSince)
                : w.acquisition?.date ? fmtDate(w.acquisition.date, { year: 'numeric' })
                : ''))),
  );
}
