#!/usr/bin/env node
/* Bir ürün fotoğrafını envanterdeki diğerleriyle aynı biçime sokar:
 * düz fonu siler, saydam zeminli 900×900 WebP yazar.
 *
 *   node scripts/normalize-photo.mjs <girdi> <çıktı.webp>
 *
 * TEK BAĞIMLILIK: sharp. Site onu KULLANMIYOR — bu yalnızca fotoğraf
 * hazırlarken elle çalıştırılan bir araç. Gerekirse: npm i sharp
 *
 * ── NASIL ÇALIŞIYOR ────────────────────────────────────────────────────────
 * Fonu tam çözünürlükte yalnızca renge bakarak silmek işe yaramıyor:
 * fırçalanmış çelikte fona uzaklığı 1 olan, yani fonla birebir aynı renkte
 * pikseller var. Taşma-doldurma oradan içeri sızıp kasayı deliyor.
 *
 * Küçültülmüş görüntüde maske çıkarmak sızıntıyı durduruyor ama bu sefer kenar
 * ±4 piksel kabalaşıyor: maskenin siluetin dışına taştığı yerde fon kalıyor
 * (beyaz hare), içine düştüğü yerde saat kesiliyor.
 *
 * Bu yüzden kaba maske SINIR olarak değil, SIZINTI BARİYERİ olarak kullanılıyor:
 *   1. 1/4 ölçekte kaba fon maskesi çıkar (silueti güvenle bulur).
 *   2. Onu büyütüp birkaç piksel şişir → doldurmanın girmesine izin verilen alan.
 *      Şişme payı halenin yenmesine yetecek kadar, muhafazanın içine ulaşmaya
 *      yetmeyecek kadar küçük.
 *   3. Asıl doldurmayı TAM ÇÖZÜNÜRLÜKTE, bu alanla sınırlı yap → kenar piksel
 *      hassasiyetinde, sızıntı yok.
 *
 * Doldurma sabit bir renge değil KOMŞUDAN KOMŞUYA adım farkına bakıyor; fon düz
 * değil, ortaya doğru koyulaşan bir degrade (köşeler ~211, orta ~199).
 *
 * ELLE KESİLMİŞ GİRDİ: dosya zaten saydam zeminliyse (alfası var ve %5'ten
 * fazlası saydam) fon silme adımı tamamen atlanır, yalnızca çerçeveleme yapılır.
 * Photoshop'ta yapılmış kesim her zaman buradaki otomatikten iyi. Yine de
 * otomatik kesim istenirse: CUTOUT=force
 *
 * Eşikler ortam değişkeniyle ayarlanabilir: SCALE, STEP, CAP, GROW, FEATHER.
 */
import sharp from 'sharp';

const [SRC, OUT] = process.argv.slice(2);
if (!SRC || !OUT) {
  console.error('Kullanım: node scripts/normalize-photo.mjs <girdi> <çıktı.webp>');
  process.exit(1);
}

const SCALE = Number(process.env.SCALE || 4);      // kaba maske ölçeği
const STEP = Number(process.env.STEP || 9);        // komşular arası izin verilen fark
const CAP = Number(process.env.CAP || 70);         // fon renginden toplam kayma sınırı
const GROW = Number(process.env.GROW || 6);        // bariyerin şişme payı (tam çöz. piksel)
const FEATHER = Number(process.env.FEATHER || 0.6);
const MIN_LIGHT = 150;                             // bundan koyu piksel fon sayılmaz
const BOX = 770, CANVAS = 900;                     // diğer görsellerin ölçüsü

const meta = await sharp(SRC).metadata();
const W = meta.width, H = meta.height;

/** Kenardan başlayan, komşu farkına bakan taşma-doldurma.
 *  allowed verilirse dolgu yalnızca o piksellerden geçebilir. */
function floodBackground(buf, w, h, ch, allowed) {
  const bgAt = (p) => { const i = p * ch; return [buf[i], buf[i + 1], buf[i + 2]]; };
  let r0 = 0, g0 = 0, b0 = 0;
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]]) {
    const [r, g, b] = bgAt(y * w + x); r0 += r; g0 += g; b0 += b;
  }
  r0 /= 4; g0 /= 4; b0 /= 4;

  const out = new Uint8Array(w * h);               // 1 = fon
  const stack = [];
  for (let x = 0; x < w; x++) { stack.push(x, -1, (h - 1) * w + x, -1); }
  for (let y = 0; y < h; y++) { stack.push(y * w, -1, y * w + w - 1, -1); }

  while (stack.length) {
    const from = stack.pop(), p = stack.pop();
    if (out[p]) continue;
    if (allowed && !allowed[p]) continue;
    const [r, g, b] = bgAt(p);
    if ((r + g + b) / 3 < MIN_LIGHT) continue;
    if (Math.hypot(r - r0, g - g0, b - b0) > CAP) continue;
    if (from >= 0) {
      const [pr, pg, pb] = bgAt(from);
      if (Math.hypot(r - pr, g - pg, b - pb) > STEP) continue;
    }
    out[p] = 1;
    const x = p % w, y = (p - x) / w;
    if (x > 0) stack.push(p - 1, p);
    if (x < w - 1) stack.push(p + 1, p);
    if (y > 0) stack.push(p - w, p);
    if (y < h - 1) stack.push(p + w, p);
  }
  return { mask: out, bg: [r0 | 0, g0 | 0, b0 | 0] };
}

/** Ayrılabilir maksimum süzgeç — ikili maskeyi r piksel şişirir. */
function dilate(src, w, h, r) {
  const tmp = new Uint8Array(w * h), dst = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const xx = x + d;
        if (xx >= 0 && xx < w && src[row + xx]) v = 1;
      }
      tmp[row + x] = v;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let v = 0;
      for (let d = -r; d <= r && !v; d++) {
        const yy = y + d;
        if (yy >= 0 && yy < h && tmp[yy * w + x]) v = 1;
      }
      dst[y * w + x] = v;
    }
  }
  return dst;
}

/** Girdi zaten saydam zeminli mi? Öyleyse fon silmeye hiç girmiyoruz —
 *  elle (Photoshop vb.) yapılmış kesim her zaman daha iyi. */
async function alreadyCut() {
  if (process.env.CUTOUT === 'force') return false;
  if (!meta.hasAlpha) return false;
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let clear = 0;
  for (let p = 0; p < info.width * info.height; p++) if (data[p * info.channels + 3] < 128) clear++;
  return clear / (info.width * info.height) > 0.05;
}

let rgba;
if (await alreadyCut()) {
  console.log('girdi zaten saydam zeminli — fon silme atlandı, yalnızca çerçeveleniyor.');
  rgba = await sharp(SRC).ensureAlpha().png().toBuffer();
} else {
// ── 1. Kaba maske (küçük ölçek) ────────────────────────────────────────────
const sw = Math.round(W / SCALE), sh = Math.round(H / SCALE);
const { data: small, info: si } = await sharp(SRC)
  .resize(sw, sh, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
const coarse = floodBackground(small, sw, sh, si.channels, null);
console.log(`kaba maske: %${((coarse.mask.reduce((a, v) => a + v, 0) / (sw * sh)) * 100).toFixed(1)} fon ` +
  `(${sw}×${sh}, fon rgb ${coarse.bg.join(',')})`);

// ── 2. Bariyer: kaba fonu tam çözünürlüğe taşı ve GROW kadar şişir ─────────
const barrier = new Uint8Array(W * H);
for (let y = 0; y < H; y++) {
  const sy = Math.min(sh - 1, (y / SCALE) | 0);
  for (let x = 0; x < W; x++) {
    const sx = Math.min(sw - 1, (x / SCALE) | 0);
    barrier[y * W + x] = coarse.mask[sy * sw + sx];
  }
}
const allowed = dilate(barrier, W, H, GROW);

// ── 3. Asıl doldurma: tam çözünürlük, bariyerle sınırlı ────────────────────
const { data: full, info: fi } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true });
const fine = floodBackground(full, W, H, fi.channels, allowed);
const cut = fine.mask.reduce((a, v) => a + v, 0);
console.log(`ince maske: %${((cut / (W * H)) * 100).toFixed(1)} fon silindi`);

// ── 4. Alfayı uygula ───────────────────────────────────────────────────────
const alphaRaw = Buffer.alloc(W * H);
for (let p = 0; p < W * H; p++) alphaRaw[p] = fine.mask[p] ? 0 : 255;

// DİKKAT: sharp tek kanallı ham girdiyi işlerken sRGB'ye çevirip 3 kanal
// döndürebiliyor; toColourspace('b-w') olmazsa tampon kayıyor ve alfa
// 0/85/170/255 gibi kademelere düşüyor.
const { data: alpha, info: ai } = await sharp(alphaRaw, { raw: { width: W, height: H, channels: 1 } })
  .blur(FEATHER)                       // kenarı 1 px yumuşat, testere izi kalmasın
  .toColourspace('b-w')
  .raw().toBuffer({ resolveWithObject: true });
if (ai.channels !== 1) throw new Error(`maske ${ai.channels} kanal döndü, 1 bekleniyordu`);

rgba = await sharp(SRC)
  .joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
  .png().toBuffer();
}

// ── 5. Kırp, ölçekle, ortala ───────────────────────────────────────────────
// Diğer görsellerin hepsinde içerik tam 770 px. fit:'contain' KÜÇÜK görseli
// hedefe büyütür — o yüzden ölçekleme değil, kenar payı ekliyoruz.
const scaled = await sharp(rgba).trim().resize(BOX, BOX, { fit: 'inside' }).png().toBuffer();
const sm = await sharp(scaled).metadata();
const padX = CANVAS - sm.width, padY = CANVAS - sm.height;

await sharp(scaled).extend({
  left: Math.floor(padX / 2), right: Math.ceil(padX / 2),
  top: Math.floor(padY / 2), bottom: Math.ceil(padY / 2),
  background: { r: 0, g: 0, b: 0, alpha: 0 },
}).webp({ quality: 90 }).toFile(OUT);

console.log(`yazıldı: ${OUT} → ${sm.width}×${sm.height} içerik, ${CANVAS}×${CANVAS} tuval ` +
  `(oran ${(Math.max(sm.width, sm.height) / CANVAS).toFixed(3)})`);
