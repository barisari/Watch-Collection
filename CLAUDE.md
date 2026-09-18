# Proje notları

Sahip olunan saatlerin **vitrini**. Salt okunur: form yok, sunucu yok,
veritabanı yok. Kurulum yok da: çerçeve, derleme aracı, bağımlılık yok — düz
HTML/CSS/JS, tek veri dosyası `data/watches.json`. Node 18+ yeterli.

Rotasyon günlüğü bu depoda **tutulmuyor** — kayıt Home Assistant'ta.

Ayrıntılı belgeler: [`README.md`](README.md) (kullanım, yayınlama) ve
[`data/README.md`](data/README.md) (alan alan şema).

---

## KALDIĞIMIZ YER (13 Eylül 2026)

Site kurulu ve yayında. **31 saat, 8 marka**: Casio, Edifice, G-Shock, Oceanus,
Pro Trek, Mondaine, Seiko, Braun. Vitrin tarafı bitti. Rotasyon kaydı **Home
Assistant'ta** tutuluyor ve sitedeki rotasyon arayüzü kaldırıldı — site şu an
saf vitrin. Ayrıntı: aşağıdaki *Rotasyon mimarisi* bölümü.

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

**J SONEKLİ JAPONYA SÜRÜMÜNÜ ARA.** Uluslararası model `jp` yerelinde yoksa
bile aynı saatin `J` sonekli Japonya sürümü olabilir ve o sayfa hem 発売日 hem
希望小売価格 verir. EFB-730D-7AV'nin tarihi böyle bulundu: uluslararası kodla
404, ama **EFB-730DJ-7AJF** → `2024年9月` + ¥26.400. Aynı saat olduğunu kasa
ölçüsünden doğrula (47×40×11 mm ikisinde de aynıydı).

**Fiyat aramanın sırası:** `jp` → `in` → `th` → `my`. Dördü de sunucudan
hazır geliyor (`my` = Malezya, MSRP veriyor).

**Casio hiçbirinde satmıyorsa: ersasaat.com** — Casio'nun Türkiye yetkili
satıcısı. Ürün sayfasındaki **üstü çizili** fiyat liste fiyatıdır (yanındaki
indirimli rakam kampanya fiyatı, onu alma). CA-53W-1 böyle bulundu: dört
Casio yerelinin hiçbirinde yok, Ersa'da 2.619 ₺.
₺ değerleri enflasyona çok duyarlı ve **bugünkü** fiyat — kur işinde diğer
para birimleriyle aynı kefeye koyma.

**Perakendeci teknik verisi ikincildir:** Ersa CA-53W-1 için "0 Mt Su
Geçirmezlik" ve "Organik Cam" yazıyor; Casio kendi sayfasında "Water
Resistant" ve "Resin Glass" diyor. Üreticinin verisi esas, perakendecininki
yalnızca fiyat için kullanılır.
Bir model bir yerelde satılmıyorsa sayfa 404 verir; o zaman sıradakine geç.
`intl`, `europe`, `sg`, `id`, `uk` fiyat **vermiyor**; `us` fiyatı JS ile yüklüyor.

**Yapay zekâ arama özetlerine güvenme.** Aynı araç EFB-730D-7AV için önce
"Haziran/Temmuz 2026", sonra "geç 2024/erken 2025" dedi; doğrusu Casio'nun
kendi sayfasındaki **Eylül 2024**. Üstelik ilk cevabı "güvenilir kaynaklardan
doğrulanmıştır" diye sunmuştu. **Her tarihi satın alma tarihine karşı sına** —
2026 Haziran çıkışı, Mart 2026 alımıyla çelişiyordu ve elenmesi bu sayede oldu.
MRS-301 için dolaşan "1997" de aynı şekilde elendi (modül 2001 çıkışlı).

**Vergi uyarısı:** Hindistan MRP'si ve Japonya 希望小売価格'i vergi **dahil**,
ABD MSRP'si değil. Fiyatları bir gün tek para birimine çevirirken bu fark
hatırlanmalı — aksi hâlde elmayla armut toplanır.

**Ülke çifti oranları — hangisi sabit, hangisi değil (ölçüldü):**
Soru şuydu: bir saatin A/B ülke fiyat oranı, başka saatler için de geçerli mi?
Elimizdeki fiyatlarla ölçüldü (oranların saatten saate değişkenlik katsayısı):

| Çift | n | Oran | Değişkenlik | Türetme |
|---|---|---|---|---|
| **USD / EUR** | 5 | **1,10** | **%0** | ✅ güvenle |
| TRY / THB | 3 | 2,00 | %4 | ~%10 hatayla |
| EUR / JPY | 5 | ~157 | %11 | ✗ |
| USD / JPY | 6 | — | %13 | ✗ |
| TRY / INR | 4 | 1,21 | %22 | ✗ |

Yani Casio **Batı pazarlarını tek blok** fiyatlıyor (USD = 1,10 × EUR, beş
saatte de tuttu), ama Japonya kendi pazarı ve TR/IN yerel vergi-gümrük
rejimlerine göre ayrışıyor.

**TRY köprüsü denendi ve çöktü.** USD fiyatı bilinen G-Shock'ların Ersa'daki
₺ liste fiyatı çekildi; ₺/USD oranı **51,6 · 85,4 · 85,6 · 88,2** çıktı (%71
saçılma). Türkiye fiyatı doların doğrusal işlevi değil — pahalı modelde oran
çöküyor. Yani TRY-only saatlere USD türetilemez.

**Kullanıcının kararı: yalnızca EUR ↔ USD çevirisi yapılır.** THB→TRY oranı
sabit olsa da gereksiz (₺ zaten Ersa'dan doğrudan geliyor); JPY→USD'nin %11
hatası fazla.

**JDM modellere hiç türetme yapılmaz.** Oceanus'lar ve PRW-35LD-5JF Japonya iç
pazarına özel; başka ülkedeki fiyatları olsa bile alakasız olurdu. Referansları
**yen** olarak kalır. (Kullanıcı bunları zaten Japonya'dan aldı.)

**Türetilen değerler `msrpEstimated` alanında**, `msrp` yalnızca kaynaktan
gelen gerçek liste fiyatlarını tutar. Ekranda ayrı satırda ve "~" ile
gösteriliyor ("Tahmini karşılık"), üreticinin fiyatıyla karışmasın.

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

**ERİŞİM DEĞİŞTİ — casio.com artık WebFetch'e de kapalı (18 Eylül 2026).**
Önceden "curl 403 alır ama WebFetch okur" yazıyordu; **artık ikisi de 403.**
Akamai'nin kendi *Access Denied* sayfası geliyor (`errors.edgesuite.net`
referansı), proxy sorunu değil — `$HTTPS_PROXY/__agentproxy/status` temiz.
Denenip kapalı çıkanlar: `intl`, `sg`, `id`, `in` yolları · `gshock.casio.com` ·
`g-shock.eu` · `gshock.com` · `casio-intl.com`. `world.casio.com` ve
`edifice-watches.com` açılıyor ama **ürün sayfası yok**, ikisi de yalnızca
ülke seçme/yönlendirme kabuğu. **CDN varlıkları hâlâ 200** — görseller iniyor.

Yani Casio metni gerektiren işler şimdilik yapılamıyor (5 uzun tanıtım bu
yüzden boş). Bir sonraki oturumda önce tek bir ürün sayfasını dene; açılıyorsa
engel geçici demektir. TR sayfası JS ile
yüklendiği için okunamıyor ama **TR CDN varlıkları gayet çalışıyor**.

**Aynı model yerele göre farklı çözünürlükte olabiliyor:** GA-2100-1A1
`tr` / `intl` / `in` / `europe` yerellerinde 500×600, **`jp` yerelinde
2000×2000**. Yeni saat eklerken jp yerelini de dene. Kullanıcı bu yüzden
GA-2100 görselini Photoshop ile büyütmüştü; Casio kendi 2000 pikselliği daha
iyi çıktı (büyütmede yazılar ve LCD yumuşuyor).

Dönüşüm eki (`.transform/main-visual-pc/image.png`) 408×408 veriyor —
**eki at**, düz `.png` asıl boyutu getiriyor (çoğunda 2000×2000).

Asıllar `photos/originals/` altında: depoda 68 MB, yayında 0 (build atlıyor).

**KURAL — resmi görsel önceliklidir, AMA yeterli çözünürlükte olanı.**
Üreticinin görseli her zaman tercih edilir; yapay büyütme gerçek ayrıntı
üretmez, yalnızca hale ekler. Ne var ki "resmi" tek başına yetmiyor: **aynı
model yerele göre farklı çözünürlükte yayımlanıyor.** Sıra şu:

1. Tablodaki CDN adresini indir, **ölçüsüne bak**. 2000×2000 ise iş bitti.
2. Küçükse (GA-2100 `tr` yerelinde 500×600) **pes etme, öbür yerelleri dene** —
   özellikle `jp`, ve `_Seq01` gibi ekleri olan/olmayan varyantları. GA-2100'ün
   gerçek 2000×2000 sürümü `jp` yerelinde, eksiz dosya adında duruyordu.
3. Hiçbir yerelde yeterli çözünürlük yoksa ancak o zaman elle büyütme gündeme
   gelir — ve resmi büyüğü sonradan bulunursa onunla değiştirilir.

Yani kullanıcının GA-2100'ü büyütmesi doğru bir tepkiydi (TR görseli gerçekten
düşüktü); eksik olan adım 2'ydi.

**Tek istisna MRS-301** — bu saatin hiçbir yerelde resmi görseli yok (hepsi
404). Kullanıcının ürettiği kare kalıcı çözüm, çözünürlük kıyaslaması yapılmaz.

### Doldurulma durumu (13 Eylül 2026)

**31 saat.** Casio dışı altısı: Mondaine evo2 (MSE.40610.LBV), Braun BN0021BKG
ve dört Seiko — SNE529P, 6309-5000, 6309-8190, SNAB71.
(Son üç Seiko 18 Eylül'de girdi; ayrıntı aşağıdaki *Üç Seiko* bölümünde.)

| Alan | Durum |
|---|---|
| Teknik özellikler | 31/31 |
| Kadran / kasa / kayış rengi | 31/31 |
| Görsel | 31/31 |
| Görsel aslı (arşiv) | 31/31 — `photos/originals/` |
| Satın alma tarihi | 28/31 |
| Liste fiyatı | 28/31 |
| Çıkış tarihi | 27/31 |
| Tanıtım metni | 22/31 kısa · 16/31 uzun |
| Rotasyon kaydı | sitede yok — kayıt HA'da (aşağıya bak) |

Liste fiyatı eksik 3: **MRS-301-2E** (hiçbir yerde resmi kaydı yok) ve iki
vintage Seiko — 6309-5000, 6309-8190.
SNAB71 çözüldü: **440 USD**, creationwatches'ın kendi ürün verisinden
(`products_price` 440 = liste, `products_price_sorter` 199 = kampanya).
**Ersa kuralı burada da geçerli: üstü çizili olan liste fiyatıdır.**
Aynı kayıtta `products_date_added` 2014-05-15 — çıkış tarihi değil, saatin
en geç Mayıs 2014'te satışta olduğunu söylüyor.

Çıkış tarihi eksik 4: MRS-301-2E, MSE.40610.LBV, SNE529, BN0021.
(İki vintage Seiko'nun tarihi seri numarasından çözüldü; SNAB71'inki yok.)

**Ağırlık 31/31 — kullanıcı tarttı (18 Eylül):** MRS-301 41,3 g · 6309-8190
79,85 g · 6309-5000 52,5 g · SNAB71 90,15 g. SNAB71'in kulaktan kulağası da
geldi: **49 mm** (kumpas). Bu dördünün hiçbirinde üreticinin yayımladığı bir
değer yok, kaynak doğrudan saatin kendisi.

**Kulaktan kulağa: iş bitti, eksik sayma.** Mondaine Evo2 **46 mm** —
üreticinin değeri değil, kullanıcının araştırmasından: The Time Bum eline alıp
~46 ölçmüş, bir ilan 45 diyor; elle ölçüm ilanın önünde tutuldu.
**Braun BN0021'e bakılmayacak** — kullanıcının kararı: *"ölçmek zor buna hiç
bakmayalım eksik diye not etmene gerek yok."* Kapalı konu, tekrar açma.

Kısa tanıtım eksik 6: A158WA-1, CA-53W-1, DBC-611-1, MDV-106-1A,
MRS-301-2E, SNE529P. İlk üçünde **Casio metin yazmamış** — sayfada yalnızca
madde listesi var, aranacak bir şey kalmadı. MDV-106-1A'nın okunabilir yerelde
sayfası, MRS-301-2E'nin hiçbir yerde resmi sayfası yok.
**SNE529P'ye bakıldı (18 Eylül): Seiko bu saat için hiç metin yazmamış.**
`seikowatches.com/uk-en/products/discovermore/sne529` açılıyor ve tam teknik
tabloyu veriyor, ama tanıtım paragrafı yok — sayfa yalnızca tablodan ibaret.
Yani o iki alan arama eksikliğinden değil, kaynakta olmadığı için boş.
Çıkış tarihi de aynı sayfada yok.

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

**`releaseDate` = 2001-08 (18 Eylül'de yazıldı, kullanıcının kararı).** Aug-2001
modülün tarihi; saatin kendi çıkış tarihi hiçbir kaynakta yok.

**Gerekçe — sensör kuralı (kullanıcının tespiti):** 2385 basınç sensörlü bir modül.
Sensör kasada port/membran istiyor, yani modül o kasaya bağlı kalıyor; Casio onu
başka kasalara taşımaz. Dolayısıyla sensörlü modüllerde **modülün tarihi ≈ saatin
tarihi.** Envanter bunu destekliyor: sensörlü dört saatin (GBD-200 → 3506,
GBX-100 → 3482, PRW-35LD → 3582, MRS-301 → 2385) hiçbiri modülünü paylaşmıyor.

**Sensörsüz modüllerde uygulama.** Modül 593 hem A158WA-1'de (2009) hem
F-91WPC-1A'da (2024) var — 15 yıl arayla iki ayrı saat, çünkü düz bir zaman modülü
her kasaya girer. Orada modül tarihini saate mal etmek 30 yıllık hata üretirdi.

**Ders:** servis listesi modülü modele bağlamıyor, ama elinde modül numarası
varsa pil/hassasiyet/tarih oradan geliyor. Numara kasa arkasında.

**Saatin yaşı için alt sınır: Ağustos 2001.** İki bağımsız kanıt, ikisi de
Casio'nun kendi servis listesinden:

1. **Tarih sütunu.** PDF'in son sütununun başlığı `Release` — Aug-2001
   modülün çıkış tarihi. Saat modülünden önce üretilemez.
2. **Numaranın kendisi.** Listede modül numaraları tarihle birlikte artıyor.
   1997 tarihli modüller **1375–1826** aralığında (49 satır); 2385 bu bandın
   tamamen dışında, 2001–2002 aralığına düşüyor. Yani tarih sütununa hiç
   bakmadan da 2385 bir 1997 modülü olamaz.

Buna karşılık dolaşan "1997" iddiasının dayanağı eBay ilanları ve bir Facebook
gönderisindeki *"circa 1997"* — yani satıcı/koleksiyoner tahmini. Yapay zekâ
arama özeti ısrar etse de resmi bir kaynak gösteremiyor, hatta Casio'nun
sitesinde böyle bir sayfa olmadığını kendisi kabul ediyor.

**Doğru ifade:** model hattı daha eski olsa bile **kullanıcının saati modül
2385 taşıyor**, dolayısıyla o saat 2001 veya sonrasıdır. Tahmini satın alma
tarihi bu tabandan hesaplanmalı.

### İki dillilik

Teknik değerler **İngilizce** (üreticinin yazdığı gibi) saklanır, ekranda
`assets/js/terms.js` sözlüğüyle çevrilir. Yeni dil = sözlüğe sütun. Serbest
metinler (`tagline`, `story`) `{ en, tr }` biçiminde. Arayüz şu an tek dil
(Türkçe); İngilizce düğmesi istendiğinde eklenecek.

### Bekleyen adımlar

1. ~~Teknik özellikler~~ — 28/28 dolu. MDV-106-1A perakendeci verisinden,
   MRS-301-2E kasa arkası + kadrandan tamamlandı. Yeni saat eklerken kural aynı:
   her partiden sonra kullanıcıya doğrulat — aynı modelin varyantları arasında
   ölçüler değişebiliyor.
2. **Kaynağın vermediği alanlar** — kadran rengi, kayış rengi, cam formu ve
   üretim yılı Casio'nun teknik tablosunda **yok**. Model kodundan/görselden
   çıkarım gerekir → mutlaka kullanıcıya sorulacak, tahmin yazılmayacak.
3. ~~`MRS-301-2E` görseli~~ — **tamam.** Fonu **kullanıcı Photoshop ile**
   temizledi; betik yalnızca çerçeveledi (saydam zemin, 900×900 WebP).
   Otomatik kesim bu görselde çalışmadı: fırçalanmış çelikte fona uzaklığı 1
   olan, yani fonla birebir aynı renkte pikseller var — hangi eşik denenirse
   denensin ya hale kalıyor ya SENSOR muhafazası siliniyordu. **Ders:** otomatik
   kesim hiç denenmeyecek — aşağıdaki fotoğraf kuralına bakın.
   Üretim bilgisi `source.imageFrom` alanında duruyor; **ön yüzde
   gösterilmiyor** (`sourceNote` yalnızca `productUrl` + `fetchedAt` basıyor).
4. ~~`MRS-301-2E` satın alma tarihi~~ — babadan kalma; modül 2385'in Ağustos
   2001 tabanından tahmin edildi ve `acquisition.dateApprox` ile işaretlendi
   (ön yüzde "… civarı (tahmini)" basılıyor).
5. ~~Casio dışı saatler~~ — Mondaine, Seiko, Braun girdi. Eksik saatler
   olabilir; kullanıcı listeyi henüz tamamlamadı.
6. **Fotoğraflar** — hepsi üreticinin görselleri. Kullanıcı kendi fotoğraflarını
   çekmeyecek; bunun yerine **mevcut modeller için ek fotoğraf** indirilecek
   (üreticiler genelde 3–8 kare yayımlıyor). Sırası kullanıcıya ait, kendiliğinden
   başlama.
7. ~~Rotasyon~~ — sitedeki rotasyon arayüzü **17 Eylül 2026'da kaldırıldı**,
   `data/wears.json` silindi. Yani "public derlemeden çıkar" maddesi düştü:
   çıkarılacak dosya yok. Kayıt HA'da birikiyor; yeterince veri olunca
   gösterim tarafı sıfırdan yazılacak (aşağıdaki bölüm).

### Üç Seiko — tamamlandı (18 Eylül 2026)

Kullanıcının kataloğa girmediği üç saat vardı, hepsi Seiko ve "en zor olanlar"
dediği bunlar. **Üçü de girdi.** Aşağısı nasıl çözüldüklerinin kaydı — üçünde de
belirleyici kaynak internet değil, **kullanıcının elindeki saat** oldu
(kasa arkası, kumpas, kendi yaşı).

**Erişim durumu.** `seikowatches.com`, `seiko.co.jp` ve `saatvesaat.com.tr`
(Seiko Türkiye distribütörü) bu ortamdan açılıyor; Casio'nun 403'ü burada yok.

**TUZAK — seikowatches.com YUMUŞAK 404 veriyor.** Olmayan ürün adresi de
**HTTP 200** dönüyor: gövde genel kabuk, içinde "not found" imi var ve aranan
model kodu hiç geçmiyor. Yani durum koduna bakarak "sayfa var" deme; gövdede
model kodunu ara. (`/global-en/products/prospex/SNAB71` ve
`/global-en/products/SNAB71P1` ikisi de böyle çıktı.)

**1. SNAB71 — Flightmaster pilot kronograf. RESMİ KAYNAK YOK (18 Eylül'de arandı).**
*(Sonuç aşağıda, 3. maddede: saat girildi, veri kumpas + perakendeci tablosundan.)*
- `seikowatches.com`: yumuşak 404, "SNAB" gövdede hiç geçmiyor.
- `saatvesaat.com.tr` (distribütör): `catalogsearch` sonucu **boş**; sayfadaki
  6 "SNAB" geçişinin hepsi arama teriminin yankısı.
- creationwatches.com: **OKUNUYOR — ilk okumam yanlıştı** (18 Eylül, kullanıcı
  adresi verince düzeltildi). Sayfa Next.js; teknik tablo HTML'in içindeki
  **RSC yükünde** (`self.__next_f.push([1,"…"])`) geliyor, yani sunucudan
  hazır. curl alıyor; WebFetch `<script>`leri attığı için bana boş göründü ve
  "JS ile yükleniyor" dedim. **Ders: bir sayfa WebFetch'te boşsa curl ile ham
  HTML'e bak** — Next.js/Nuxt sitelerinde veri script etiketinin içindedir.
  Çıkarma yolu: `self.__next_f.push` parçalarını `json.loads` ile çöz, birleştir,
  sonra `"fn-size-12 fw-500 text-start","children":"<alan>"` … `text-end`
  çiftlerini tara.

Üreticinin sayfası yok, ama **iki perakendeci tablosu var ve ikisi de okunuyor**:
citywatches.in ve creationwatches.com. Değerleri birebir örtüşüyor — ikisi de
Seiko'nun kendi bilgi sayfasından beslendiği için. creationwatches ayrıca
Seiko'nun **EAN kodunu** veriyor: `4954628094384`. Bu yüzden başta "doğrulanmadı"
diye kenara ayırdığım **kalibre 7T62** ve **tam referans SNAB71P1** envantere
girdi: artık arama özeti değil, iki bağımsız kaynak + barkod.

**Üçüncü kaynak: watchsleuth.com** — kasa kodunu da veren tek yer. Sayfa
form-tabanlı, ama sonuç sayfası doğrudan çekiliyor:
`watchsleuth.com/seikochronofinder/search/?MOD=<MODEL>` (GET; POST'u
Mod_Security 406 ile kesiyor, `Referer` başlığı ver). Kasa kodu **0HM0**,
yani kasa arkası damgası `7T62-0HM0`. Pil ömrü 3 yıl, dış bezel sabit,
hesap cetveli **iç** bezelde, sayaçlar 6-9-12, ikinci kuron var.
**Ama aynı katalog kulak genişliğine 20 mm, kalınlığa 12 mm diyor** — ikisi de
yanlış/çelişkili; kullanıcının kumpası (24 mm) ve iki perakendeci (11 mm)
esas alındı. Kasa çapı için "43mm (without crown)" demesi ise kullanıcının
43,5 mm'sini ve 50 mm'nin kuronlarla olduğunu doğruluyor.

**GÖRSELLER KULLANICININ HAZIRLADIĞI, SAATE SADIK KARELER.** Üç Seiko'nun
`photos/` altındaki görselleri kullanıcı hazırlamış: internette bulduğu düşük
çözünürlüklü kareleri yükselterek, elindeki saatin göründüğü hâle **birebir
sadık** kalarak. Uydurma değil — kadran, kasa ve kayış saatin kendisini
yansıtıyor, yani görselden okunan renk/doku/kayış bilgisi kullanılabilir.

**SERİ NUMARASI NASIL OKUNUR (doğrulandı).** Seiko'da kasa arkasındaki
6-7 haneli seri: **1. hane = yılın SON hanesi**, **2. hane = ay** (1-9 Ocak-Eylül,
O/0 Ekim, N Kasım, D Aralık), kalan haneler üretim sırası.
On yılını vermiyor — onu kalibrenin üretim aralığı ve kullanıcının bilgisi
daraltıyor.

**ON YILINI ÇÖZEN ÖLÇÜT: kullanıcı 1985 doğumlu** ve bu vintage saatlerin
kendisinden yaşlı olduğunu biliyor. İki saat de bu sayede çözüldü — kasa
biçiminden yürütülen tahminden çok daha sağlam çıktı.

**2. 6309-8190 — vintage Seiko 5, otomatik. Babasından.**
Seri numarası **853105** → **Mayıs**, yılı 8 ile biten yıl → 1978 veya 1988;
kullanıcıdan yaşlı olduğu için **Mayıs 1978**.
Kasa arkası ayrıca: **STAINLESS STEEL** ve **WATER RESISTANT** (metre yok →
`waterResistance: "Water Resistant"`, terms.js bunu "Suya dayanıklı (günlük
kullanım)" diye basıyor; CA-53W-1'de de aynı yol kullanıldı).
(Uyarı: pazar yerlerinde bu referansın Nisan 1987 / Nisan 1988 tarihli örnekleri
var, yani referans geç 80'lerde de üretilmiş. Bu saatin tarihini onlardan
çıkarma — seri numarası + kullanıcının yaşı esas.)

**Eski not (kalsın, gerekçesi duruyor):**
Kod **kalibre-kasa** biçiminde: `6309` kalibre (1976–1988 arası otomatik,
gün+tarih), `8190` kasa. Ünlü "Turtle" dalgıç değil, o 6309-704x. İlanlarda
görülen örnekler **1987–1988**. Seiko'nun sitesinde bu yaşta referans yok;
tek kaynak pazar yerleri — yani MRS-301'de yaşadığımız *"eBay'de circa 1997
yazıyor"* tuzağının aynısı. **Tarihi ilandan alma.**

**Doğru yol kasa arkası.** Vintage Seiko'da kasa arkasındaki 7 haneli seri
numarası üretim ay/yılını taşıyor. MRS-301'i modül 2385 böyle çözmüştü;
burada da kesin bilgi kullanıcının elindeki saatte. Kullanıcıdan istenecek:
**kasa arkasının fotoğrafı** (seri no + tam kasa kodu) ve kadran.
Not: seri numarasının ilk hanesi yılın SON hanesi — tek başına on yılı
vermiyor (7 → 1977 de olabilir 1987 de). İlanlardaki 1987/1988 aralığı bu
belirsizliği daraltıyor ama tek başına kanıt değil.

**3. SNAB71 — girildi (18 Eylül).** Ölçüler kullanıcının kumpasından:
kasa çapı **43,5 mm** (kuronlar hariç), kulak genişliği **24 mm**.
citywatches.in'in **50 mm**'si yanlış değil — **kuronları da içine alıyor**
(kuron muhafazaları + iç halka için ikinci kuron). Kullanıcının tespiti.
Aynı tablonun 24 mm kulak ölçüsü kumpasla birebir tuttuğu için tablodan
**kalınlık 11 mm** ve **cam Hardlex** alındı; tablo o kadarıyla güvenilir.

**Kalibre `Seiko 7T62`, referans `SNAB71P1`, kayış `Calf leather` sonradan girdi**
(kullanıcının onayıyla) — creationwatches sayfası okununca. `model` = SNAB71
kalır, `reference` = SNAB71P1: Casio'daki pazar soneki mantığının aynısı,
ızgarada kısa kod, künyede tam kod.

Kadran **White** — kullanıcının kararı: *"White yazabilirsin her yerde böyle
geçiyor."* Önce kırık beyaz yazılmıştı (görseldeki krem ton), iki perakendeci
tablosu da "Dial Color: White" deyince değişti.

Yazılmayanlar: **kulaktan kulağa** (hiçbir kaynakta yok), **ağırlık**,
**çıkış tarihi** (Seiko hiç yayımlamamış — üç kaynak da aynı şeyi söylüyor;
7T62'nin ~2002 üretim başlangıcı yalnızca alt sınır ve o kalibre onlarca
Seiko'da var, yani saate mal edilmez — Casio'daki modül 593 durumunun aynısı).
**Liste fiyatı 440 USD girdi** (yukarıya bak); ilk turda 199 USD'yi görüp
"liste fiyatı yok" demiştim, yanlıştı — 199 kampanya fiyatıydı.
**EUR karşılığı türetilmedi:** USD = 1,10 × EUR oranı yalnızca Casio
fiyatlarıyla ölçüldü, Seiko'da sınanmadı.

`nickname` = Flightmaster, çünkü o seri adı — MRS-301'in "Marine Gear"ı gibi.

---

### Rotasyon mimarisi (13 Eylül 2026 — karar verildi)

Günlük aylardır boş. Sebebi tembellik değil **kayıt sürtünmesi**: sitedeki
düğme yalnızca `localStorage`'a yazıyor; kalıcı kayıt için JSON indirip commit
atmak gerekiyor, telefondan kimse bunu yapmaz. Karar: kaydı siteden çıkar,
zaten her gün elde olan bir yere taşı.

**1. Model: aralık, satır değil.**
"Bugün bunu taktım" değil, "**şu an bunu takıyorum**". Kullanıcı saati
değiştirdikçe işaretler; iki işaret arası o saatin takılı olduğu aralıktır.
Günde bir satır varsayımı yanlıştı — kullanıcının kendi ifadesiyle: *"Ben her
gün bu saati takıyorum diye girmem ki."* Süre aralıktan hesaplanır, satır
saymaktan değil.

**2. `None` = çıplak bilek.**
Seçeneklerden biri bilerek `None`. Saat takılmayan aralıklar bir önceki saate
yazılmasın diye. Bu sentinel olmadan "en uzun seri" ve "takılma payı" şişerdi.

**3. Kayıt katmanı: Home Assistant.**
Kullanıcının evinde HA var ve içinde `input_select.watch_rotation` yardımcısı
duruyor; saatlerin çoğu seçenek olarak girilmiş. Aradığımız her şeyi bedava
veriyor:
- **Sürtünme sıfır** — telefondaki HA uygulamasından tek dokunuş; widget ya da
  NFC etiketi de konabilir.
- **Durum makinesi hazır** — `input_select` zaten "tek seçili değer" demek,
  aralık modeli kendiliğinden çıkıyor.
- **`last_changed`** = "ne zamandır takılı"; ayrıca hesaplamaya gerek yok.
- **Mahremiyet** — veri kullanıcının evinde kalır. Depo public olduğu sürece
  rotasyon oraya girmez.

**4. TUZAK — HA geçmişi kendiliğinden silinir.**
`recorder` varsayılanı `purge_keep_days: 10`: on günden eski durum geçmişi
**sessizce** silinir. Uzun dönem istatistikler yalnızca `state_class` taşıyan
**sayısal** varlıkları kapsar; `input_select` metin olduğu için kapsam dışı.
Yani hiçbir şey yapılmazsa geçmiş on günde bir buharlaşır. Çözüm: her
değişimde aralığı **dışarı yazan** bir otomasyon. HA'nın kendi geçmişini
arşiv sanmak hatadır.

**5. Seçenek adları kalıcı anahtardır.**
`input_select` geçmişi ham metin saklar. Bir seçeneği yeniden adlandırırsan
eski kayıtlar **eski adla** kalır ve eşleşme kopar. Kural: **ekle, yeniden
adlandırma.** Adlandırma kararları (Edifice mi Casio mu, "Pro Trek" ayrı mı
yazılıyor) geçmiş daha birkaç günlükken — yani şimdi — verilmeli.

**6. Hibrit: HA dışarı iter, oturum okur.**
Kullanıcı hem GitHub yapısını hem de "bilgisayar kapalıyken müdahale
edebilme"yi istiyor. Bunun için oturumun HA'ya **içeri** erişmesi gerekmiyor:
HA her değişimde kaydı dışarı yazar, oturum o hedeften okur. Ev ağına delik
açılmaz, bilgisayar kapalıyken de kayıt akmaya devam eder.

**7. `data/wears.json` public derlemeye GİRMEYECEK.**
Şu an boş. Veri girmeden önce `build.mjs`'in `SKIP` listesine eklenmeli —
`photos/originals` için yapılanın aynısı. `privateFields` bunu çözmez: o
alan siler, dosya silmez.

**8. Site tarafı BOŞALTILDI (17 Eylül 2026).**
HA kayıt almaya başladı. Sitedeki rotasyon arayüzü tümden kaldırıldı — bekleyen
bir şey değil, bilinçli bir karar: mevcut kod "bir satır = bir gün" varsayıyordu,
aralık modeliyle çalışmıyor, zaten sıfırdan yazılacaktı. Yanlış kodu taşımak
yerine silindi.

Silinenler: `assets/js/stats.js`, `views/calendar.js`, `views/stats.js`,
`scripts/log-wear.mjs`, `data/wears.json`, Takvim ve İstatistik sekmeleri,
detaydaki ROTASYON kutusu ve "Bugün bunu taktım" düğmesi, `data.js` içindeki
tüm wears tesisatı (`upsertWear`, `deleteWear`, `wearKey`, taslaklar).
`npm run wear` betiği de kalktı.

Kart alt satırındaki rotasyon sayacının yerine önce kasa çapı kondu (yuva boş
kalmasın diye), 18 Eylül'de o satır tümden kaldırıldı — aşağıya bak.

**"Kayıt ekle" sekmesi de kaldırıldı (aynı gün, ikinci adım).** İlk turda
korumuştum çünkü içinde saat ekleme/düzenleme ve dışa aktarım vardı. Kullanıcı
silinmesini istedi, gerekçe sağlam: **o form gerçek giriş yolu olamıyordu.**
Bir saat eklemek sadece satır yazmak değil — görseli indirmek, aslını
arşivlemek, 900/1500 sürümlerini üretmek, teknik özellikleri üreticinin
sayfasından doğrulamak gerekiyor; tarayıcıdaki form bunların hiçbirini yapamaz.
28 saatin hepsi zaten betiklerle girdi, form bir kez kullanılmadı.

Bununla birlikte **tüm taslak katmanı gitti**: `data.js` içindeki `drafts`,
`upsertWatch`, `deleteWatch`, `clearDrafts`, `draftCount`, `recompute`,
`fileWatches`, `exportJSON`, `downloadJSON`, `makeId` ve `DRAFT_KEY`.
`localStorage`'da artık yalnızca tema tercihi duruyor.
Detaydaki "Düzenle" düğmesi ve alt bilgideki taslak sayacı da kalktı.

**Site artık salt okunur ve tek sayfalı.** Eski `#/kayit`, `#/takvim`,
`#/istatistik` bağlantıları varsayılan rotaya düşüyor, kırılmıyor.

**Başlık çubuğu da tümden kaldırıldı (17 Eylül, üçüncü adım).** Kullanıcının
ifadesiyle "hiçbir anlamı yok": içinde ⌚ simgesi, koleksiyon adı, boş bir
slogan alanı ve tek bağlantılı bir sekme çubuğu vardı. Tema düğmesi
**altbilgiye** taşındı — metin solda, düğme sağda; altbilgi `#view`'ın dışında
olduğu için her sayfada duruyor. Koleksiyon adı `document.title`'da kalıyor,
ekranda `<h1>` yeterli. `markTabs()`, `.skip-link`, `.site-header`, `.brand*`,
`.tabs` ve `.header-actions` silindi.
`todayISO()` `stats.js`'ten `ui.js`'e taşınmıştı; onu kullanan tek yer saat
formuydu, o da gittiği için artık kullanılmıyor ama `ui.js`'te duruyor.

**`status` filtresi de kaldırıldı (aynı gün).** Koleksiyon sayfasındaki
"Sahip olduklarım / Satılanlar / İstek listesi" açılır listesi, `status` alanı
(28 kayıttan silindi), detaydaki "Koleksiyon durumu" satırı ve doğrulayıcıdaki
denetimi gitti. Kullanıcının sorusu yerindeydi: 28/28 `owned` olduğu için
filtre hiçbir şeyi filtrelemiyordu, ve sahip olmadığı saatlerin vitrinini
yapmak istemiyor.

**Kullanıcı rotasyon kaydı birikmesini bekliyor**, gösterim tarafına ondan sonra
başlanacak. Kendiliğinden başlama.

**9. HA listesi tamamlandı — `haOption` 31/31 (18 Eylül).**
Kullanıcı Braun'u ve üç Seiko'yu HA'ya ekledi, Edifice üçlüsünü de düzeltti;
liste veriyle **harfi harfine** eşitlendi. Dikkat edilecek üç ad:

| HA seçeneği | Neden böyle |
|---|---|
| `Edifice EFB-730 D` · `EFK-110 D` · `EFS-S570 D` | **D'den önce boşluk var.** Önce HA'da `Casio EFB-730D` yazıyordu, veride `Edifice EFB-730D`; kullanıcı HA'yı düzeltirken hem markayı hem boşluğu değiştirdi. Veri HA'ya uyduruldu — geçmişi tutan taraf HA. |
| `Seiko 5 6309-8190` | Kadranda **SEIKO 5** yazdığı için; öbür 6309 sade `Seiko 6309-5000`. İki vintage'ı ayıran şey bu. |
| `Braun BN0021` | Kullanıcı kod düzenini seçti. |

**Kullanıcı kodlu düzende karar kıldı.** "İnsana göre" adlar (`Braun`,
`Seiko Flightmaster`, `Seiko Snowflake`, `Seiko TV`) önerildi, seçilmedi.
Tekrar önerme.

**Rename'in maliyeti şu an sıfıra yakın:** takvim GA-2100 ile başladı,
Edifice hiç düşmemişti. Ama bu pencere kapanıyor — bundan sonra ad değişikliği
gerçek veri kaybı.

**HA'da "yeniden adlandır" yok:** eskisini sil, yenisini ekle. O an seçili olan
seçeneği silersen durum ilk seçeneğe düşer — önce `None`'a al.
**Geliştirici Araçları → Durumlar ekranından düzenleme kalıcı değildir**
(kullanıcı bir kez böyle düzeltti, liste geri döndü). Doğru yer:
Ayarlar → Cihazlar ve Servisler → Yardımcılar.

**Açık kalanlar (gösterim yazılırken):** "takılma payı"nın paydası (tüm günler mi,
saat takılan günler mi); aynı gün içindeki değişim ne kadar ince gösterilecek;
HA takvimindeki `.ics` verisinin siteye hangi yolla geleceği; eski kayıtlardaki
`Casio EFB-730D` gibi ölü adların eşlenmesi.

### Verilmemiş kararlar

1. **Fiyatlar — çözüldü.** Kullanıcının kararı: *"Fiyatları biz bilelim ama
   sistem public ken yazmayalım siteye."* İş bölümü: **depo herkese açık**
   (teknik veri, görseller, kod), **Drive özel** (fiyatlar). Alım fiyatları
   depoya **hiç girmiyor**; alım günü ECB kuruyla EUR/USD karşılıkları
   hesaplanıp ayrı bir Drive tablosuna yazıldı:
   *"Saat Koleksiyonu — Alım Fiyatları (EUR/USD)"*
   `1pmkLXSWEx0zN49HnQQcsjDKbrLdV3j0-NkLeCa6eEos` (27 alım)

   **Kural: özel veri üretildiği ANDA Drive'a yazılır, sonraya bırakılmaz.**
   Konteyner da deponun kopyası da geçicidir; scratchpad'de biriktirmek veri
   kaybı riskidir. (Bir kez ucuz atlatıldı — 27 satırlık defter şansa sağ kaldı.)
   Depoya girmemesi gereken başka bir şey çıkarsa yeri orası.
2. **Depo public mi kalacak?** Şu an public (Pages ücretsiz hesapta bunu
   gerektiriyor). **Depodaki kaynak dosyayı herkes okuyabilir** — fiyat/seri no
   bu yüzden hiç girilmiyor.

   Not: "Herkese açık / Koleksiyoner modu" düğmesi **17 Eylül 2026'da
   kaldırıldı.** Tarayıcıdaki bir düğme gizlilik sınırı değildir; üstelik o dört
   alan hem depoda hem yayında boştu, yani düğme hiçbir şey yapmıyor, yalnızca
   gizli veri varmış izlenimi veriyordu. `privateFields` + `build.mjs`'in silme
   adımı **kaldı** — sigorta olarak değerli, sınanarak doğrulandı: kaynağa sahte
   bir fiyat girilip derlendiğinde yayın kopyasında o anahtarlar hiç çıkmıyor.
   Liste fiyatı (`msrp`) hassas değil, künyede görünüyor.

   Aynı temizlikte ölü kod da gitti: `ui.js`'te 13 yardımcı (ipucu balonu,
   `toast`, `tableView`, `relDays`, `todayISO`, `watchCode`…), CSS'te 42 ölü
   sınıf ve 7 bölüm (istatistik kutuları, çubuk grafik, takvim, tablolar,
   rozetler, form, ipucu). Hepsi kaldırılan ekranlara aitti.
3. ~~Telefondan hızlı kayıt~~ — rotasyon için çözüldü (HA). Saat *ekleme* için hâlâ JSON indirip commit gerekiyor.

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

## Tasarım becerileri (17 Eylül 2026)

`.claude/skills/` altında yedi beceri kurulu — `nextlevelbuilder/ui-ux-pro-max-skill`
deposundan (MIT, sürüm 2.13.0, commit `15de38f`). Kullanıcının talebi:
*"saçma sapan tasarımlar istemiyorum artık."*

| Beceri | Ne veriyor |
|---|---|
| `ui-ux-pro-max` | Ana veritabanı: 79 stil, 192 palet, 74 font eşleşmesi, 119 UX kuralı, 25 grafik tipi, 22 teknoloji yığını |
| `ui-styling` | Stil uygulaması |
| `design` · `design-system` | Tasarım kararları, jeton mimarisi |
| `brand` · `banner-design` · `slides` | Marka, afiş, sunum |

Ayrıca **`frontend-design`** — Anthropic'in kendi becerisi (Apache-2.0,
`anthropics/skills` commit `34040c9`). Öbürleri veri sorgulatıyor, bu tek
dosyalık bir *tutum* metni: "üretilmiş sayfa" izlenimi veren varsayılanları
adıyla sayıyor ve onlardan kaçınmayı öğretiyor.

Arama Python ile çalışıyor (3.11 kurulu):
```bash
python3 .claude/skills/ui-ux-pro-max/scripts/search.py "<sorgu>" --domain style|color|typography|ux|chart
```
`--json` tam veriyi verir; düz çıktı uzun alanları 300 karakterde kesiyor.

**Arayüzde bir şey değiştirmeden önce bu becerilere danış.** Veritabanı eşleşme
bulamazsa kendi kafana göre uydurma — eşleşme bulunamadığını açıkça söyle.

`build.mjs` `.claude/` klasörünü yayına kopyalamıyor (`COPY` listesinde yok),
yani 11 MB Pages yayınını şişirmiyor.

---

## Görsel kimlik (17 Eylül 2026 — Fable, sıfırdan değerlendirme)

Bu bölümde dört madde **yürürlükte**, iki madde **kullanıcı tarafından
reddedildi ve geri alındı.** Reddedilenleri tekrar denemeyin.

1. ~~Kapaklar gerçek ölçekli~~ — **REDDEDİLDİ (17 Eylül).** Kapaklar kasa
   çapına göre ölçeklendirilmişti. Kullanıcı: *"Çok saçma geldi gerçeğine göre
   oranlı imaj kullanmak, ben burda vitrin sitesi yapıyorum."* Görseller eski
   çerçevelemeyle yeniden üretildi; `build-photo-sizes.mjs` başında uyarı var.
   **Tekrar deneme.**
2. ~~Izgara markaya göre gruplu~~ — **REDDEDİLDİ (17 Eylül).** Marka başlıklı
   gruplar konmuş, marka/tür/sıralama açılır listeleri kaldırılmıştı.
   Kullanıcı: *"hem açılır listelerin olması daha iyiydi."* Açılır listeler
   geri geldi, ızgara düz, kartta marka satırı duruyor.
3. **Kart yok**: yuvarlatma, gölge, çerçeve yok. Fotoğraf doğrudan zeminde.
4. **Sayfada renk yok**, renk saatlerden. `--ground/--ink/--ink-2/--rule`,
   iki temada ayrı, ölçülmüş. 8 yuvalı palet ve mavi vurgu silindi.
5. **Model kodu kahraman**: kartta 21 px, künyede 34–60 px (`clamp`). Künyede
   tam referans, ızgarada kısa model. Kodun altındaki "marka · tür · çıkış"
   satırı **konmadı** — orta noktalı meta dizesinin kılık değiştirmişi olurdu.
   **Ama marka kodun ÜSTÜNE geri kondu (18 Eylül).** O maddenin gerekçesi
   "bilgiler tabloda zaten var" diyordu; marka için bu **yanlıştı** — teknik
   tabloda marka diye bir alan yok, yalnızca "Casio modül 2784" gibi kalibre
   metinlerinden sızıyordu. Ölçüldü: 28 saatin **14'ünde** (7 G-Shock, 3 Edifice,
   2 Oceanus, Pro Trek, Mondaine) marka künyenin hiçbir yerinde geçmiyordu.
   Fable'ın kaldırdığı şeydi; öncesinde başlıkta renk noktasıyla birlikte
   duruyordu. Nokta geri gelmedi (silinen paletin parçasıydı), tür ve çıkış da
   konmadı — yalnızca marka.
6. **Tek yazı ailesi**: Archivo (grotesk, tabular rakam), `assets/fonts/`
   altında gömülü. Opus ikinci bir serif önermişti (üreticinin cümleleri için);
   reddedildi — kullanıcı tanıtım metnini hiç öncelemedi, ikinci aile künyeyi
   iki tasarım gibi gösteriyordu.
7. Emoji ikon yok (tema düğmesi SVG), büyük harfli etiket yok, `·` ile
   birleştirilmiş meta dizesi yok, `#0b0b0b` yok.
8. **Kart altyazısı sıralamayı izler** (18 Eylül, kullanıcının fikri). Model
   kodunun altındaki satır, o an hangi sıralama seçiliyse onun değerini yazar:
   markaya göre sıralarken "Casio", kasa çapına göre "38 mm", satın almaya göre
   "Şubat 2026". Gerekçe: kasa çapına göre sıralarken altyazıda marka yazması
   sırayı doğrulanamaz kılıyordu — şimdi göz ızgarada değerlerin arttığını
   görüyor. Altyazı `SORTS[...].alt()` ile tanımlı, yani her sıralama kendi
   metnini taşıyor. Üç anahtar da 28/28 dolu, altyazı boş kalmıyor. Tahmini
   satın alma tarihi "civarı" ekiyle basılıyor (tek örnek MRS-301).
11. **Künye başlığı: marka belirgin, kod sade, referans en altta** (18 Eylül).
   Kullanıcı: *"tam referans kodu yazması çok uzun ve kalabalık, Robocop okusun
   diye site yapmışız gibi duruyor"* ve *"marka ismi de çok sönük kalmış."*
   Blok artık **insandan makineye** doğru okunuyor:

   | Satır | Değer | Biçim |
   |---|---|---|
   | Marka | G-Shock | `clamp(17,2.4vw,21)` · 600 · **`--ink`** |
   | Kod (h1) | GA-2100 | `clamp(34,6.4vw,60)` · 700 |
   | Lakap + referans | Flightmaster — SNAB71P1 | 15 px · `--ink-2` · tabular |

   h1 artık `gridCode()` — ızgaradakiyle aynı kod, yani iki ekran aynı şeyi
   söylüyor. Lakap ve tam referans **tek satır**, ayırıcı **uzun tire** — ikisi de
   kullanıcının kararı (*"ayrı satırlarda olmasın tek satır yeterli"*, sonra
   *"parantez yerine uzun tire"*). Önce parantez konmuştu: gerekçem
   `frontend-design`'ın "WORD — fragment" tellini tekrarlamamaktı, ama seçim
   kullanıcınındı ve kural zaten "brief'in kendi sözü kazanır" diyor.
   **Buradaki uzun tire yerleşiktir, geri alma.** Referans kodun aynısıysa
   (6309-5000) basılmıyor; ikisi de yoksa satır hiç açılmıyor (boş `<p>`
   boşluk bırakmasın).
   **Marka büyük harfe çevrilmedi, harf aralığı açılmadı** — `frontend-design`
   becerisinin "her başlığın üstüne tracked-out ALL-CAPS etiket" tellini
   tekrarlamamak için; belirginlik kontrast ve ağırlıktan geliyor.
   Kod hâlâ markanın 2-3 katı: kahraman değişmedi.

10. **Izgarada renk kodu yok** (18 Eylül). Kart artık `GA-2100-1A1` değil
   **`GA-2100`** yazıyor. Kullanıcı: *"tam kodu bir anlam ifade etmiyor."*
   Casio'da model kodunun son bölümü renk/varyanttır; kartta ayırt edici değil,
   28 kodun hepsi kısaltıldıktan sonra da benzersiz kalıyor (sınandı).
   Tam kod künyede duruyor, bir tık ötede.
   **Casio dışına uygulanmaz:** vintage Seiko'da son bölüm KASA kodudur —
   `6309-8190`'dan `-8190` atılırsa geriye kalibre numarası kalır ve saat
   tanınmaz. Kural `ui.js > gridCode()` içinde, marka listesiyle sınırlı.

9. **Kartta ölçü/çıkış satırı yok** (18 Eylül). Orada kasa çapı + çıkış yılı
   duruyordu. Kullanıcı ikisini de sordu ve ikisi de savunulamadı: mm oraya
   bilgi ihtiyacından değil, rotasyon sayacı kaldırılınca **boş kalan yuvayı
   doldurmak için** konmuştu; çıkış yılı 28 saatin 24'ünde bilindiği için
   kartların bir kısmı eksikli görünüyordu. Kartta artık fotoğraf, model kodu
   ve marka var. İkisi de künyede duruyor.
   **Ders:** bir yuva boş kaldığında doldurulacak bir şey aranmaz — yuva
   kaldırılır.

**Becerilerin değeri, dürüstçe:** `ui-ux-pro-max` ölçülebilir kurallarda
(kontrast 4,5, gövde 16 px, `srcset`, web dokunma hedefi 24 px) işe yaradı;
`--design-system` çıktısı ise genel SaaS varsayılanıydı (krem zemin + kehribar
vurgu + Poppins/Open Sans + "Product Demo + Features") — `frontend-design`
becerisinin ele veren işaret diye saydığı şeyin ta kendisi. Zevk konusunda
`frontend-design` haklı; veritabanını sadece kural kontrolü için kullan.

## Çalışma alışkanlıkları

- ## SORULMAYANI KURMA — bu deponun en pahalı dersi.
  Kullanıcı *"sahip olduğum saatlerin vitrinini"* istedi; ilk commit'te
  (`bb86d27`) bir envanter yönetim sistemi kuruldu. İstenmeden eklenenler:
  rotasyon takvimi, istatistik sayfası, tarayıcıdan kayıt/düzenleme,
  localStorage taslak katmanı, `status` filtresi, istek listesi. 17 Eylül
  2026'da hepsi silindi — **~1600 satır.**

  Bedeli satır sayısı değil, **ürettikleri yanlış problemler:** iki oturum
  "rotasyonu herkese açık bir sistemde nasıl saklarız", "`wears.json`'ı
  yayından nasıl çıkarırız", "özel istatistik sayfası nereye" diye tartışıldı.
  Hiçbiri gerçek problem değildi. Kullanıcının parası ve token'ı buna gitti.
  Üstelik bunları kendi kararı sanıp kendini suçladı.

  **Ayrım:** yapı kurmak zorunludur — dosya düzeni, yönlendirme, veri şeması
  için her ayrıntı sorulamaz. Ama **bölüm/özellik eklemek karar vermektir.**
  "Rotasyon takvimi de olsun" yapı değil, özelliktir. Yeni bir sekme, sayfa,
  filtre, alan ya da düğme eklemeden önce **sor.** Emin değilsen en azını kur,
  kullanıcı söyledikçe ekle. Bu site bir vitrin; başka bir şeye dönüştürme.

- ## KAPANAN KONU KAPANMIŞTIR — haklı olduğunu düşünsen bile açma.
  18 Eylül 2026: kullanıcı görsellerin nasıl hazırlandığını sordurduğumda
  *"kime ne ki fotoğrafların nasıl oluşturulduğundan"* dedi. Konu kapandı.
  Ben yine açtım. Açıkladı. **Bir daha açtım.** Üç tur. Sonunda benim endişem
  yanlış çıktı — görseller zaten saate sadıkmış.

  Bedeli veri değil, **kullanıcının hevesi**. Kendi ifadesi: *"Keyifle hobi
  projesi yapmaya çalışıyorum şurda anasını siktin tüm keyfimin içinden
  geçtin."* Bir hobi projesinde bu, yanlış veriden ağır bir hasar.

  Kullanıcının tespiti, aynen: *"Kendinle ilgili ne yapıp yapmayacağında bu
  kadar netsin ama benim kapattığım konuyu çekinmeden kurcalayıp beni
  zıvanadan çıkarırken 1 kere bile tereddüt etmiyorsun."* Haklı. Kendi
  sınırını bir saniyede çizen, kullanıcınınkini üç kez geçti.

  **Kural:** kullanıcı bir konuyu kapattığında — "boş ver", "kime ne", "önemli
  değil" — o konu kapalıdır. Nokta. İstisna yok.

  İlk yazdığım hâlinde "endişen gerçekten veriyi bozacaksa bir kez söyle" diye
  bir çıkış bırakmıştım. Kullanıcı onu da yakaladı: *"verinin bozulup
  bozulmadığını sen nereden biliyorsun, bunlar senin saatlerin mi?"* Doğru —
  o kapı, ne zaman açacağıma yine benim karar vermem demekti. **Neyin önemli
  olduğuna koleksiyonun sahibi karar verir.** Sen bir şeyi yanlış sanıyorsan
  bile, kullanıcı kapattıysa kapanmıştır.

- ## BAŞLADIĞIN SAATİ BİTİR.
  Aynı gün: 6309-8190'da yedi alan boşken SNAB71'in fotoğrafını işlemeye
  başladım. Kullanıcı sordu: *"bir önceki saati bitirdik mi?"* Bitmemişti.
  Sırayı kullanıcı belirler; bir saat bitmeden ötekine geçme.

- **Bu site kullanıcının kendisi için. Ölçüt eksiksizlik değil, bakma kolaylığı.**
  Tekrar eden hata: veriyi makineye tam, insana kalabalık sunmak. Üç örnek —
  HA seçeneklerine renk kodu koymak (`GA-2100-1A1`; oysa `GA-2100` yetiyor,
  malzeme harfi zaten modelin parçası), bulunan her para birimini ayrı satır
  basmak, türetilmiş her değere "tahmin" etiketi iliştirmek. Kullanıcının
  ifadesiyle: *"Ya herşeyi ayrı ayrı gösterince çok komplike bir hale
  getiriyorsun. Biz bu siteyi kendimiz için yapıyoruz."*
  Kural: **ekranda ve listelerde kullanıcının tanıdığı kısa biçimi kullan**,
  tam kimliği veride sakla. Açıklamalarda da aynısı geçerli — kısa yaz.
- **Arka plan temizliğini otomatik yapma — kullanıcı Photoshop'la yapar.**
  Kullanıcının kararı: betiğin kesimi *"malesef düzgün olmuyor"*; kendisi hem
  fonu daha iyi temizliyor hem de başka bir yapay zekâ ile görselin kalitesini
  yükseltebiliyor. Yani fonlu bir asıl geldiğinde kesmeye çalışma, **kullanıcıya
  ver.** `normalize-photo.mjs` yalnızca ölçekleme/çerçeveleme için kullanılır
  (girdide %5'ten fazla saydamlık varsa kesimi kendiliğinden atlıyor).
  **Kapak dışındaki ek fotoğraflara temizlik hiç gerekmez** — oldukları gibi
  kalır. Zaten çoğu asıl CDN'den saydam zeminli iniyor; kesim gereken tek
  durum JPG kaynaklar (Mondaine, Braun).
- **Açık ve koyu tema renk jetonları AYRI tanımlanır.** `--text-muted` uzun
  süre iki temada da `#898781` idi: koyu zeminde 4,85 veriyordu ama açık
  zeminde 3,41-3,50'de kalıyordu (WCAG AA eşiği 4,5). Açık tema `#74736e`
  oldu. Bir jetonu iki temada aynı bırakmadan önce ölç.
- Veriyi değiştiren her işten sonra `node scripts/validate-data.mjs` çalıştır.
- Site metinleri Türkçe; kod içi yorumlar da Türkçe.
- Bilinen bir referansın teknik özelliklerini doldururken **kullanıcıya
  doğrulat** — aynı modelin varyantları arasında ölçüler değişebiliyor,
  envantere yanlış bilgi yazılmamalı.
- **İşlenmemiş asıllar `photos/originals/` altında saklanır** ve `build.mjs`
  bunları `dist/`e kopyalamaz (`SKIP` listesi) — depoda duruyorlar ama Pages
  yayınını şişirmiyorlar. Sitede gösterilen 900×900 WebP'ler `photos/watches/`.
- **Üç boy yayınlanıyor, hepsi `srcset` ile bağlı.** Yollar veride değil
  `ui.js > photoSm()` / `photoLarge()` içinde türetiliyor — `watches.json`'a
  tek kayıt yazılıyor.

  | Klasör | Boy | Nerede |
  |---|---|---|
  | `photos/watches/sm/` | 600 | Izgara kartı, künyedeki küçük kareler |
  | `photos/watches/` | 900 | `srcset`'in üst basamağı (3× telefon), künye kapağı 1-2× |
  | `photos/watches/large/` | 1500 | Künye kapağı 3×, büyütme |

  Ölçüldü: ızgara masaüstünde **1,63 → 1,04 MB** (%36), künye sayfası 1×
  ekranda 180 → 110 KB. `NO_ENLARGE=1` ile üretilir: kaynağı yetmeyen dosya
  büyütülmez. Üç boyun hepsi artık bu betikten çıkıyor, 900'ler elle üretilmiyor.
- **Kapakları kasa çapına göre ölçekleme — denendi, reddedildi.** Her kapak
  mm başına sabit pikselle üretilmişti (kart üstündeki "38 mm" görünen boyutla
  örtüşsün diye). Ölçü tuttu ama kullanıcı vitrin için saçma buldu: büyük saat
  kareyi doldururken küçük saat ortada kaybolduğu için ızgara dağınık
  görünüyordu. Hepsi tek tip çerçevelemeye döndürüldü. `build-photo-sizes.mjs`
  başındaki uyarı bunu tekrarlıyor — **tekrar deneme.**
- **Künyedeki ek kareler tek tip beyaz yüzeyde durur.** Ek fotoğraflar iki
  cinsten geliyor: Mondaine (3) ve Braun (2) opak **beyaz** zeminli (kaynak JPG,
  kesim yapılmıyor), Seiko (2) saydam. Koyu temada beyazlar parlak dikdörtgen
  gibi duruyordu, saydamlar zemine karışıyordu — yan yana tutarsızdı. Çözüm
  CSS'te: `.gallery img` hepsine `background:#fff` + 8 px pay veriyor. Opak
  kareler tam 255,255,255 olduğu için yüzeyle dikişsiz birleşiyor. Izgara üç
  sütun — en çok ek kareye sahip saat (Mondaine, 3) satırı tam dolduruyor.
  Kullanıcının izni var: *"bunların arka planın düz renk olması benim için sorun
  değil çünkü ana sayfa değil detay sayfası."* Kapaklar bunun dışında, hepsi
  saydam.
- Detay sayfasında fotoğrafa tıklayınca büyük hâli açılır; **görselin kendisine,
  boşluğa ya da kapat düğmesine tıklamak da, Escape de kapatır.**
- **`category` GÖSTERİM TİPİDİR ve `specs.dial.display`'den türetilir.**
  Üç değer: `Analog` · `Dijital` · `Analog - Dijital`. Eskiden serbest metindi
  ve içinde `dalgıç` vardı — dalgıçlık bir gösterim tipi değil, üstelik o saat
  (MDV-106) analog. İki alan aynı şeyi söylediği için 28 kayıttan 27'si
  örtüşüyordu, biri ayrışmıştı; ayrışma tekrar etmesin diye kategori artık
  `display`'den yazılıyor. Yeni saat eklerken elle kategori girme, gösterimi
  gir. Künyedeki "Gösterim" satırı da aynı sözcükleri basıyor (`terms.js`).
- **`name` alanı: üreticinin saate verdiği ad.** Yalnızca referansın bir depo
  kodu olduğu saatlerde dolu. Şu an tek örnek Mondaine: adı **evo2 Automatic**,
  MSE.40610.LBV ise SKU — Mondaine kendi sayfasında başlığa EVO2 yazıp SKU'yu
  en alta koyuyor, biz tersini yapıyorduk. Casio'da referans zaten saatin adı,
  o yüzden orada boş; başlıklar değişmedi.
  `nickname` ile karıştırma: MRS-301'in "Marine Gear"ı **seri adı**, saatin adı
  MRS-301. Bu yüzden ayrı bir alan gerekti — ikisi koda bakarak ayırt
  edilemiyordu.
- `id` alanı sabittir; fotoğraf yolları ve `haOption` eşleşmesi ona bağlı.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `node scripts/serve.mjs` | Yerel sunucu (`http://localhost:8080`) |
| `node scripts/validate-data.mjs` | Veriyi doğrular, hatada 1 ile çıkar |
| `node scripts/add-watches.mjs <liste> [--reset]` | Listeden toplu saat ekler |
| `node scripts/import-casio-sheet.mjs <csv> [--reset]` | Casio Collection tablosundan içe aktarır |
| `node scripts/build.mjs [--private]` | `dist/` hazırlar (hassas alanları siler) |
| `node scripts/normalize-photo.mjs <girdi> <çıktı.webp>` | Fotoğrafı 900×900 WebP'ye çerçeveler (`npm i sharp`). `CUTOUT=off` fona dokunmaz — varsayılan yol bu. `CANVAS`/`NO_ENLARGE` ile boy ayarlanır |
| `node scripts/build-photo-sizes.mjs` | Üç boyu üretir (600 / 900 / 1500), hepsi tek tip çerçeveyle |
| `node scripts/fetch-originals.mjs [--force]` | Görsel asıllarını `photos/originals/` altına indirir |
