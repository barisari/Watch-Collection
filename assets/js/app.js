/* Uygulama kabuğu: yönlendirme, tema ve görünürlük modu. */

import { state, loadAll, savePrefs, draftCount } from './data.js';
import { el, clear, hideTip, toast } from './ui.js';
import { renderCollection } from './views/collection.js';
import { renderDetail } from './views/detail.js';
import { renderCalendar } from './views/calendar.js';
import { renderStats } from './views/stats.js';
import { renderLog } from './views/log.js';

const viewHost = document.getElementById('view');

/* ------------------------------------------------------------------- tema */

function applyTheme() {
  const theme = state.prefs.theme;
  if (theme) document.documentElement.setAttribute('data-theme', theme);
  else document.documentElement.removeAttribute('data-theme');
}

function currentTheme() {
  if (state.prefs.theme) return state.prefs.theme;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/* -------------------------------------------------------- görünürlük modu */

function applyMode() {
  const on = state.prefs.collectorMode;
  const btn = document.getElementById('mode-toggle');
  const label = document.getElementById('mode-label');
  if (btn) btn.setAttribute('aria-pressed', String(on));
  if (label) label.textContent = on ? 'Koleksiyoner modu' : 'Herkese açık';
}

/* --------------------------------------------------------------- başlık/altbilgi */

function bindChrome() {
  const set = (name, value) => {
    for (const node of document.querySelectorAll(`[data-bind="${name}"]`)) node.textContent = value;
  };
  set('collectionName', state.config.collectionName || 'Saat Koleksiyonum');
  set('tagline', state.config.tagline || '');
  set('watchCount', String(state.watches.length));
  set('wearCount', String(state.wears.length));
  document.title = state.config.collectionName || 'Saat Koleksiyonum';

  const status = document.getElementById('draft-status');
  if (status) {
    const n = draftCount();
    status.textContent = n
      ? `${n} değişiklik bu tarayıcıda bekliyor — “Kayıt ekle” sekmesinden JSON olarak indirip depoya işleyebilirsin.`
      : '';
  }
}

/* ------------------------------------------------------------- yönlendirme */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '');
  const [pathPart, queryPart] = raw.split('?');
  const parts = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  return { route: parts[0] || 'koleksiyon', id: parts[1] || null, params: new URLSearchParams(queryPart || '') };
}

function navigate(hash, replace = false) {
  if (replace && location.hash === hash) { render(); return; }
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  if (replace) render();
}

function markTabs(route) {
  for (const a of document.querySelectorAll('.tabs a')) {
    const active = a.dataset.route === route || (route === 'saat' && a.dataset.route === 'koleksiyon');
    if (active) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
}

function render() {
  hideTip();
  const { route, id, params } = parseHash();
  clear(viewHost);
  markTabs(route);
  bindChrome();

  try {
    switch (route) {
      case 'saat':      renderDetail(viewHost, id, navigate); break;
      case 'takvim':    renderCalendar(viewHost, navigate); break;
      case 'istatistik': renderStats(viewHost, navigate); break;
      case 'kayit':     renderLog(viewHost, params, navigate); break;
      default:          renderCollection(viewHost, navigate); break;
    }
  } catch (err) {
    console.error(err);
    viewHost.append(
      el('div.card',
        el('h2', 'Bir şeyler ters gitti'),
        el('p', 'Bu bölüm çizilemedi. Tarayıcı konsolunda ayrıntı var.'),
        el('p.muted', String(err && err.message ? err.message : err))));
  }
}

/* ------------------------------------------------------------------- açılış */

async function main() {
  await loadAll();
  applyTheme();
  applyMode();

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    state.prefs.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    savePrefs();
    applyTheme();
  });

  document.getElementById('mode-toggle')?.addEventListener('click', () => {
    state.prefs.collectorMode = !state.prefs.collectorMode;
    savePrefs();
    applyMode();
    render();
    toast(state.prefs.collectorMode
      ? 'Koleksiyoner modu açık — fiyat, değer ve seri numarası görünür.'
      : 'Herkese açık mod — hassas alanlar gizli.');
  });

  addEventListener('hashchange', render);
  render();

  if (!state.watches.length) {
    console.info('data/watches.json boş görünüyor. Siteyi bir web sunucusu üzerinden açtığından emin ol: node scripts/serve.mjs');
  }
}

main();
