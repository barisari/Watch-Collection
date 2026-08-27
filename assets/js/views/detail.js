/* Tek bir saatin künyesi: teknik özellikler, satın alma bilgisi, rotasyon özeti. */

import { state, getWatch, canShow, isPrivateField, upsertWear } from '../data.js';
import { perWatchStats, todayISO } from '../stats.js';
import {
  el, fmtDate, fmtMoney, fmtNum, relDays, watchLabel, colorForWatch, emptyState, toast,
} from '../ui.js';

const MOVEMENT_TR = {
  automatic: 'Otomatik', manual: 'Manuel kurmalı', quartz: 'Kuvars',
  'spring-drive': 'Spring Drive', solar: 'Solar', 'kinetic': 'Kinetic',
};
const CONDITION_TR = {
  new: 'Sıfır', 'like-new': 'Sıfır ayarında', excellent: 'Çok iyi',
  good: 'İyi', fair: 'Orta', vintage: 'Vintage',
};
const STATUS_TR = { owned: 'Koleksiyonda', sold: 'Satıldı', wishlist: 'İstek listesi' };

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
            watch.year,
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
        specCard('Mekanizma', [
          ['Kalibre', s.movement?.caliber],
          ['Tip', MOVEMENT_TR[s.movement?.type] || s.movement?.type],
          ['Güç rezervi', s.movement?.powerReserve && `${s.movement.powerReserve} saat`],
          ['Frekans', s.movement?.frequency && `${fmtNum(s.movement.frequency)} A/s`],
          ['Taş sayısı', s.movement?.jewels],
          ['Sertifika', s.movement?.certification],
        ]),
        specCard('Kasa', [
          ['Malzeme', s.case?.material],
          ['Çap', s.case?.diameter && `${s.case.diameter} mm`],
          ['Kalınlık', s.case?.thickness && `${s.case.thickness} mm`],
          ['Kulaktan kulağa', s.case?.lugToLug && `${s.case.lugToLug} mm`],
          ['Kayış genişliği', s.case?.lugWidth && `${s.case.lugWidth} mm`],
          ['Cam', s.case?.crystal],
          ['Su geçirmezlik', s.case?.waterResistance && `${s.case.waterResistance} m`],
          ['Bezel', s.case?.bezel],
        ]),
        specCard('Kadran & kayış', [
          ['Kadran rengi', s.dial?.color],
          ['İndeksler', s.dial?.indices],
          ['Işıma', s.dial?.lume],
          ['Komplikasyonlar', s.dial?.complications?.length ? s.dial.complications.join(', ') : null],
          ['Kayış tipi', s.strap?.type],
          ['Kayış malzemesi', s.strap?.material],
          ['Toka', s.strap?.clasp],
        ]),
        acquisitionCard(watch),
        watch.notes && el('div.card', el('h3', 'Notlar'), el('p', { style: { margin: 0 } }, watch.notes)),
      ),
    ),
  );
}

function photoPanel(watch) {
  const photos = watch.photos || [];
  return el('div.card',
    el('div.watch-photo', { style: { borderRadius: '8px', border: '1px solid var(--border)', marginBottom: photos.length > 1 ? '12px' : '0' } },
      photos[0]
        ? el('img', { src: photos[0], alt: watchLabel(watch) })
        : el('span.placeholder', { 'aria-hidden': 'true' }, '⌚')),
    photos.length > 1 && el('div.gallery',
      photos.slice(1).map((src, i) => el('img', { src, alt: `${watchLabel(watch)} — fotoğraf ${i + 2}`, loading: 'lazy' }))),
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
    ['Satın alma tarihi', a.date ? fmtDate(a.date) : null],
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

/** Gizli alanlar: mod kapalıysa kilit metni, yayın derlemesinde açıklama döner. */
function privateCell(watch, path, rendered) {
  if (!isPrivateField(path)) return rendered;
  if (!canShow(path)) return el('span.locked', 'gizli');
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
