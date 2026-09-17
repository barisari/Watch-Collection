/* Koleksiyon ızgarası: arama, filtre, sıralama ve saat kartları. */

import { state } from '../data.js';
import { el, watchLabel, colorForWatch, emptyState, photoSm } from '../ui.js';

const filters = { q: '', brand: '', category: '', sort: 'brand' };

const SORTS = {
  brand: { label: 'Marka (A→Z)', cmp: (a, b) => watchLabel(a.watch).localeCompare(watchLabel(b.watch), 'tr') },
  acquired: { label: 'Satın alma (yeniden eskiye)', cmp: (a, b) => (b.watch.acquisition?.date || '').localeCompare(a.watch.acquisition?.date || '') },
  size: { label: 'Kasa çapı', cmp: (a, b) => (a.watch.specs?.case?.diameter ?? 0) - (b.watch.specs?.case?.diameter ?? 0) },
};

const uniq = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));

/** releaseDate "2019-08" ya da "2023" biçiminde; karta yalnızca yıl yazılır. */
const releaseYear = (w) => (w.releaseDate ? String(w.releaseDate).slice(0, 4) : null);

export function renderCollection(root, navigate) {
  /* Rotasyon sitede tutulmuyor (kayıt Home Assistant'ta) — kartlar yalnızca
     envanter verisiyle çiziliyor. */
  const rows = state.watches.map((watch) => ({ id: watch.id, watch }));

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

  return el('button.watch-card', {
    type: 'button',
    onclick: () => navigate(`#/saat/${encodeURIComponent(w.id)}`),
    'aria-label': `${watchLabel(w)} detayları`,
  },
    el('div.watch-photo',
      photo
        /* Kart ekranda 268-333 px görünüyor. sizes tarayıcıya hangi genişlikte
           çizileceğini söylüyor; o da srcset'ten doğru basamağı seçiyor.
           1× masaüstü 600'ü, 3× telefon 900'ü alır. */
        ? el('img', {
            src: photo,
            srcset: `${photoSm(photo)} 600w, ${photo} 900w`,
            sizes: '(min-width: 1220px) 270px, (min-width: 820px) 33vw, (min-width: 560px) 50vw, 100vw',
            alt: watchLabel(w), loading: 'lazy',
          })
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
        // Sol alt: kasa çapı. Buradaki yer eskiden rotasyon sayacıydı; rotasyon
        // siteden kalktı (kayıt Home Assistant'ta), kutu boş kalmasın diye
        // envanterden gelen en ayırt edici tek değer kondu.
        el('span', w.specs?.case?.diameter ? `${w.specs.case.diameter} mm` : ''),
        // Sağ alt: saatin piyasaya çıkış yılı. Bilinmiyorsa boş bırakılır —
        // satın alma yılına düşmek iki farklı şeyi aynı yere yazmak olurdu.
        el('span', {
          style: { color: 'var(--text-muted)' },
          title: w.releaseDate ? 'Piyasaya çıkış' : null,
        }, releaseYear(w) || ''))),
  );
}
