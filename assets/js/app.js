/* Uygulama kabuğu: yönlendirme ve tema. */

import { state, loadAll, savePrefs } from './data.js';
import { el, clear } from './ui.js';
import { renderCollection } from './views/collection.js';
import { renderDetail } from './views/detail.js';

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

/* --------------------------------------------------------------- başlık/altbilgi */

function bindChrome() {
  const set = (name, value) => {
    for (const node of document.querySelectorAll(`[data-bind="${name}"]`)) node.textContent = value;
  };
  set('watchCount', String(state.watches.length));
  document.title = state.config.collectionName || 'Saat Koleksiyonum';
}

/* ------------------------------------------------------------- yönlendirme */

function parseHash() {
  const raw = location.hash.replace(/^#\/?/, '').split('?')[0];
  const parts = raw.split('/').filter(Boolean).map(decodeURIComponent);
  return { route: parts[0] || 'koleksiyon', id: parts[1] || null };
}

const navigate = (hash) => { location.hash = hash; };

/* Sorun: ızgarada aşağı inip bir saate tıklayınca detay sayfası ortasından
 * açılıyordu. Hash yönlendirmesi içeriği değiştiriyor ama tarayıcı kaydırmayı
 * olduğu yerde bırakıyor.
 *
 * Koşulsuz başa sarmak yanlış olurdu: render() aynı görünüm için yeniden
 * çağrılabiliyor, o durumda sayfa yerinden oynamamalı. Bu yüzden yalnızca rota
 * ya da kimlik değişince sarıyor. */
let lastKey = null;

function render() {
  const { route, id } = parseHash();
  const key = `${route}/${id || ''}`;
  clear(viewHost);
  bindChrome();

  try {
    switch (route) {
      case 'saat':      renderDetail(viewHost, id, navigate); break;
      default:          renderCollection(viewHost, navigate); break;
    }
  } catch (err) {
    console.error(err);
    viewHost.append(
      el('div.empty-state',
        el('h2', 'Bir şeyler ters gitti'),
        el('p', 'Bu bölüm çizilemedi. Tarayıcı konsolunda ayrıntı var.'),
        el('p.muted', String(err && err.message ? err.message : err))));
  }

  if (key !== lastKey) {
    window.scrollTo(0, 0);
    lastKey = key;
  }
}

/* ------------------------------------------------------------------- açılış */

async function main() {
  await loadAll();
  applyTheme();

  document.getElementById('theme-toggle')?.addEventListener('click', () => {
    state.prefs.theme = currentTheme() === 'dark' ? 'light' : 'dark';
    savePrefs();
    applyTheme();
  });

  addEventListener('hashchange', render);
  render();

  if (!state.watches.length) {
    console.info('data/watches.json boş görünüyor. Siteyi bir web sunucusu üzerinden açtığından emin ol: node scripts/serve.mjs');
  }
}

main();
