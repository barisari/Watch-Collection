/* "Kayıt ekle": rotasyon kaydı, saat ekleme/düzenleme ve JSON dışa aktarımı.

   Buradaki her değişiklik önce TARAYICI TASLAĞINA yazılır (localStorage).
   Taslak yalnızca bu cihazda durur — siteyi açan başka biri kendi kopyasını
   düzenler, senin verine dokunamaz. Kalıcı hale getirmek için JSON'u indirip
   depodaki data/ klasörüne koyman gerekir. */

import {
  state, upsertWear, upsertWatch, deleteWatch, downloadJSON, clearDrafts,
  draftCount, getWatch, makeId,
} from '../data.js';
import { todayISO } from '../stats.js';
import { el, fmtDate, watchLabel, toast, emptyState } from '../ui.js';

export function renderLog(root, params, navigate) {
  const editId = params.get('duzenle');
  const editing = editId ? getWatch(editId) : null;

  root.append(
    el('h1', 'Kayıt ekle'),
    el('p.lead',
      'Buradan yaptığın değişiklikler önce bu tarayıcıda tutulur. Kalıcı olması için ' +
      'aşağıdan JSON dosyalarını indirip depodaki data/ klasörüne koy ve commit et.'),

    el('div.stack',
      wearForm(navigate),
      watchForm(editing, navigate),
      exportCard(navigate),
    ),
  );
}

/* ------------------------------------------------------- rotasyon kaydı formu */

function wearForm(navigate) {
  const owned = state.watches.filter((w) => (w.status ?? 'owned') === 'owned');
  if (!owned.length) {
    return el('div.card', el('h2', 'Bugün ne taktın?'),
      emptyState('⌚', 'Önce koleksiyona bir saat ekle.', 'Aşağıdaki formu kullanabilirsin.'));
  }

  const date = el('input', { type: 'date', value: todayISO(), required: true, id: 'wear-date' });
  const watch = el('select', { id: 'wear-watch', required: true },
    owned.map((w) => el('option', { value: w.id }, watchLabel(w))));
  const note = el('input', { type: 'text', id: 'wear-note', placeholder: 'örn. toplantı, tatil, yağmurlu gün' });

  const form = el('form', {
    onsubmit: (e) => {
      e.preventDefault();
      upsertWear({ date: date.value, watchId: watch.value, note: note.value.trim() });
      toast(`${watchLabel(getWatch(watch.value))} → ${fmtDate(date.value)} kaydedildi.`);
      note.value = '';
      navigate('#/kayit', true);
    },
  },
    el('div.form-grid',
      field('Tarih', date),
      field('Saat', watch),
      field('Not (isteğe bağlı)', note)),
    el('div.form-actions',
      el('button.btn.btn-primary', { type: 'submit' }, 'Rotasyon kaydını ekle'),
      el('button.btn', {
        type: 'button',
        onclick: () => { date.value = todayISO(); },
      }, 'Bugüne ayarla')),
  );

  return el('div.card', el('h2', 'Bugün ne taktın?'), form);
}

/* ------------------------------------------------------ saat ekleme/düzenleme */

const FIELDS = [
  ['Künye', [
    ['brand', 'Marka', 'text', { required: true, placeholder: 'Omega' }],
    ['model', 'Model', 'text', { required: true, placeholder: 'Speedmaster Professional' }],
    ['nickname', 'Takma ad', 'text', { placeholder: 'Moonwatch' }],
    ['shortCode', 'Takvim kısaltması', 'text', { placeholder: 'Moon', hint: 'En fazla 6 karakter' }],
    ['reference', 'Referans no', 'text', { placeholder: '310.30.42.50.01.001' }],
    ['year', 'Üretim/model yılı', 'number', { min: 1800, max: 2100 }],
    ['category', 'Tür', 'text', { placeholder: 'kronograf, dalgıç, klasik…' }],
    ['status', 'Durum', 'select', { options: [['owned', 'Koleksiyonda'], ['sold', 'Satıldı'], ['wishlist', 'İstek listesi']] }],
  ]],
  ['Mekanizma', [
    ['specs.movement.caliber', 'Kalibre', 'text', { placeholder: 'Omega 3861' }],
    ['specs.movement.type', 'Tip', 'select', { options: [['', '—'], ['automatic', 'Otomatik'], ['manual', 'Manuel kurmalı'], ['quartz', 'Kuvars'], ['spring-drive', 'Spring Drive'], ['solar', 'Solar']] }],
    ['specs.movement.powerReserve', 'Güç rezervi (saat)', 'number', {}],
    ['specs.movement.frequency', 'Frekans (A/s)', 'number', {}],
    ['specs.movement.jewels', 'Taş sayısı', 'number', {}],
    ['specs.movement.certification', 'Sertifika', 'text', { placeholder: 'COSC, METAS…' }],
  ]],
  ['Kasa', [
    ['specs.case.material', 'Malzeme', 'text', { placeholder: 'Paslanmaz çelik' }],
    ['specs.case.diameter', 'Çap (mm)', 'number', { step: '0.1' }],
    ['specs.case.thickness', 'Kalınlık (mm)', 'number', { step: '0.1' }],
    ['specs.case.lugToLug', 'Kulaktan kulağa (mm)', 'number', { step: '0.1' }],
    ['specs.case.lugWidth', 'Kayış genişliği (mm)', 'number', { step: '0.5' }],
    ['specs.case.crystal', 'Cam', 'text', { placeholder: 'Safir' }],
    ['specs.case.waterResistance', 'Su geçirmezlik (m)', 'number', {}],
    ['specs.case.bezel', 'Bezel', 'text', {}],
  ]],
  ['Kadran & kayış', [
    ['specs.dial.color', 'Kadran rengi', 'text', {}],
    ['specs.dial.indices', 'İndeksler', 'text', {}],
    ['specs.dial.lume', 'Işıma', 'text', {}],
    ['specs.dial.complications', 'Komplikasyonlar', 'list', { placeholder: 'kronograf, tarih (virgülle ayır)' }],
    ['specs.strap.type', 'Kayış tipi', 'text', { placeholder: 'Bilezik / Kayış' }],
    ['specs.strap.material', 'Kayış malzemesi', 'text', {}],
    ['specs.strap.clasp', 'Toka', 'text', {}],
  ]],
  ['Satın alma', [
    ['acquisition.date', 'Satın alma tarihi', 'date', {}],
    ['acquisition.price.amount', 'Fiyat', 'number', { step: '0.01', hint: 'Gizli alan' }],
    ['acquisition.price.currency', 'Para birimi', 'text', { placeholder: 'USD', hint: 'Gizli alan' }],
    ['acquisition.seller', 'Satıcı', 'text', { hint: 'Gizli alan' }],
    ['acquisition.condition', 'Alındığındaki durum', 'select', { options: [['', '—'], ['new', 'Sıfır'], ['like-new', 'Sıfır ayarında'], ['excellent', 'Çok iyi'], ['good', 'İyi'], ['fair', 'Orta'], ['vintage', 'Vintage']] }],
    ['acquisition.boxPapers', 'Kutu & belgeler', 'checkbox', {}],
    ['acquisition.serial', 'Seri numarası', 'text', { hint: 'Gizli alan' }],
    ['valuation.amount', 'Güncel değer', 'number', { step: '0.01', hint: 'Gizli alan' }],
    ['valuation.currency', 'Değer para birimi', 'text', { placeholder: 'USD', hint: 'Gizli alan' }],
  ]],
  ['Bakım & diğer', [
    ['service.lastServiceDate', 'Son servis tarihi', 'date', {}],
    ['service.intervalYears', 'Servis aralığı (yıl)', 'number', {}],
    ['photos', 'Fotoğraf yolları', 'list', { placeholder: 'photos/saat-1.jpg, photos/saat-2.jpg', wide: true }],
    ['tags', 'Etiketler', 'list', { placeholder: 'günlük, dalgıç, hediye', wide: true }],
    ['notes', 'Notlar', 'textarea', { wide: true }],
  ]],
];

const getPath = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);

function setPath(obj, path, value) {
  const keys = path.split('.');
  let node = obj;
  for (const key of keys.slice(0, -1)) {
    if (node[key] == null || typeof node[key] !== 'object') node[key] = {};
    node = node[key];
  }
  node[keys.at(-1)] = value;
}

function watchForm(editing, navigate) {
  const inputs = new Map();

  const groups = FIELDS.map(([legendText, defs]) => {
    const grid = el('div.form-grid');
    for (const [path, label, type, opts] of defs) {
      const current = editing ? getPath(editing, path) : undefined;
      const input = makeInput(type, opts, current);
      inputs.set(path, { input, type });
      const wrapper = field(label, input, opts.hint);
      if (opts.wide) wrapper.classList.add('field-wide');
      grid.append(wrapper);
    }
    return el('fieldset', el('legend', legendText), grid);
  });

  const form = el('form', {
    onsubmit: (e) => {
      e.preventDefault();
      const watch = buildWatch(inputs, editing);
      if (!watch) return;
      upsertWatch(watch);
      toast(editing ? `${watchLabel(watch)} güncellendi.` : `${watchLabel(watch)} eklendi.`);
      navigate(`#/saat/${encodeURIComponent(watch.id)}`);
    },
  },
    groups,
    el('div.form-actions',
      el('button.btn.btn-primary', { type: 'submit' }, editing ? 'Değişiklikleri kaydet' : 'Saati koleksiyona ekle'),
      editing && el('button.btn', { type: 'button', onclick: () => navigate('#/kayit') }, 'Yeni saat'),
      editing && el('button.btn.btn-danger', {
        type: 'button',
        onclick: () => {
          if (!confirm(`${watchLabel(editing)} koleksiyondan çıkarılsın mı? (Sadece bu tarayıcıdaki taslakta)`)) return;
          deleteWatch(editing.id);
          toast('Saat taslaktan çıkarıldı.');
          navigate('#/koleksiyon');
        },
      }, 'Sil')),
  );

  return el('div.card',
    el('h2', editing ? `Düzenle — ${watchLabel(editing)}` : 'Koleksiyona saat ekle'),
    el('p.muted', { style: { marginTop: '-6px' } },
      'Yalnızca marka ve model zorunlu. Diğer alanları sonra doldurabilirsin — boş bırakılanlar künyede görünmez.'),
    form);
}

function makeInput(type, opts, current) {
  if (type === 'select') {
    const sel = el('select', {},
      (opts.options || []).map(([value, label]) =>
        el('option', { value, selected: String(current ?? '') === value }, label)));
    return sel;
  }
  if (type === 'textarea') {
    return el('textarea', { placeholder: opts.placeholder || '' }, current ?? '');
  }
  if (type === 'checkbox') {
    return el('input', { type: 'checkbox', checked: current === true, style: { width: 'auto', minHeight: 'auto' } });
  }
  if (type === 'list') {
    return el('input', {
      type: 'text', placeholder: opts.placeholder || '',
      value: Array.isArray(current) ? current.join(', ') : (current ?? ''),
    });
  }
  return el('input', {
    type: type === 'number' ? 'number' : type,
    placeholder: opts.placeholder || '',
    required: !!opts.required,
    value: current ?? '',
    ...(opts.min != null ? { min: opts.min } : {}),
    ...(opts.max != null ? { max: opts.max } : {}),
    ...(opts.step ? { step: opts.step } : {}),
  });
}

function buildWatch(inputs, editing) {
  const draft = editing ? structuredClone(editing) : {};

  for (const [path, { input, type }] of inputs) {
    let value;
    if (type === 'checkbox') {
      value = input.checked;
    } else if (type === 'list') {
      const parts = input.value.split(',').map((s) => s.trim()).filter(Boolean);
      value = parts.length ? parts : null;
    } else if (type === 'number') {
      value = input.value === '' ? null : Number(input.value);
      if (value != null && Number.isNaN(value)) value = null;
    } else {
      value = input.value.trim() === '' ? null : input.value.trim();
    }
    setPath(draft, path, value);
  }

  if (!draft.brand || !draft.model) {
    toast('Marka ve model zorunlu.');
    return null;
  }

  draft.status = draft.status || 'owned';
  draft.photos = draft.photos || [];
  draft.tags = draft.tags || [];
  if (draft.specs?.dial && !draft.specs.dial.complications) draft.specs.dial.complications = [];

  // Fiyat/değer: tutar yoksa nesneyi tamamen düşür.
  if (draft.acquisition?.price && draft.acquisition.price.amount == null) delete draft.acquisition.price;
  else if (draft.acquisition?.price) {
    draft.acquisition.price.currency = draft.acquisition.price.currency || state.config.defaultCurrency;
  }
  if (draft.valuation && draft.valuation.amount == null) delete draft.valuation;
  else if (draft.valuation) {
    draft.valuation.currency = draft.valuation.currency || state.config.defaultCurrency;
    draft.valuation.asOf = draft.valuation.asOf || todayISO();
  }

  draft.id = editing ? editing.id : makeId(draft.brand, draft.model, draft.reference);
  return draft;
}

const field = (label, input, hint) => {
  const id = input.id || `f-${Math.random().toString(36).slice(2, 9)}`;
  input.id = id;
  return el('div.field',
    el('label', { for: id }, label),
    input,
    hint ? el('span.hint', hint) : null);
};

/* --------------------------------------------------------------- dışa aktarım */

function exportCard(navigate) {
  const n = draftCount();

  return el('div.card',
    el('h2', 'Kaydet & yayınla'),
    n
      ? el('div.notice',
          el('strong', `${n} bekleyen değişiklik `),
          'yalnızca bu tarayıcıda duruyor. Aşağıdaki dosyaları indirip depodaki ',
          el('code', 'data/'), ' klasörüne koy, sonra commit et.')
      : el('p.muted', 'Bekleyen değişiklik yok — site verisi depodaki dosyalarla aynı.'),

    el('div.form-actions',
      el('button.btn.btn-primary', {
        type: 'button',
        onclick: () => { downloadJSON('watches'); toast('watches.json indirildi.'); },
      }, 'watches.json indir'),
      el('button.btn.btn-primary', {
        type: 'button',
        onclick: () => { downloadJSON('wears'); toast('wears.json indirildi.'); },
      }, 'wears.json indir'),
      n ? el('button.btn.btn-danger', {
        type: 'button',
        onclick: () => {
          if (!confirm('Bu tarayıcıdaki tüm taslak değişiklikler silinsin mi? Depodaki veri etkilenmez.')) return;
          clearDrafts();
          toast('Taslaklar temizlendi.');
          navigate('#/kayit', true);
        },
      }, 'Taslakları temizle') : null),

    el('details.table-view', { style: { marginTop: '18px' } },
      el('summary', 'Terminalden kaydetmeyi tercih edersen'),
      el('div', { style: { paddingTop: '10px' } },
        el('p.muted', 'Depo klasöründe:'),
        el('pre', {
          style: {
            background: 'var(--surface-3)', padding: '12px', borderRadius: '6px',
            fontSize: '12.5px', overflowX: 'auto', margin: 0,
          },
        },
          'node scripts/log-wear.mjs "Speedmaster"        # bugün için kaydet\n' +
          'node scripts/log-wear.mjs "BB58" 2026-08-20    # belirli bir gün\n' +
          'node scripts/validate-data.mjs                 # veriyi doğrula'))),
  );
}
