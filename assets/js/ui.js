/* ---------------------------------------------------------------------------
   Küçük arayüz yardımcıları: DOM kurucu, biçimlendiriciler, ipucu balonu.
   Metin her zaman textContent ile yazılır — veri hiçbir zaman HTML olarak
   yorumlanmaz.
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

/** node.append() null'ı "null" metnine çevirir; bu sarmalayıcı boşları eler. */
export const appendAll = (node, ...children) => {
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child);
  }
  return node;
};

/* ------------------------------------------------------------ biçimlendirme */

const locale = () => state.config.locale || 'tr-TR';

export function fmtDate(iso, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale(), opts);
}

export const fmtShortDate = (iso) => fmtDate(iso, { day: 'numeric', month: 'short', year: '2-digit' });

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

export const fmtPct = (ratio) => `%${Math.round(ratio * 100)}`;

/** "3 gün önce" / "bugün" */
export function relDays(days) {
  if (days == null) return 'hiç takılmadı';
  if (days === 0) return 'bugün';
  if (days === 1) return 'dün';
  return `${days} gün önce`;
}

export const watchLabel = (w) => (w ? `${w.brand} ${w.model}` : 'Bilinmeyen saat');
export const watchShort = (w) => (w ? (w.nickname || w.model) : '—');

/**
 * Takvim hücresine sığan çok kısa ad. Sırasıyla: kaydın kendi `shortCode`
 * alanı, kısa bir takma ad, modelin ilk kelimesi. Hücreler dar olduğu için
 * 6 karakterden uzun adlar kısaltılır — tam ad ipucunda ve tabloda durur.
 */
export function watchCode(w) {
  if (!w) return '—';
  if (w.shortCode) return w.shortCode;
  const base = w.nickname || w.model || '';
  if (base.length <= 6) return base;
  const first = base.split(/\s+/)[0];
  return first.length <= 6 ? first : first.slice(0, 6);
}

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

export const colorOrAxis = (id) => colorForWatch(id) || 'var(--axis)';

/* ------------------------------------------------------------ ipucu balonu */

let tipNode = null;

export function showTip(event, title, rows = []) {
  if (!tipNode) {
    tipNode = el('div.tooltip');
    document.body.appendChild(tipNode);
  }
  clear(tipNode);
  tipNode.append(el('div.t-title', title));
  for (const row of rows) tipNode.append(el('div.t-row', row));
  tipNode.hidden = false;
  moveTip(event);
}

export function moveTip(event) {
  if (!tipNode || tipNode.hidden) return;
  const pad = 14;
  const rect = tipNode.getBoundingClientRect();
  let x = event.clientX + pad;
  let y = event.clientY + pad;
  if (x + rect.width > window.innerWidth - 8) x = event.clientX - rect.width - pad;
  if (y + rect.height > window.innerHeight - 8) y = event.clientY - rect.height - pad;
  tipNode.style.left = `${Math.max(8, x)}px`;
  tipNode.style.top = `${Math.max(8, y)}px`;
}

export function hideTip() { if (tipNode) tipNode.hidden = true; }

/** Bir öğeye ipucu bağlar (fare + klavye odağı aynı bilgiyi verir). */
export function attachTip(node, title, rows = []) {
  node.addEventListener('mouseenter', (e) => showTip(e, title, rows));
  node.addEventListener('mousemove', moveTip);
  node.addEventListener('mouseleave', hideTip);
  node.addEventListener('focus', (e) => {
    const r = node.getBoundingClientRect();
    showTip({ clientX: r.left, clientY: r.bottom }, title, rows);
  });
  node.addEventListener('blur', hideTip);
  return node;
}

/* ------------------------------------------------------------------ bildirim */

let toastTimer = null;

export function toast(message) {
  const node = document.getElementById('toast');
  if (!node) return;
  node.textContent = message;
  node.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { node.hidden = true; }, 3200);
}

/* ------------------------------------------------------------ ortak parçalar */

export const emptyState = (icon, message, hint) =>
  el('div.empty-state', el('span.big', icon), el('p', message), hint && el('p.muted', hint));

export function tableView(summaryText, table) {
  return el('details.table-view', el('summary', summaryText), el('div.table-scroll', table));
}
