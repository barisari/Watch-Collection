/* Tek bir saatin künyesi: teknik özellikler ve satın alma bilgisi. */

import { getWatch } from '../data.js';
import {
  el, fmtDate, fmtMoney, fmtNum, watchLabel, emptyState,
  photoSm, photoLarge,
} from '../ui.js';
import { term, termList, waterResistance } from '../terms.js';

const CONDITION_TR = {
  new: 'Sıfır', 'like-new': 'Sıfır ayarında', excellent: 'Çok iyi',
  good: 'İyi', fair: 'Orta', vintage: 'Vintage',
};

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
               'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "2019-08" → "Ağustos 2019" · "2023" → "2023" */
function releaseLabel(watch) {
  const r = watch.releaseDate;
  if (!r) return null;
  const [y, m] = String(r).split('-');
  return m ? `${AYLAR[Number(m) - 1]} ${y}` : y;
}

/* Liste fiyatı — herkese açık bir veri, gizli alan değil.
 *
 * Fiyat, saatin satıldığı pazarın parasıyla saklanır: Casio her ülkede ayrı
 * fiyat veriyor, hepsini tek kura çevirip saklamak kaynağı kaybetmek olurdu.
 * Ekranda en çok 3 tanesi gösteriliyor. */
/* Yalnızca bu dört birim gösterilir. INR/THB/MYR veride kaynak izi olarak
 * duruyor ama ekranda işe yaramıyor — kullanıcı o pazarlarda alışveriş
 * etmiyor. Hiçbiri yoksa elde ne varsa o gösterilir, satır boş kalmasın. */
const MSRP_GOSTER = ['USD', 'EUR', 'TRY', 'JPY'];
const msrpRank = (cur) => {
  const i = MSRP_GOSTER.indexOf(cur);
  return i === -1 ? MSRP_GOSTER.length : i;
};

/* Kaynaktan gelen ve türetilen fiyatlar TEK satırda. Türetilmiş olan başındaki
 * "~" ile zaten belli oluyor; ayrı satır açmak gereksiz karmaşa yaratıyordu.
 * Veride ayrım duruyor (msrp / msrpEstimated), yalnızca gösterim birleşik. */
function msrpRow(watch) {
  const hepsi = [
    ...Object.entries(watch.msrp || {}).map(([cur, amt]) => ({ cur, amt, tahmin: false })),
    ...Object.entries(watch.msrpEstimated || {}).map(([cur, amt]) => ({ cur, amt, tahmin: true })),
  ];
  if (!hepsi.length) return null;

  const gosterilecek = hepsi.filter((p) => MSRP_GOSTER.includes(p.cur));
  return (gosterilecek.length ? gosterilecek : hepsi)
    // Önce kaynaktan gelen gerçek fiyatlar, sonra türetilenler.
    .sort((a, b) => (a.tahmin - b.tahmin) || (msrpRank(a.cur) - msrpRank(b.cur)))
    .slice(0, 3)
    .map((p) => el('span.line', (p.tahmin ? '~' : '') + fmtMoney(p.amt, p.cur)));
}

export function renderDetail(root, id, navigate) {
  const watch = getWatch(id);
  if (!watch) {
    root.append(emptyState('Bu saat bulunamadı.', 'Silinmiş ya da bağlantı hatalı olabilir.'),
      el('p', { style: { textAlign: 'center' } },
        el('button.btn', { type: 'button', onclick: () => navigate('#/koleksiyon') }, 'Koleksiyona dön')));
    return;
  }

  const s = watch.specs || {};

  root.append(
    el('p', el('button.btn', { type: 'button', onclick: () => navigate('#/koleksiyon') }, '← Koleksiyon')),

    /* Kod kahraman: kullanıcı saatleri koda göre tanıyor. Tam referans burada
       (satın alındığı haliyle), ızgarada kısa model. Altına marka/tür/çıkış
       satırı KONMUYOR — hepsi tabloda, tekrar etmek orta noktalı meta dizesinin
       kılık değiştirmişi olurdu. */
    el('header.detail-head',
      el('h1.code', watch.reference),
      watch.nickname && el('p.nickname', watch.nickname),
    ),

    el('div.detail-grid',
      el('div.stack',
        photoPanel(watch),
      ),
      el('div.stack',
        storyCard(watch),
        modelCard(watch),
        specCard('Mekanizma', [
          ['Kalibre / modül', s.movement?.caliber],
          ['Tip', term(s.movement?.type)],
          ['Pil', s.movement?.battery],
          ['Pil ömrü', s.movement?.batteryLife],
          ['Hassasiyet', s.movement?.accuracy],
          ['Radyo senkronu', s.movement?.radioControlled],
          ['Bluetooth', s.movement?.bluetooth == null ? null : (s.movement.bluetooth ? 'Var' : 'Yok')],
          ['Güç rezervi', s.movement?.powerReserve && `${s.movement.powerReserve} saat`],
          ['Frekans', s.movement?.frequency && `${fmtNum(s.movement.frequency)} A/s`],
          ['Taş sayısı', s.movement?.jewels],
          ['Sertifika', s.movement?.certification],
        ]),
        specCard('Kasa', [
          ['Malzeme', term(s.case?.material)],
          ['Renk', term(s.case?.color)],
          ['Bezel malzemesi', term(s.case?.bezelMaterial)],
          ['Genişlik', s.case?.diameter && `${s.case.diameter} mm`],
          ['Kalınlık', s.case?.thickness && `${s.case.thickness} mm`],
          ['Kulaktan kulağa', s.case?.lugToLug && `${s.case.lugToLug} mm`],
          ['Ağırlık', s.case?.weight && `${s.case.weight} g`],
          ['Cam', term(s.case?.crystal)],
          ['Cam kaplaması', term(s.case?.crystalCoating)],
          ['Cam formu', term(s.case?.crystalShape)],
          ['Su geçirmezlik', waterResistance(s.case?.waterResistance)],
          ['Aydınlatma', s.case?.backlight],
          ['Bezel', s.case?.bezel],
        ]),
        specCard('Kadran', [
          ['Renk', term(s.dial?.color)],
          ['Gösterim', term(s.dial?.display)],
          ['İndeksler', term(s.dial?.indices)],
          ['Işıma', s.dial?.lume],
          ['Fonksiyonlar', s.dial?.complications?.length ? termList(s.dial.complications) : null],
        ]),
        specCard('Kayış', [
          ['Tip', term(s.strap?.type)],
          ['Malzeme', term(s.strap?.material)],
          ['Renk', term(s.strap?.color)],
          ['Toka', term(s.strap?.clasp)],
          ['Genişlik', s.case?.lugWidth && `${s.case.lugWidth} mm`],
          ['Uyduğu bilek', s.strap?.sizeRange],
        ]),
        acquisitionCard(watch),
        watch.notes && el('section', el('h3', 'Notlar'), el('p', watch.notes)),
        sourceNote(watch),
      ),
    ),
  );
}

/** Üreticinin tanıtım metni. Türkçesi varsa o, yoksa İngilizce aslı gösterilir. */
function storyCard(watch) {
  const tagline = watch.tagline?.tr || watch.tagline?.en;
  const story = watch.story?.tr || watch.story?.en;
  if (!tagline && !story) return null;

  const onlyEnglish = !watch.story?.tr && !watch.tagline?.tr;
  return el('div.prose',
    tagline && el('p.prose-lead', tagline),
    story && el('p.prose-body', story),
    onlyEnglish && el('p.muted', 'Bu metin Casio\'nun İngilizce tanıtımından; Türkçesi henüz eklenmedi.'));
}

/** Teknik bilgilerin nereden geldiği — denetlenebilir olsun diye. */
function sourceNote(watch) {
  const url = watch.source?.productUrl;
  if (!url) return null;
  // Alan adı adresten okunur — sabit "casio.com" yazmak Mondaine sayfasında
  // yanlış kaynak gösteriyordu.
  let host;
  try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { host = 'ürün sayfası'; }

  return el('p.note',
    'Teknik bilgiler üreticinin ürün sayfasından alındı: ',
    el('a', { href: url, target: '_blank', rel: 'noopener' }, host),
    watch.source.fetchedAt ? ` (${fmtDate(watch.source.fetchedAt)})` : '');
}

/* Fotoğrafa tıklayınca büyük hâli: panelde ~400 px görünen kapak, büyütmede
 * 1500 px'lik sürümüyle açılır. */
function openLightbox(src, alt) {
  const previous = document.activeElement;
  const close = () => {
    box.remove();
    document.removeEventListener('keydown', onKey);
    if (previous && previous.focus) previous.focus();
  };
  const onKey = (e) => { if (e.key === 'Escape') close(); };

  const button = el('button.lightbox-close', {
    type: 'button', 'aria-label': 'Kapat', onclick: close,
  }, '×');

  const box = el('div.lightbox', {
    role: 'dialog', 'aria-modal': 'true', 'aria-label': alt,
    // Boşluğa tıklayınca kapansın; görselin kendisine tıklamak kapatmasın.
    onclick: (e) => { if (e.target === box) close(); },
  }, el('img', { src, alt }), button);

  document.addEventListener('keydown', onKey);
  document.body.append(box);
  button.focus();
}

/* Üç boy: sm 600 · taban 900 · large 1500. Yollar ui.js'te türetiliyor.
 * Kapak ekranda ~400 px görünüyor → 1× ve 2× ekranda 900 yetiyor, 1500'ü
 * yalnızca 3× ekran çekiyor. Büyütmede her zaman 1500 açılıyor. */

function zoomable(src, alt, extra = {}) {
  const { zoom = src, ...attrs } = extra;
  return el('img.zoomable', {
    src, alt, role: 'button', tabindex: '0',
    title: 'Büyütmek için tıkla',
    onclick: () => openLightbox(zoom, alt),
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(zoom, alt); }
    },
    ...attrs,
  });
}

function photoPanel(watch) {
  const photos = watch.photos || [];
  if (!photos.length) return null;

  return el('section',
    el('div.watch-photo',
      zoomable(photos[0], watchLabel(watch), {
        srcset: `${photos[0]} 900w, ${photoLarge(photos[0])} 1500w`,
        sizes: '(min-width: 900px) 400px, 90vw',
        zoom: photoLarge(photos[0]),
      })),
    photos.length > 1 && el('div.gallery',
      photos.slice(1).map((src, i) =>
        /* Küçük kare 90-130 px görünüyor; 600'lük boy 3× ekranda bile fazlasıyla
           yetiyor. Tıklayınca 1500 açılıyor. */
        zoomable(photoSm(src), `${watchLabel(watch)} — fotoğraf ${i + 2}`,
          { loading: 'lazy', zoom: photoLarge(src) }))),
  );
}


/* Modelin kendisine ait olanlar. Eskiden çıkış tarihi de "Satın alma &
   sahiplik" başlığının altındaydı; bir modelin piyasaya çıkışının o saati
   satın almamla ilgisi yok. */
function modelCard(watch) {
  return specCard('Model', [
    ['Piyasaya çıkış', releaseLabel(watch)],
    // "(çıkışta)" yazıyordu ama elimizdeki değerler üreticinin/yetkili
    // satıcının GÜNCEL liste fiyatları — çıkış anındaki fiyat değil.
    ['Liste fiyatı', msrpRow(watch)],
  ]);
}

/** Kullanıcının kendi nüshasına ait olanlar. */
function acquisitionCard(watch) {
  const a = watch.acquisition || {};
  const v = watch.valuation;
  const rows = [
    // Miras/eski saatlerde tarih tahmin olabiliyor. Kesinmiş gibi göstermek
    // yanlış olurdu; dateApprox işaretliyse ay/yıl düzeyinde ve "civarı" diye.
    ['Satın alma tarihi', a.date
      ? (a.dateApprox
          ? `${fmtDate(a.date, { year: 'numeric', month: 'long' })} civarı (tahmini)`
          : fmtDate(a.date))
      : null],
    ['Durum', CONDITION_TR[a.condition] || a.condition],
    ['Kutu & belgeler', a.boxPapers == null ? null : (a.boxPapers ? 'Var' : 'Yok')],
    /* Bu dördü depoya HİÇ girmiyor (fiyat/satıcı/seri no/değer Drive'da durur) ve
       build.mjs yayın kopyasından ayrıca siliyor. Satırlar duruyor ki bir gün yerel
       olarak girilirse görünsün; boşken specRow zaten basmıyor. */
    ['Satın alma fiyatı', a.price && fmtMoney(a.price.amount, a.price.currency)],
    ['Satıcı', a.seller],
    ['Seri numarası', a.serial],
    ['Güncel değer', v && `${fmtMoney(v.amount, v.currency)}${v.asOf ? ` (${fmtDate(v.asOf, { year: 'numeric', month: 'short' })})` : ''}`],
    ['Son servis', watch.service?.lastServiceDate ? fmtDate(watch.service.lastServiceDate) : null],
  ];
  return specCard('Sahiplik', rows);
}

function specRow(label, value) {
  return el('tr', el('th', label), el('td', value));
}

function specCard(title, rows) {
  const filled = rows.filter(([, v]) => v != null && v !== '');
  if (!filled.length) return null;
  return el('section',
    el('h3', title),
    el('table.spec-table', el('tbody', filled.map(([k, v]) => specRow(k, v)))));
}
