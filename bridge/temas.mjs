// Köprüden gelen görselleri gözden geçirme sayfası (temas baskısı).
//   node bridge/temas.mjs <çıktı.jpg> <başlık> <"sec=2,3;kapak=1"> <dosya...>
// Önerilen kareler yeşil çerçeve + "öneri" etiketi, kapakla aynı kare "= kapak".
// sharp gerekir: npm i --no-save sharp
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');
const [out, baslik, isaret, ...dosyalar] = process.argv.slice(2);
const oku = (k) => new Set(((isaret.match(new RegExp(k + '=([0-9,]*)')) || [])[1] || '').split(',').filter(Boolean).map(Number));
const sec = oku('sec'), kapak = oku('kapak');
const K = 300, P = 18, UST = 56, ALT = 30, SUTUN = Math.min(5, dosyalar.length);
const satir = Math.ceil(dosyalar.length / SUTUN);
const W = P + SUTUN * (K + P), H = UST + satir * (K + ALT + P) + P;
const esc = (s) => s.replace(/[<&>]/g, (c) => ({ '<': '&lt;', '&': '&amp;', '>': '&gt;' }[c]));
const katman = [];
for (const [i, f] of dosyalar.entries()) {
  const n = i + 1, x = P + (i % SUTUN) * (K + P), y = UST + Math.floor(i / SUTUN) * (K + ALT + P);
  const m = await sharp(f).metadata();
  const secili = sec.has(n);
  if (secili) katman.push({ input: { create: { width: K + 12, height: K + 12, channels: 3, background: '#1a7f37' } }, left: x - 6, top: y - 6 });
  const kare = await sharp(f).resize(K, K, { fit: 'contain', background: '#ffffff' }).flatten({ background: '#ffffff' }).png().toBuffer();
  katman.push({ input: kare, left: x, top: y });
  const not = secili ? ' · öneri' : kapak.has(n) ? ' · = kapak' : '';
  const renk = secili ? '#1a7f37' : '#555';
  katman.push({ input: Buffer.from(`<svg width="${K + 20}" height="${ALT}"><text x="0" y="22" font-family="sans-serif" font-size="16" font-weight="${secili ? 'bold' : 'normal'}" fill="${renk}">${n}. ${m.width}×${m.height}${esc(not)}</text></svg>`), left: x, top: y + K + 6 });
}
katman.push({ input: Buffer.from(`<svg width="${W}" height="${UST}"><text x="${P}" y="36" font-family="sans-serif" font-size="24" font-weight="bold" fill="#111">${esc(baslik)}</text></svg>`), left: 0, top: 0 });
await sharp({ create: { width: W, height: H, channels: 3, background: '#ecebe8' } }).composite(katman).jpeg({ quality: 84 }).toFile(out);
console.log(out.split('/').pop(), `${W}×${H}`);
