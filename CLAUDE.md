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
| **Hindistan sayfası** | `casio.com/in/watches/<seri>/product.<MODEL>/` | Teknik tablonun tamamı **+ MRP (liste fiyatı, vergi dahil)** | çıkış tarihi |
| **Tayland sayfası** | `casio.com/th/watches/<seri>/product.<MODEL>/` | Teknik tablo **+ MSRP** | çıkış tarihi |
| `europe` yolu | `casio.com/europe/watches/casio/vintage/product.<MODEL>/` | Yalnızca `intl`'de olmayan modeller için teknik özellik | fiyat, tarih |
| Singapur / Endonezya | `casio.com/sg/…` · `casio.com/id/…` | Teknik tablo + tanıtım metni | fiyat |
| Destek sayfası | `casio.com/<ülke>/watches/<seri>/support.<MODEL>/` | **Modül numarası** (kılavuz PDF adından: `qw3503`) | — |
| **shockbase.org** | `shockbase.org/watches/watch_dyn.php?model=<MODEL>&subseries=..&series=..` | Çıkış tarihi, 14 para biriminde liste fiyatı, yazılı renk alanları, pil hücresi | **yalnızca G-Shock** |
| casiofanmag.com | `casiofanmag.com/retro/<aile>/` · `/standard/<aile>/` | Serinin ilk çıkış yılı (resmi değil) | — |
| Modül servis listesi | PDF, depoda yok — `casio-watch.fastcr.cz` | Modülün pil/hassasiyet/tarihi | **model adı hiç geçmiyor** — modülü saate bağlamaz |

**Fiyat aramanın sırası:** `jp` → `in` → `th`. Üçü de sunucudan hazır geliyor.
Bir model bir yerelde satılmıyorsa sayfa 404 verir; o zaman sıradakine geç.
`intl`, `europe`, `sg`, `id` fiyat **vermiyor**; `us` fiyatı JS ile yüklüyor.

**Vergi uyarısı:** Hindistan MRP'si ve Japonya 希望小売価格'i vergi **dahil**,
ABD MSRP'si değil. Fiyatları bir gün tek para birimine çevirirken bu fark
hatırlanmalı — aksi hâlde elmayla armut toplanır.

**shockbase okuma uyarısı:** özellik ızgarasında var/yok ayrımı CSS ile yapılıyor
(`cellactive` / `cellinactive`). Düz metin çıkarımı hepsini "var" gösterir —
ham HTML'den sınıf adına bakarak ayrıştır.

**shockbase rengi de her zaman doğru değil:** GBX-100-8 için "Grey" yazıyor,
oysa Casio'nun kendi Türkçe sayfası "yumuşak **kum beji**" diyor. Envanterdeki
`Beige` — resmi ürün görselinden okunan değer — doğru olan. Renk çelişkisinde
**Casio'nun kendi metni ve görseli esas**, shockbase ikincil.

**Çıkış tarihi tuzağı:** Japonya sayfasındaki tarih o modelin *Japonya
sürümünün* çıkışıdır; casiofanmag'inki *serinin* ilk çıkışıdır. İkisi de bu
referansın tarihi olmayabilir. Kural: **çıkış tarihi satın alma tarihinden
sonraysa yazma** (A158WA-1'de yakalandı: JP 2021, alım 2013). Serinin yılını
varyanta mal etme (F-91W 1989 ≠ Pac-Man sürümü 2024).

**ABD sitesi (`/us/`):** ürün başlığında renk adı var, teknik tablo JS ile
yükleniyor — okunamıyor.

### Ürün görselleri — adresler TABLODA yazılı

**Önce Drive tablosunun CDN sütununa bak.** Her saatin resmi görsel adresi
orada; envanterde `source.imageOriginal` alanına da geçirildi. Bunu atlayıp
yol kalıbını türetmeye çalışmak vakit kaybı: yol modelden modele değişiyor —
yerel (`tr/tr`, `jp/ja`, `in/en`, `europe/en-gb`, `ca/en`), klasör
harflerinin büyük/küçüklüğü ve dosya adındaki `_Seq01` / `_Seq1` ekleri
tutarsız. Kalıbı kurmayı denedim, 24 modelin **ancak 4 tanesinde** tuttu.

**Erişim:** ürün sayfası curl ile **403** veriyor (Akamai), CDN varlıkları
**200**. Yani sayfayı WebFetch okur, görseli curl indirir. TR sayfası JS ile
yüklendiği için okunamıyor ama **TR CDN varlıkları gayet çalışıyor**.

**Aynı model yerele göre farklı çözünürlükte olabiliyor:** GA-2100-1A1
`tr` / `intl` / `in` / `europe` yerellerinde 500×600, **`jp` yerelinde
2000×2000**. Yeni saat eklerken jp yerelini de dene. Kullanıcı bu yüzden
GA-2100 görselini Photoshop ile büyütmüştü; Casio kendi 2000 pikselliği daha
iyi çıktı (büyütmede yazılar ve LCD yumuşuyor).

Dönüşüm eki (`.transform/main-visual-pc/image.png`) 408×408 veriyor —
**eki at**, düz `.png` asıl boyutu getiriyor (çoğunda 2000×2000).

Asıllar `photos/originals/` altında: depoda 68 MB, yayında 0 (build atlıyor).

### Doldurulma durumu (30 Ağustos 2026)

Envanterde artık **25 saat** var — MRS-301 eklendi.

| Alan | Durum |
|---|---|
| Teknik özellikler | 25/25 — MRS-301 dahil (modül 2385 kasa arkasından) |
| Kadran / kasa / kayış rengi | 25/25 — resmi ürün görselinden okundu |
| Görsel | 25/25 — geçici; 24'ü üreticinin görseli, MRS-301 kullanıcının karesi |
| Çıkış tarihi | 17/25 |
| Liste fiyatı | 22/25 |
| Tanıtım metni | 15/25 |

Liste fiyatı eksik kalan 3: **CA-53W-1**, **MDV-106-1A**, **MRS-301-2E**.
İlk ikisi Hindistan'da da Tayland'da da satılmıyor (404), Japonya'da da yok;
Casio'nun fiyat veren üç yereli de bunları kapsamıyor. Perakende ilanlarında
gördüğüm rakamlar (CA-53W için $35–43, MDV-106 için $84,95) **liste fiyatı
değil sokak fiyatı** — o yüzden yazılmadı.

Çıkış tarihi eksik kalan 8: A1000DN-7, AE-1200WHL-5AV, MDV-106-1A,
MTP-B185D-2A2V, MTP-B195L-1AV, EFB-730D-7AV, EFS-S570D-3A, MRS-301-2E.
Hindistan ve Tayland sayfaları **tarih vermiyor**, yalnızca fiyat veriyor.
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

### MRS-301 — modül çözüldü: **2385**

`MRS-301` için hiçbir resmi sayfa yok (404). Kasa/kadran/kayış bilgileri
kullanıcının doğruladığı görselden girildi. Modül **2385** (kasa arkasından);
aşağıdaki üç kaynak bunu bulana kadar birbirini tutmuyordu:

- Modül servis listesinde `QW-2376` satırı var: `S/M-747 · ±15 sn/ay ·
  SR927W ×2 + CR1216 · 2 yıl · Aug-2001`. Ama **o PDF'te model adı hiç
  geçmiyor** (`MRS` dizesi dosyada yok) — yani modülü bu saate bağlamıyor.
- manuals.plus "MRS-300/301 = modül 2376" diyor; aynı modülün kılavuzu
  manualslib'de **altimetre/barometre** modları anlatıyor. Dalgıç saatiyle
  uyuşmuyor, ikisinden biri yanlış.
- Aramada çıkan "100 m, siyah kadran, çift zaman" tarifi aslında
  **AMW-320R'ye ait**, bu saate değil (xmission sayfası doğrulandı).

**Yeni ipucu (30 Ağustos):** kullanıcının paylaştığı görselde kadranda
`DEPTHMETER`, kasanın sol yanında `SENSOR`, kadranda `WATER RESIST 100M`
yazıyor. Derinlik ölçen saat **basınç sensörü** taşır; altimetre/barometre
modülleri de aynı sensörü kullanır. Yani QW-2376 kılavuzundaki basınç modları
artık çelişki değil, beklenen şey olabilir — SR927W×2 + CR1216 düzeni de
sensörlü saate uyuyor.

Görsel yapay zekâ üretimi, ama **kullanıcı yazıları orijinal saatle uyuşacak
şekilde düzelttirdiğini ve doğru olduklarını söyledi** — yani doğrulama
kullanıcıdan geliyor. Bu yüzden kadrandan okunanlar envantere girdi: 100 m su
geçirmezlik, mavi kadran/kasa/kayış, reçine kayış, çelik+reçine kasa ve
`MAX · DEPTH · TIME · RECALL · ST-W` mod satırından çıkan işlevler
(derinlik ölçer, azami derinlik hafızası, veri geri çağırma, kronometre).
Renk kodu da destekliyor: Casio'da **"-2" mavi** demek (MRS-301-**2**E).

**Çözüm (30 Ağustos):** kullanıcı kasa arkasını okudu — **modül 2385**, ayrıca
`JAPAN` ve `10 BAR`. Servis listesinde QW-2385 satırı zaten vardı ve QW-2376
ile **birebir aynı** değerleri taşıyor (ikisi de `S/M-747 · ±15 sn/ay ·
SR927W ×2 + CR1216 · 2 yıl · Aug-2001`) — aynı servis kılavuzu ailesi, bu
yüzden manuals.plus 2376 demiş. Doğrusu 2385. Modül değerleri envantere girdi.

`10 BAR` = 100 m, kadrandan okuduğumuz su geçirmezliği saatin kendisi doğruladı.
Aug-2001 **modülün** tarihi; saatin çıkış tarihi değil, `releaseDate` boş kaldı.

**Ders:** servis listesi modülü modele bağlamıyor, ama elinde modül numarası
varsa pil/hassasiyet/tarih oradan geliyor. Numara kasa arkasında.

### İki dillilik

Teknik değerler **İngilizce** (üreticinin yazdığı gibi) saklanır, ekranda
`assets/js/terms.js` sözlüğüyle çevrilir. Yeni dil = sözlüğe sütun. Serbest
metinler (`tagline`, `story`) `{ en, tr }` biçiminde. Arayüz şu an tek dil
(Türkçe); İngilizce düğmesi istendiğinde eklenecek.

### Bekleyen adımlar

1. **Teknik özellikler** — 25 saatten 23'ü dolduruldu. Eksik ikisi: MDV-106-1A
   (yalnızca Amerika pazarına özel, hiçbir okunabilir yerelde sayfası yok) ve
   MRS-301-2E (yukarıdaki modül bilmecesi). Her partiden sonra kullanıcıya
   doğrulat — aynı modelin varyantları arasında ölçüler değişebiliyor.
2. **Kaynağın vermediği alanlar** — kadran rengi, kayış rengi, cam formu ve
   üretim yılı Casio'nun teknik tablosunda **yok**. Model kodundan/görselden
   çıkarım gerekir → mutlaka kullanıcıya sorulacak, tahmin yazılmayacak.
3. ~~`MRS-301-2E` görseli~~ — **tamam.** Fonu **kullanıcı Photoshop ile**
   temizledi; betik yalnızca çerçeveledi (saydam zemin, 900×900 WebP).
   Otomatik kesim bu görselde çalışmadı: fırçalanmış çelikte fona uzaklığı 1
   olan, yani fonla birebir aynı renkte pikseller var — hangi eşik denenirse
   denensin ya hale kalıyor ya SENSOR muhafazası siliniyordu. **Ders:** böyle
   bir çakışma varsa otomatikte ısrar etme, elle kesim iste.
   Üretim bilgisi `source.imageFrom` alanında duruyor; **ön yüzde
   gösterilmiyor** (`sourceNote` yalnızca `productUrl` + `fetchedAt` basıyor).
4. **`MRS-301-2E` satın alma tarihi** tabloda yok — kullanıcıyla konuşulacak.
5. **Casio dışı saatler** — Seiko'lar ve diğerleri henüz girilmedi.
6. **Fotoğraflar** — hepsi geçici (üreticinin görselleri).

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
- **İşlenmemiş asıllar `photos/originals/` altında saklanır** ve `build.mjs`
  bunları `dist/`e kopyalamaz (`SKIP` listesi) — depoda duruyorlar ama Pages
  yayınını şişirmiyorlar. Sitede gösterilen 900×900 WebP'ler `photos/casio/`.
- Detay sayfasında fotoğrafa tıklayınca büyük hâli açılır (Escape kapatır).
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
| `node scripts/normalize-photo.mjs <girdi> <çıktı.webp>` | Fotoğrafın fonunu siler, 900×900 WebP yazar (`npm i sharp` gerekir) |
| `node scripts/fetch-originals.mjs [--force]` | Görsel asıllarını `photos/originals/` altına indirir |
