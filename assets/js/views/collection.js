/* Koleksiyon: markaya göre gruplanmış kontakt baskı + arama.
 *
 * Sıralama ve marka/tür açılır listeleri yok. 28 saatlik kişisel bir vitrinde
 * yapı, kontrol değil gruplama ile verilir: her marka bir bölüm, bölüm başlığı
 * adet taşır. Kartta marka satırı yok — başlık zaten söylüyor. */

import { state } from '../data.js';
import { el, watchLabel, emptyState, photoSm } from '../ui.js';

/* Kullanıcının kendi sırası (HA listesiyle aynı). Listede olmayan marka sona,
   alfabetik. */
const MARKA_SIRASI = ['Casio', 'G-Shock', 'Edifice', 'Pro Trek', 'Oceanus', 'Mondaine', 'Seiko', 'Braun'];
const markaSira = (b) => { const i = MARKA_SIRASI.indexOf(b); return i === -1 ? MARKA_SIRASI.length : i; };

const filters = { q: '' };

/** releaseDate "2019-08" ya da "2023" biçiminde; karta yalnızca yıl yazılır. */
const releaseYear = (w) => (w.releaseDate ? String(w.releaseDate).slice(0, 4) : null);

export function renderCollection(root, navigate) {
  const search = el('input', {
    type: 'search', placeholder: 'Marka, model, referans…', value: filters.q,
    'aria-label': 'Koleksiyonda ara',
    oninput: (e) => { filters.q = e.target.value; paint(root, navigate); },
  });

  root.append(
    el('div.section-head',
      el('h1', 'Koleksiyon'),
      el('p.muted', `${state.watches.length} saat`)),
    el('div.filters', search),
    el('div#collection-grid'),
  );
  paint(root, navigate);
}

function matches(w) {
  if (!filters.q) return true;
  const hay = [w.brand, w.model, w.nickname, w.reference, ...(w.tags || [])]
    .filter(Boolean).join(' ').toLocaleLowerCase('tr');
  return hay.includes(filters.q.toLocaleLowerCase('tr'));
}

function paint(root, navigate) {
  const host = root.querySelector('#collection-grid');
  if (!host) return;
  host.replaceChildren();

  const visible = state.watches.filter(matches);
  if (!visible.length) {
    host.append(emptyState('Eşleşen saat yok.', 'Aramayı kısaltmayı dene.'));
    return;
  }

  const gruplar = new Map();
  for (const w of visible) (gruplar.get(w.brand) || gruplar.set(w.brand, []).get(w.brand)).push(w);
  const markalar = [...gruplar.keys()]
    .sort((a, b) => (markaSira(a) - markaSira(b)) || a.localeCompare(b, 'tr'));

  for (const marka of markalar) {
    const saatler = gruplar.get(marka).sort((a, b) => a.model.localeCompare(b.model, 'tr'));
    const grid = el('div.grid-watches', saatler.map((w) => watchCard(w, navigate)));
    host.append(el('section.group',
      el('h2.group-head', marka, el('span.count', String(saatler.length))),
      grid));
  }
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
        /* Kart ekranda 268-333 px görünüyor; sizes tarayıcıya çizim genişliğini
           söyler, srcset'ten doğru basamağı seçer: 1× masaüstü 600, 3× telefon 900. */
        ? el('img', {
            src: photo,
            srcset: `${photoSm(photo)} 600w, ${photo} 900w`,
            sizes: '(min-width: 1220px) 270px, (min-width: 820px) 33vw, (min-width: 560px) 50vw, 100vw',
            alt: watchLabel(w), loading: 'lazy',
          })
        : null),
    /* Kod en büyük: kullanıcı saatleri koda göre tanıyor. Marka başlıkta. */
    el('div.watch-code', w.model),
    el('div.watch-meta',
      // Kapaklar gerçek ölçekli; buradaki mm değeri görünen boyutla örtüşür.
      el('span', w.specs?.case?.diameter ? `${w.specs.case.diameter} mm` : ''),
      // Sağ: piyasaya çıkış yılı. Bilinmiyorsa boş — satın alma yılına düşmek
      // iki farklı şeyi aynı yere yazmak olurdu.
      el('span', { title: w.releaseDate ? 'Piyasaya çıkış' : null }, releaseYear(w) || '')),
  );
}
