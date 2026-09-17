/* ---------------------------------------------------------------------------
   Küçük arayüz yardımcıları: DOM kurucu, biçimlendiriciler, renk eşlemesi.
   Metin her zaman textContent ile yazılır — veri hiçbir zaman HTML olarak
   yorumlanmaz.

   17 Eylül 2026'da 13 yardımcı silindi (appendAll, fmtShortDate, fmtPct,
   relDays, todayISO, watchShort, watchCode, colorOrAxis, ipucu balonu,
   toast, tableView) — hepsi kaldırılan takvim/istatistik/kayıt ekranlarına
   aitti. Kullanılmayan yardımcı biriktirme; gerektiğinde yeniden yaz.
--------------------------------------------------------------------------- */

import { state } from './data.js';
/** el('div.card', { id:'x' }, child, 'metin') — spec 'etiket#kimlik.sınıf.sınıf' */
export function el(spec, attrs, ...children) {
  const [selector, ...classes] = spec.split('.');
  const [tagPart, idPart] = selector.split('#');
  const node = document.createElement(tagPart || 'div');
  if (idPart) node.id = idPart;
  if (classes.length) node.className = classes.join(' ');

  if (attrs && attrs.nodeType === undefined && typeof attrs === 'object' && !Array.isArray(attrs)) {
    for (const [key, value] of Object.entries(attrs)) {
      if (value == null || value === false) continue;
      if (key === 'onclick' || key === 'oninput' || key === 'onchange' || key === 'onsubmit') {
        node.addEventListener(key.slice(2), value);
      } else if (key === 'dataset') {
        Object.assign(node.dataset, value);
      } else if (key === 'style') {
        Object.assign(node.style, value);
      } else if (key in node && key !== 'list' && key !== 'form') {
        node[key] = value;
      } else {
        node.setAttribute(key, value === true ? '' : String(value));
      }
    }
  } else if (attrs != null) {
    children.unshift(attrs);
  }

  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child.nodeType ? child : document.createTextNode(String(child)));
  }
  return node;
}

export const clear = (node) => { while (node.firstChild) node.removeChild(node.firstChild); };

/* ------------------------------------------------------------ biçimlendirme */

const locale = () => state.config.locale || 'tr-TR';

export function fmtDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), opts);
}

export function fmtMoney(amount, currency) {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat(locale(), {
      style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${Math.round(amount).toLocaleString(locale())} ${currency || ''}`.trim();
  }
}

export const fmtNum = (n, digits = 0) =>
  n == null ? '—' : n.toLocaleString(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits });

export const watchLabel = (w) => (w ? `${w.brand} ${w.model}` : 'Bilinmeyen saat');

/* -------------------------------------------------------------------- renk */

/**
 * Saat kimliğini sabit bir renk yuvasına eşler.
 * Renk saatin KENDİSİNE bağlıdır (koleksiyondaki sırasına), sıralamaya değil —
 * filtreleme renkleri kaydırmaz. Palet 8 yuvayla sınırlıdır; 8'den fazla saat
 * varsa renk tamamen bırakılır ve kimliği yalnızca yazı taşır.
 */
export function colorForWatch(id) {
  const order = state.watches.map((w) => w.id);
  if (order.length > 8) return null;
  const i = order.indexOf(id);
  return i === -1 ? null : `var(--series-${i + 1})`;
}

/* ------------------------------------------------------------ ortak parçalar */

export const emptyState = (icon, message, hint) =>
  el('div.empty-state', el('span.big', icon), el('p', message), hint && el('p.muted', hint));
