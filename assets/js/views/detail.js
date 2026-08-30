/* Tek bir saatin künyesi: teknik özellikler, satın alma bilgisi, rotasyon özeti. */

import { state, getWatch, canShow, isPrivateField, upsertWear } from '../data.js';
import { perWatchStats, todayISO } from '../stats.js';
import {
  el, fmtDate, fmtMoney, fmtNum, relDays, watchLabel, colorForWatch, emptyState, toast,
} from '../ui.js';
import { term, termList, waterResistance } from '../terms.js';

const CONDITION_TR = {
  new: 'Sıfır', 'like-new': 'Sıfır ayarında', excellent: 'Çok iyi',
  good: 'İyi', fair: 'Orta', vintage: 'Vintage',
};
const STATUS_TR = { owned: 'Koleksiyonda', sold: 'Satıldı', wishlist: 'İstek listesi' };

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
               'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

/** "2019-08" → "Ağustos 2019 çıkışlı" · "2023" → "2023 çıkışlı" */
function releaseLabel(watch) {
  const r = watch.releaseDate;
  if (!r) return null;
  const [y, m] = String(r).split('-');
  return m ? `${AYLAR[Number(m) - 1]} ${y} çıkışlı` : `${y} çıkışlı`;
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
    .map((p) => (p.tahmin ? '~' : '') + fmtMoney(p.amt, p.cur))
    .join(' · ');
}

export function renderDetail(root, id, navigate) {
  const watch = getWatch(id);
  if (!watch) {
    root.append(emptyState('🔍', 'Bu saat bulunamadı.', 'Silinmiş ya da bağlantı hatalı olabilir.'),
      el('p', { style: { textAlign: 'center' } },
        el('button.btn', { type: 'button', onclick: () => navigate('#/koleksiyon') }, 'Koleksiyona dön')));
    return;
  }

  const row = perWatchStats().find((r) => r.id === id);
  const color = colorForWatch(id);
  const s = watch.specs || {};

  root.append(
    el('p', el('button.btn.btn-sm', { type: 'button', onclick: () => navigate('#/koleksiyon') }, '← Koleksiyon')),

    el('div.detail-head',
      el('div',
        el('div.watch-brand',
          color && el('span.swatch', { style: { background: color, display: 'inline-block', marginRight: '6px' }, 'aria-hidden': 'true' }),
          watch.brand),
        el('h1', watch.model),
        el('p.muted',
          [
            watch.reference !== watch.model ? watch.reference : null,
            releaseLabel(watch),
            watch.nickname && `“${watch.nickname}”`,
          ].filter(Boolean).join(' · '))),
      el('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } },
        el('button.btn.btn-primary', {
          type: 'button',
          onclick: () => {
            upsertWear({ date: todayISO(), watchId: id, note: '' });
            toast(`${watchLabel(watch)} bugüne kaydedildi (tarayıcı taslağı).`);
            navigate(`#/saat/${encodeURIComponent(id)}`, true);
          },
        }, 'Bugün bunu taktım'),
        el('button.btn', { type: 'button', onclick: () => navigate(`#/kayit?duzenle=${encodeURIComponent(id)}`) }, 'Düzenle')),
    ),

    el('div.detail-grid',
      el('div.stack',
        photoPanel(watch),
        rotationPanel(row, watch),
      ),
      el('div.stack',
        storyCard(watch),
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
        watch.notes && el('div.card', el('h3', 'Notlar'), el('p', { style: { margin: 0 } }, watch.notes)),
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
  return el('div.card',
    tagline && el('p', { style: { fontSize: '15.5px', fontWeight: '520', margin: story ? '0 0 12px' : '0' } }, tagline),
    story && el('p', { style: { margin: 0, color: 'var(--text-secondary)' } }, story),
    onlyEnglish && el('p.muted', { style: { marginTop: '10px', marginBottom: 0 } },
      'Bu metin Casio\'nun İngilizce tanıtımından; Türkçesi henüz eklenmedi.'));
}

/** Teknik bilgilerin nereden geldiği — denetlenebilir olsun diye. */
function sourceNote(watch) {
  const url = watch.source?.productUrl;
  if (!url) return null;
  return el('p.muted', { style: { margin: 0 } },
    'Teknik bilgiler üreticinin ürün sayfasından alındı: ',
    el('a', { href: url, target: '_blank', rel: 'noopener' }, 'casio.com'),
    watch.source.fetchedAt ? ` · ${fmtDate(watch.source.fetchedAt)}` : '');
}

/* Fotoğrafa tıklayınca büyük hâli. Görseller 900×900 saklanıyor ama panelde
 * ~400 px görünüyor; büyütme onları tam boyutunda gösteriyor. */
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

function zoomable(src, alt, extra = {}) {
  return el('img.zoomable', {
    src, alt, role: 'button', tabindex: '0',
    title: 'Büyütmek için tıkla',
    onclick: () => openLightbox(src, alt),
    onkeydown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(src, alt); }
    },
    ...extra,
  });
}

function photoPanel(watch) {
  const photos = watch.photos || [];
  return el('div.card',
    el('div.watch-photo', { style: { borderRadius: '8px', border: '1px solid var(--border)', marginBottom: photos.length > 1 ? '12px' : '0' } },
      photos[0]
        ? zoomable(photos[0], watchLabel(watch))
        : el('span.placeholder', { 'aria-hidden': 'true' }, '⌚')),
    photos.length > 1 && el('div.gallery',
      photos.slice(1).map((src, i) =>
        zoomable(src, `${watchLabel(watch)} — fotoğraf ${i + 2}`, { loading: 'lazy' }))),
    !photos.length && el('p.muted', { style: { margin: '10px 0 0', textAlign: 'center' } },
      'Fotoğraf eklemek için dosyayı photos/ klasörüne koy ve yolunu saat kaydına yaz.'),
  );
}

function rotationPanel(row, watch) {
  if (!row) return null;
  const recent = state.wears
    .filter((w) => w.watchId === watch.id)
    .slice(-8).reverse();

  return el('div.card',
    el('h3', 'Rotasyon'),
    el('table.spec-table',
      el('tbody',
        specRow('Toplam takılma', row.days ? `${row.days} gün` : 'Henüz takılmadı'),
        specRow('Rotasyon payı', row.days ? `%${Math.round(row.share * 100)}` : '—'),
        specRow('Son takılma', row.lastWorn ? `${fmtDate(row.lastWorn)} (${relDays(row.daysSince)})` : '—'),
        specRow('İlk takılma', row.firstWorn ? fmtDate(row.firstWorn) : '—'),
        specRow('En uzun seri', row.longestStreak ? `${row.longestStreak} gün` : '—'),
        row.costPerWear != null && canShow('acquisition.price')
          ? specRow('Takılma başına maliyet', fmtMoney(row.costPerWear, row.currency))
          : null,
      )),
    recent.length ? el('div', { style: { marginTop: '14px' } },
      el('h3', 'Son kayıtlar'),
      el('div.chips', recent.map((w) => el('span.chip', fmtDate(w.date, { day: 'numeric', month: 'short' }))))) : null,
  );
}

function acquisitionCard(watch) {
  const a = watch.acquisition || {};
  const v = watch.valuation;
  const rows = [
    ['Piyasaya çıkış', releaseLabel(watch)?.replace(' çıkışlı', '')],
    // "(çıkışta)" yazıyordu ama elimizdeki değerler üreticinin/yetkili
    // satıcının GÜNCEL liste fiyatları — çıkış anındaki fiyat değil.
    ['Liste fiyatı', msrpRow(watch)],
    // Miras/eski saatlerde tarih tahmin olabiliyor. Kesinmiş gibi göstermek
    // yanlış olurdu; dateApprox işaretliyse ay/yıl düzeyinde ve "civarı" diye.
    ['Satın alma tarihi', a.date
      ? (a.dateApprox
          ? `${fmtDate(a.date, { year: 'numeric', month: 'long' })} civarı (tahmini)`
          : fmtDate(a.date))
      : null],
    ['Durum', CONDITION_TR[a.condition] || a.condition],
    ['Kutu & belgeler', a.boxPapers == null ? null : (a.boxPapers ? 'Var' : 'Yok')],
    ['Koleksiyon durumu', STATUS_TR[watch.status ?? 'owned'] || watch.status],
    ['Satın alma fiyatı', privateCell(watch, 'acquisition.price', a.price && fmtMoney(a.price.amount, a.price.currency))],
    ['Satıcı', privateCell(watch, 'acquisition.seller', a.seller)],
    ['Seri numarası', privateCell(watch, 'acquisition.serial', a.serial)],
    ['Güncel değer', privateCell(watch, 'valuation', v && `${fmtMoney(v.amount, v.currency)}${v.asOf ? ` (${fmtDate(v.asOf, { year: 'numeric', month: 'short' })})` : ''}`)],
    ['Son servis', watch.service?.lastServiceDate ? fmtDate(watch.service.lastServiceDate) : null],
  ];
  return specCard('Satın alma & sahiplik', rows);
}

/**
 * Gizli alanlar. "gizli" yazısı YALNIZCA veri gerçekten varken çıkar —
 * hiç girilmemiş bir alan için kilit göstermek, elimizde bir şey varmış
 * izlenimi verirdi.
 */
function privateCell(watch, path, rendered) {
  if (!isPrivateField(path)) return rendered;
  if (!canShow(path)) return rendered ? el('span.locked', 'gizli') : null;
  if (rendered) return rendered;
  return state.strippedBuild
    ? el('span.locked', 'bu yayında yer almıyor')
    : null;
}

function specRow(label, value) {
  return el('tr', el('th', label), el('td', value));
}

function specCard(title, rows) {
  const filled = rows.filter(([, v]) => v != null && v !== '');
  if (!filled.length) return null;
  return el('div.card',
    el('h3', title),
    el('table.spec-table', el('tbody', filled.map(([k, v]) => specRow(k, v)))));
}
