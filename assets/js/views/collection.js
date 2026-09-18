/* Koleksiyon ızgarası: arama, marka/tür filtresi, sıralama ve saat kartları.
 * (Markaya göre gruplama denendi, kullanıcı açılır listeleri tercih etti.) */

import { state } from '../data.js';
import { el, watchLabel, emptyState, photoSm } from '../ui.js';

const filters = { q: '', brand: '', category: '', sort: 'brand' };

const SORTS = {
  brand: { label: 'Marka (A–Z)', cmp: (a, b) => watchLabel(a).localeCompare(watchLabel(b), 'tr') },
  acquired: { label: 'Satın alma (yeniden eskiye)', cmp: (a, b) => (b.acquisition?.date || '').localeCompare(a.acquisition?.date || '') },
  size: { label: 'Kasa çapı', cmp: (a, b) => (a.specs?.case?.diameter ?? 0) - (b.specs?.case?.diameter ?? 0) },
};

const uniq = (values) => [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'tr'));

export function renderCollection(root, navigate) {
  root.append(
    el('div.section-head',
      el('h1', 'Koleksiyon'),
      el('p.muted', `${state.watches.length} saat`)),
    buildFilters(root, navigate),
    el('div#collection-grid'),
  );
  paint(root, navigate);
}

function buildFilters(root, navigate) {
  const brands = uniq(state.watches.map((w) => w.brand));
  const categories = uniq(state.watches.map((w) => w.category));
  const rerender = () => paint(root, navigate);

  const search = el('input', {
    type: 'search', placeholder: 'Marka, model, referans…', value: filters.q,
    'aria-label': 'Koleksiyonda ara',
    oninput: (e) => { filters.q = e.target.value; rerender(); },
  });
  const select = (key, options, allLabel) =>
    el('select', { 'aria-label': allLabel, onchange: (e) => { filters[key] = e.target.value; rerender(); } },
      el('option', { value: '' }, allLabel),
      options.map((o) => el('option', { value: o, selected: filters[key] === o }, o)));

  return el('div.filters',
    search,
    brands.length > 1 && select('brand', brands, 'Tüm markalar'),
    categories.length > 1 && select('category', categories, 'Tüm türler'),
    el('span.spacer'),
    el('label', 'Sırala',
      el('select', { onchange: (e) => { filters.sort = e.target.value; rerender(); } },
        Object.entries(SORTS).map(([key, s]) =>
          el('option', { value: key, selected: filters.sort === key }, s.label)))),
  );
}

function matches(w) {
  if (filters.brand && w.brand !== filters.brand) return false;
  if (filters.category && w.category !== filters.category) return false;
  if (filters.q) {
    const hay = [w.brand, w.model, w.nickname, w.reference, ...(w.tags || [])]
      .filter(Boolean).join(' ').toLocaleLowerCase('tr');
    if (!hay.includes(filters.q.toLocaleLowerCase('tr'))) return false;
  }
  return true;
}

function paint(root, navigate) {
  const host = root.querySelector('#collection-grid');
  if (!host) return;
  host.replaceChildren();

  const visible = state.watches.filter(matches).sort(SORTS[filters.sort].cmp);
  if (!visible.length) {
    host.append(emptyState('Bu filtrelerle eşleşen saat yok.', 'Filtreleri gevşetmeyi dene.'));
    return;
  }
  host.append(el('div.grid-watches', visible.map((w) => watchCard(w, navigate))));
}

function watchCard(w, navigate) {
  const photo = w.photos?.[0];
  return el('button.watch-card', {
    type: 'button',
    onclick: () => navigate(`#/saat/${encodeURIComponent(w.id)}`),
    'aria-label': `${watchLabel(w)} detayları`,
  },
    el('div.watch-photo',
      photo
        /* sizes tarayıcıya kartın çizim genişliğini söyler, srcset'ten doğru
           basamağı seçsin diye. 820 px altında ızgara her zaman iki sütun:
           telefonda da ~50vw, eskiden 100vw yazıyordu ve gereksiz yere 900'lük
           dosyayı indirtiyordu. */
        ? el('img', {
            src: photo,
            srcset: `${photoSm(photo)} 600w, ${photo} 900w`,
            sizes: '(min-width: 1220px) 270px, (min-width: 820px) 33vw, 50vw',
            alt: watchLabel(w), loading: 'lazy',
          })
        : null),
    /* Altyazı fotoğrafın altında ORTALI — görsel kare içinde ortalandığı için
       sola yaslı yazı saatten kopuk duruyordu. */
    el('div.watch-code', w.model),
    el('div.watch-brand', w.brand),
  );
}
