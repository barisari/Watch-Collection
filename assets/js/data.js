/* ---------------------------------------------------------------------------
   Veri katmanı.

   İki kaynak vardır ve ikisi bilinçli olarak ayrıdır:

   1) data/*.json  — ASIL VERİ. Depoda (git) durur, versiyonludur, yedeklidir.
      Sitede gördüğün her şeyin temeli budur.

   2) tarayıcı taslakları (localStorage) — SADECE O TARAYICIDA. Site üzerinden
      yaptığın ekleme/düzenleme buraya yazılır; kimse başkasının verisini
      değiştiremez, çünkü herkesin taslağı kendi cihazında kalır. Taslaklar
      "JSON indir" ile dosyaya aktarılıp depoya işlenerek kalıcı hale gelir.

   Yani siteyi ziyaret eden biri form doldurursa yalnızca kendi ekranını
   değiştirmiş olur; senin verine ulaşamaz.
--------------------------------------------------------------------------- */

const DRAFT_KEY = 'watch-collection:drafts:v1';
const PREFS_KEY = 'watch-collection:prefs:v1';

export const state = {
  config: {},
  fileWatches: [],
  fileWears: [],
  watches: [],
  wears: [],
  drafts: emptyDrafts(),
  prefs: { collectorMode: false, theme: null },
  /** Yayınlanan veride gizli alanlar temizlenmişse true. */
  strippedBuild: false,
};

function emptyDrafts() {
  return {
    watches: { upserts: {}, deletes: [] },
    wears: { upserts: {}, deletes: [] },
  };
}

export const wearKey = (w) => `${w.date}|${w.watchId}`;

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
function saveDrafts() { writeStore(DRAFT_KEY, state.drafts); }

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
  const [config, watches, wears] = await Promise.all([
    loadJSON('site.config.json', {}),
    loadJSON('data/watches.json', []),
    loadJSON('data/wears.json', []),
  ]);

  state.config = {
    collectionName: 'Saat Koleksiyonum',
    tagline: '',
    defaultCurrency: 'USD',
    locale: 'tr-TR',
    neglectedAfterDays: 60,
    privateFields: ['acquisition.price', 'acquisition.seller', 'acquisition.serial', 'valuation'],
    ...config,
  };

  state.fileWatches = Array.isArray(watches) ? watches : [];
  state.fileWears = Array.isArray(wears) ? wears : [];

  // Yayın derlemesinde gizli alanlar silinmiş olabilir. Bunu verinin
  // yokluğundan TAHMİN ETMİYORUZ — "silindi" ile "hiç girilmedi" aynı görünür.
  // scripts/build.mjs temizlediği derlemeye bu bayrağı açıkça yazar.
  state.strippedBuild = state.config.strippedBuild === true;

  state.drafts = readStore(DRAFT_KEY, emptyDrafts());
  state.prefs = readStore(PREFS_KEY, { collectorMode: false, theme: null });

  recompute();
}

/* --------------------------------------------------- dosya + taslak birleşimi */

export function recompute() {
  const wd = state.drafts.watches;
  const watchDeletes = new Set(wd.deletes);
  const byId = new Map();
  for (const w of state.fileWatches) {
    if (!watchDeletes.has(w.id)) byId.set(w.id, w);
  }
  for (const [id, w] of Object.entries(wd.upserts)) {
    if (!watchDeletes.has(id)) byId.set(id, w);
  }
  state.watches = [...byId.values()];

  const rd = state.drafts.wears;
  const wearDeletes = new Set(rd.deletes);
  const byKey = new Map();
  for (const w of state.fileWears) {
    const k = wearKey(w);
    if (!wearDeletes.has(k)) byKey.set(k, w);
  }
  for (const [k, w] of Object.entries(rd.upserts)) {
    if (!wearDeletes.has(k)) byKey.set(k, w);
  }
  // Var olmayan saate bağlı kayıtları düşür (saat silinmiş olabilir).
  const known = new Set(state.watches.map((w) => w.id));
  state.wears = [...byKey.values()]
    .filter((w) => known.has(w.watchId))
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const draftCount = () => {
  const d = state.drafts;
  return Object.keys(d.watches.upserts).length + d.watches.deletes.length +
         Object.keys(d.wears.upserts).length + d.wears.deletes.length;
};

/* ----------------------------------------------------------- değiştiriciler */

export function upsertWatch(watch) {
  state.drafts.watches.upserts[watch.id] = watch;
  state.drafts.watches.deletes = state.drafts.watches.deletes.filter((id) => id !== watch.id);
  saveDrafts();
  recompute();
}

export function deleteWatch(id) {
  delete state.drafts.watches.upserts[id];
  if (state.fileWatches.some((w) => w.id === id) && !state.drafts.watches.deletes.includes(id)) {
    state.drafts.watches.deletes.push(id);
  }
  saveDrafts();
  recompute();
}

export function upsertWear(entry) {
  const k = wearKey(entry);
  state.drafts.wears.upserts[k] = entry;
  state.drafts.wears.deletes = state.drafts.wears.deletes.filter((x) => x !== k);
  saveDrafts();
  recompute();
}

export function deleteWear(entry) {
  const k = wearKey(entry);
  delete state.drafts.wears.upserts[k];
  if (state.fileWears.some((w) => wearKey(w) === k) && !state.drafts.wears.deletes.includes(k)) {
    state.drafts.wears.deletes.push(k);
  }
  saveDrafts();
  recompute();
}

export function clearDrafts() {
  state.drafts = emptyDrafts();
  saveDrafts();
  recompute();
}

/* ---------------------------------------------------------- gizli alanlar */

const getPath = (obj, path) =>
  path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);

/** Koleksiyoner modu kapalıyken bu alan gizlenmeli mi? */
export function isPrivateField(path) {
  return (state.config.privateFields || []).includes(path);
}

/** Alan şu an gösterilebilir mi? */
export function canShow(path) {
  return !isPrivateField(path) || state.prefs.collectorMode;
}

/** Değeri getir; gizliyse ve mod kapalıysa null döner. */
export function privateValue(watch, path) {
  if (!canShow(path)) return null;
  return getPath(watch, path);
}

/* ------------------------------------------------------------------ dışa aktarım */

export function exportJSON(kind) {
  const data = kind === 'watches' ? state.watches : state.wears;
  const sorted = kind === 'watches'
    ? [...data].sort((a, b) => `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'tr'))
    : [...data].sort((a, b) => a.date.localeCompare(b.date) || a.watchId.localeCompare(b.watchId));
  return JSON.stringify(sorted, null, 2) + '\n';
}

export function downloadJSON(kind) {
  const blob = new Blob([exportJSON(kind)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = kind === 'watches' ? 'watches.json' : 'wears.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const getWatch = (id) => state.watches.find((w) => w.id === id) || null;

/** Marka + model + referanstan çakışmayan bir kimlik üretir. */
export function makeId(brand, model, reference) {
  const slug = [brand, model, reference]
    .filter(Boolean).join(' ')
    .toLowerCase()
    .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
    .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const base = slug || 'saat';
  let id = base;
  let n = 2;
  while (state.watches.some((w) => w.id === id)) id = `${base}-${n++}`;
  return id;
}
