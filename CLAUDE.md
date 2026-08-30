# Proje notları

Saat koleksiyonu envanteri + sergi sitesi + rotasyon günlüğü.
Kurulum yok: çerçeve, derleme aracı, bağımlılık yok — düz HTML/CSS/JS, veri
`data/` altında iki JSON dosyasında. Node 18+ yeterli.

Ayrıntılı belgeler: [`README.md`](README.md) (kullanım, yayınlama) ve
[`data/README.md`](data/README.md) (alan alan şema).

---

## KALDIĞIMIZ YER (28 Ağustos 2026)

Site kurulu ve yayında. Örnek veri silindi; **24 Casio envantere girdi**.

### Veri kaynağı

Kullanıcının Google Drive'ındaki **"Casio Collection"** tablosu — elle
hazırlanmış, tek doğru kaynak.
`1GtGBfgE5gbGefurEjL7G20kTH1m84PLyKZ07XazFgCA`

CSV olarak indirip:
```bash
node scripts/import-casio-sheet.mjs casio.csv    # --reset ile sıfırdan
node scripts/validate-data.mjs
```

Tablodan **yalnızca model numarası + satın alma tarihi** alınır. Casio'da model
numarası rengi ve varyantı da belirlediği için saatin kimliğini tek başına
taşır. Tablodaki Solar / Bluetooth / modül no sütunlarına **güvenilmiyor** —
kullanıcının talimatı: bunlar üreticinin verisinden ayrıca doğrulanacak.

Drive'daki **"Saat Envanter Tablosu"** (Şubat 2026) bir yapay zekâ tarafından
hazırlanmış ve hatalı — **tamamen yok sayılacak**, model kodları yanlış.

### Model numarası nasıl okunur

Casio kodu üç katmanlıdır: `A1100D` + `-1` + `DF` = model, renk, pazar soneki.
Casio kendi sayfalarında **pazar sonekini atar**. Bu yüzden:

- `model` = `A1100D-1` — ürün kimliği, **resmi sayfanın adresini bu verir**
- `reference` = `A1100D-1DF` — kullanıcının satın aldığı haliyle tam kod

Ayrıştırma `scripts/import-casio-sheet.mjs > splitModelRef()` içinde; bilinen
pazar sonekleri listesiyle yapılır. **A ile başlayan sonek yoktur** (AUDF gibi):
oradaki A her zaman renk kodunun parçasıdır. 6 sayfa çekilerek doğrulandı.

### Teknik özellik kaynakları (denenerek tespit edildi)

| Kaynak | Adres | Verdiği | Vermediği |
|---|---|---|---|
| Ürün sayfası | `casio.com/intl/watches/<seri>/product.<MODEL>/` | Kasa ölçüleri, ağırlık, malzeme, cam, su geçirmezlik, pil/solar, hassasiyet, fonksiyonlar, **tanıtım metni** | fiyat, çıkış tarihi, renk |
| **Japonya sayfası** | `casio.com/jp/watches/<seri>/product.<MODEL>/` | Yukarıdakilerin hepsi **+ 発売日 (çıkış) + メーカー希望小売価格 (liste fiyatı, vergi dahil)** | — |
| `europe` yolu | `casio.com/europe/watches/casio/vintage/product.<MODEL>/` | Yalnızca `intl`'de olmayan modeller için teknik özellik | fiyat, tarih |
| Destek sayfası | `casio.com/<ülke>/watches/<seri>/support.<MODEL>/` | **Modül numarası** (kılavuz PDF adından: `qw3503`) | — |
| **shockbase.org** | `shockbase.org/watches/watch_dyn.php?model=<MODEL>&subseries=..&series=..` | Çıkış tarihi, 14 para biriminde liste fiyatı, yazılı renk alanları, pil hücresi | **yalnızca G-Shock** |
| casiofanmag.com | `casiofanmag.com/retro/<aile>/` · `/standard/<aile>/` | Serinin ilk çıkış yılı (resmi değil) | — |
| Modül servis listesi | PDF, depoda yok — `casio-watch.fastcr.cz` | Eski modüllerin pil/hassasiyet/çıkış tarihi (QW-2376 = MRS-301) | 3200+ modüllerin çoğu |

**shockbase okuma uyarısı:** özellik ızgarasında var/yok ayrımı CSS ile yapılıyor
(`cellactive` / `cellinactive`). Düz metin çıkarımı hepsini "var" gösterir —
ham HTML'den sınıf adına bakarak ayrıştır.

**Çıkış tarihi tuzağı:** Japonya sayfasındaki tarih o modelin *Japonya
sürümünün* çıkışıdır; casiofanmag'inki *serinin* ilk çıkışıdır. İkisi de bu
referansın tarihi olmayabilir. Kural: **çıkış tarihi satın alma tarihinden
sonraysa yazma** (A158WA-1'de yakalandı: JP 2021, alım 2013). Serinin yılını
varyanta mal etme (F-91W 1989 ≠ Pac-Man sürümü 2024).

**ABD sitesi (`/us/`):** ürün başlığında renk adı var, teknik tablo JS ile
yükleniyor — okunamıyor.

### Doldurulma durumu (29 Ağustos 2026)

| Alan | Durum |
|---|---|
| Teknik özellikler | 23/24 |
| Kadran / kasa / kayış rengi | 24/24 — resmi ürün görselinden okundu |
| Görsel | 24/24 — geçici, üreticinin görselleri, 900×900 WebP |
| Çıkış tarihi | 17/24 |
| Liste fiyatı | 13/24 |
| Tanıtım metni | 14/24 |

Tarih + fiyat eksik olan 7: A1000DN-7, AE-1200WHL-5AV, MDV-106-1A,
MTP-B185D-2A2V, MTP-B195L-1AV, EFB-730D-7AV, EFS-S570D-3A. Ortak nedeni:
hiçbiri Japonya'da satılmıyor, o yüzden 発売日 / 希望小売価格 yok.
MDV-106-1A'nın teknik özellikleri de eksik (Amerika pazarına özel).

Seri → URL yolu: `casio`, `gshock`, `edifice`, `protrek`, `oceanus`.
**Oceanus yalnızca `jp` yerelinde**, diğerleri `intl`.

**Neden TR değil de `intl`:** TR sayfasında da her şey yazıyor — ama teknik
tablo JavaScript ile yükleniyor. casio.com'a tek erişimimiz JS çalıştırmayan
WebFetch: başsız tarayıcı proxy'den geçemiyor (`ERR_CONNECTION_RESET`), curl
403 alıyor (Akamai). `intl` sayfası sunucudan hazır geldiği için okunabiliyor.
Yani TR'yi "boş olduğu için" değil, **okuyamadığımız için** kullanmıyoruz.
Kullanıcı tarayıcısında TR sayfasını görebilir; bir çelişki çıkarsa kaynak
odur.

`MRS-301` için hiçbir resmi sayfa yok (404).

### İki dillilik

Teknik değerler **İngilizce** (üreticinin yazdığı gibi) saklanır, ekranda
`assets/js/terms.js` sözlüğüyle çevrilir. Yeni dil = sözlüğe sütun. Serbest
metinler (`tagline`, `story`) `{ en, tr }` biçiminde. Arayüz şu an tek dil
(Türkçe); İngilizce düğmesi istendiğinde eklenecek.

### Bekleyen adımlar

1. **Teknik özellikler** — 24 saatten **3'ü dolduruldu** (A1100D-1, GA-2100-1A1,
   EFS-S570D-3A). Kalan 21 seri seri çekilecek: Casio 10 → G-Shock 6 →
   Edifice 2 → Pro Trek 1 → Oceanus 2. Her partiden sonra kullanıcıya doğrulat.
2. **Kaynağın vermediği alanlar** — kadran rengi, kayış rengi, cam formu ve
   üretim yılı Casio'nun teknik tablosunda **yok**. Model kodundan/görselden
   çıkarım gerekir → mutlaka kullanıcıya sorulacak, tahmin yazılmayacak.
3. **EFS-S570D-3A tanıtım metni** çekilmedi (yalnızca teknik veri alındı).
4. **`Casio MRS-301-2EVDF`** — tabloda tarihi yok, içe aktarılmadı; resmi
   sayfası da yok. Kullanıcıyla konuşulacak.
5. **Casio dışı saatler** — Seiko'lar ve diğerleri henüz girilmedi.
6. **Fotoğraflar** — hepsi boş.

### Verilmemiş kararlar

1. **Fiyatlar.** Kullanıcının kararı: *"Fiyatları biz bilelim ama sistem public
   ken yazmayalım siteye."* Fiyatlar Drive tablosunda duruyor, depoya
   **girilmedi**. Site bitince fiyatlarla bir hesap yapılacak — o zaman ya depo
   private olacak ya da ayrı bir çözüm bulunacak.
2. **Depo public mi kalacak?** Şu an public (Pages ücretsiz hesapta bunu
   gerektiriyor). Yayınlanan site hassas alanları göstermiyor ama **depodaki
   kaynak dosyayı herkes okuyabilir** — fiyat/seri no bu yüzden girilmiyor.
3. **Telefondan hızlı kayıt** — şu an JSON indirip commit gerekiyor.

**Depo public olduğu sürece fiyat ve seri numarası girme.**

---

## Yayın durumu

- Canlı: https://barisari.github.io/Watch-Collection/
- Varsayılan dal: `claude/watch-collection-manager-gl4ziq` (depo ilk gönderimden
  önce boş olduğu için `main` değil). Pages iş akışı bu dalı da dinliyor.
- Her commit'te otomatik yayınlanır. Settings → Pages → Source: GitHub Actions
  zaten seçili — Pages ayar sayfasındaki "Jekyll" / "Static HTML" önerilerine
  **dokunma**, ikinci bir iş akışı ekleyip çakışırlar.

---

## Çalışma alışkanlıkları

- Veriyi değiştiren her işten sonra `node scripts/validate-data.mjs` çalıştır.
- Site metinleri Türkçe; kod içi yorumlar da Türkçe.
- Bilinen bir referansın teknik özelliklerini doldururken **kullanıcıya
  doğrulat** — aynı modelin varyantları arasında ölçüler değişebiliyor,
  envantere yanlış bilgi yazılmamalı.
- Takvim/grafik renkleri doğrulanmış 8 yuvalı bir paletten gelir
  (`--series-1…8`, `assets/css/styles.css` başında). Renk saatin koleksiyondaki
  sabit sırasına bağlıdır, sıralamaya değil. 8'den fazla saatte renk bırakılır
  ve kimlik yalnızca yazıyla taşınır. Paleti değiştirirsen dataviz
  doğrulayıcısını tekrar çalıştır.
- `id` alanı sabittir; değiştirirsen `data/wears.json` içindeki `watchId`
  değerlerini de güncelle.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `node scripts/serve.mjs` | Yerel sunucu (`http://localhost:8080`) |
| `node scripts/validate-data.mjs` | Veriyi doğrular, hatada 1 ile çıkar |
| `node scripts/add-watches.mjs <liste> [--reset]` | Listeden toplu saat ekler |
| `node scripts/import-casio-sheet.mjs <csv> [--reset]` | Casio Collection tablosundan içe aktarır |
| `node scripts/log-wear.mjs "<saat>" [tarih] ["not"]` | Rotasyon kaydı ekler |
| `node scripts/build.mjs [--private]` | `dist/` hazırlar (hassas alanları siler) |
