#!/usr/bin/env node
/* Bir ürün fotoğrafını envanterdeki diğerleriyle aynı biçime sokar:
 * düz fonu siler, saydam zeminli 900×900 WebP yazar.
 *
 *   node scripts/normalize-photo.mjs <girdi> <çıktı.webp>
 *
 * TEK BAĞIMLILIK: sharp. Site onu KULLANMIYOR — bu yalnızca fotoğraf
 * hazırlarken elle çalıştırılan bir araç. Gerekirse: npm i sharp
 *
 * NEDEN KÜÇÜLTÜP MASKE ÇIKARIYORUZ:
 * Tam çözünürlükte fonu renkle ayırmak işe yaramıyor — fırçalanmış çelikte
 * fona uzaklığı 1 olan, yani fonla birebir aynı renkte pikseller var. Hangi
 * eşiği koyarsan koy, taşma-doldurma o piksellerden içeri sızıp kasayı deliyor.
 *
 * Ama çeliğin YEREL ORTALAMASI fondan açıkça farklı (~34 uzaklık). Görüntüyü
 * 1/4'e küçültünce tek piksellik çakışmalar ortalamada kayboluyor ve sızıntı
 * kanalları kapanıyor. Maskeyi orada çıkarıp geri büyütüyoruz.
 *
 * Eşikler ortam değişkeniyle ayarlanabilir: SCALE, STEP, CAP, CUT, TOL.
 * DUMP=1 küçük maskeyi mask-small.png olarak yazar (ayar yaparken faydalı).
 */
import sharp from 'sharp';

const [SRC, OUT] = process.argv.slice(2);
if (!SRC || !OUT) {
  console.error('Kullanım: node scripts/normalize-photo.mjs <girdi> <çıktı.webp>');
  process.exit(1);
}
const SCALE = Number(process.env.SCALE || 4);
const TOL = Number(process.env.TOL || 22);
const MIN_LIGHT = 150;
const BOX = 770, CANVAS = 900;

const meta = await sharp(SRC).metadata();
const W = meta.width, H = meta.height;
const sw = Math.round(W / SCALE), sh = Math.round(H / SCALE);

// --- 1. Küçük ölçekte fon maskesi ---
const { data: s, info: si } = await sharp(SRC)
  .resize(sw, sh, { kernel: 'lanczos3' }).raw().toBuffer({ resolveWithObject: true });
const C = si.channels;

let r0 = 0, g0 = 0, b0 = 0;
for (const [x, y] of [[0, 0], [sw - 1, 0], [0, sh - 1], [sw - 1, sh - 1]]) {
  const i = (y * sw + x) * C;
  r0 += s[i]; g0 += s[i + 1]; b0 += s[i + 2];
}
r0 /= 4; g0 /= 4; b0 /= 4;

/* Fon düz değil: köşeler ~211, ortaya doğru ~199'a iniyor. Sabit toleranslı
 * dolgu bu degradeyi geçemiyor. Onun yerine KOMŞUDAN KOMŞUYA adım farkına
 * bakıyoruz — degrade yumuşak olduğu için adım küçük, saatin kenarında ise
 * sert bir sıçrama var ve dolgu orada duruyor. CAP toplam kaymayı sınırlar. */
const STEP = Number(process.env.STEP || 9);
const CAP = Number(process.env.CAP || 70);
const px = (p) => { const i = p * C; return [s[i], s[i + 1], s[i + 2]]; };

const mask = Buffer.alloc(sw * sh, 255);               // 255 = saati tut
const stack = [];
for (let x = 0; x < sw; x++) { stack.push([x, null]); stack.push([(sh - 1) * sw + x, null]); }
for (let y = 0; y < sh; y++) { stack.push([y * sw, null]); stack.push([y * sw + sw - 1, null]); }

let filled = 0;
while (stack.length) {
  const [p, from] = stack.pop();
  if (mask[p] === 0) continue;
  const [r, g, b] = px(p);
  if ((r + g + b) / 3 < MIN_LIGHT) continue;
  if (Math.hypot(r - r0, g - g0, b - b0) > CAP) continue;
  if (from !== null) {
    const [pr, pg, pb] = px(from);
    if (Math.hypot(r - pr, g - pg, b - pb) > STEP) continue;
  }
  mask[p] = 0; filled++;
  const x = p % sw, y = (p - x) / sw;
  if (x > 0) stack.push([p - 1, p]);
  if (x < sw - 1) stack.push([p + 1, p]);
  if (y > 0) stack.push([p - sw, p]);
  if (y < sh - 1) stack.push([p + sw, p]);
}
console.log(`maske: %${((filled / (sw * sh)) * 100).toFixed(1)} fon (${sw}×${sh}, fon rgb ${r0 | 0},${g0 | 0},${b0 | 0})`);

// --- 2. Maskeyi tam çözünürlüğe büyüt, kenarı yumuşat ---
// Hafif bulanıklık + eşik: büyütmeden gelen basamakları siler, kenarı 1-2 px
// yumuşak bırakır (koyu zeminde sert kesim testere gibi görünüyor).
// DİKKAT: sharp tek kanallı ham girdiyi yeniden boyutlarken sRGB'ye çevirip
// 3 kanal döndürüyor. toColourspace('b-w') olmadan tampon kayıyor ve alfa
// 0/85/170/255 gibi dört kademeye düşüyor. channels'ı ayrıca doğruluyoruz.
const { data: alpha, info: ai } = await sharp(mask, { raw: { width: sw, height: sh, channels: 1 } })
  .resize(W, H, { kernel: 'lanczos3' })
  .blur(1.5)
  .linear(4, Number(process.env.CUT || -436))
  .toColourspace('b-w')
  .raw().toBuffer({ resolveWithObject: true });
if (ai.channels !== 1) throw new Error(`maske ${ai.channels} kanal döndü, 1 bekleniyordu`);

// --- 3. Uygula, kırp, ölçekle, ortala ---
const cut = await sharp(SRC).joinChannel(alpha, { raw: { width: W, height: H, channels: 1 } })
  .png().toBuffer();

const scaled = await sharp(cut).trim().resize(BOX, BOX, { fit: 'inside' }).png().toBuffer();
const sm = await sharp(scaled).metadata();
const padX = CANVAS - sm.width, padY = CANVAS - sm.height;

await sharp(scaled).extend({
  left: Math.floor(padX / 2), right: Math.ceil(padX / 2),
  top: Math.floor(padY / 2), bottom: Math.ceil(padY / 2),
  background: { r: 0, g: 0, b: 0, alpha: 0 },
}).webp({ quality: 90 }).toFile(OUT);

console.log(`yazıldı: ${sm.width}×${sm.height} içerik → ${CANVAS}×${CANVAS} (oran ${(Math.max(sm.width, sm.height) / CANVAS).toFixed(3)})`);

if (process.env.DUMP) {
  await sharp(mask, { raw: { width: sw, height: sh, channels: 1 } })
    .png().toFile('mask-small.png');
  console.log('maske dökümü: mask-small.png');
}
