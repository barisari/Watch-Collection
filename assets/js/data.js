/* ---------------------------------------------------------------------------
   Veri katmanı. Tek kaynak: `data/watches.json` — depoda, versiyonlu.

   Site SALT OKUNUR. Eskiden tarayıcı taslakları (localStorage) üzerinden
   ekleme/düzenleme yapılabiliyordu; 17 Eylül 2026'da kaldırıldı. Sebebi:
   o form gerçek giriş yolu olamıyordu. Bir saat eklemek sadece satır yazmak
   değil — görseli indirmek, aslını arşivlemek, 900/1500 sürümlerini üretmek
   ve teknik özellikleri üreticinin sayfasından doğrulamak gerekiyor. Envanter
   depo tarafındaki betiklerle yönetiliyor (bkz. CLAUDE.md > Komutlar).

   localStorage'da yalnızca tema tercihi duruyor.
--------------------------------------------------------------------------- */

const PREFS_KEY = 'watch-collection:prefs:v1';

export const state = {
  config: {},
  watches: [],
  prefs: { theme: null },
};

/* ---------------------------------------------------------------- depolama */

function readStore(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : structuredClone(fallback);
  } catch {
    // Gizli sekme, kapalı site verisi vb. — taslaksız devam et.
    return structuredClone(fallback);
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function savePrefs() { writeStore(PREFS_KEY, state.prefs); }

/* ------------------------------------------------------------------ yükle */

async function loadJSON(path, fallback) {
  try {
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`${path} okunamadı, boş kabul edildi.`, err);
    return fallback;
  }
}

export async function loadAll() {
  const [config, watches] = await Promise.all([
    loadJSON('site.config.json', {}),
    loadJSON('data/watches.json', []),
  ]);

  // privateFields'ı derleme betiği okuyor (dist kopyasından siler); tarayıcı
  // tarafı kullanmıyor ama varsayılanı burada durması kaynağı tek yerde tutuyor.
  state.config = {
    collectionName: 'Saat Koleksiyonum',
    locale: 'tr-TR',
    privateFields: ['acquisition.price', 'acquisition.seller', 'acquisition.serial', 'valuation'],
    ...config,
  };

  state.watches = Array.isArray(watches) ? watches : [];

  state.prefs = readStore(PREFS_KEY, { theme: null });
}

export const getWatch = (id) => state.watches.find((w) => w.id === id) || null;
