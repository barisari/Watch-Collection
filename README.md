# Saat Koleksiyonu

Saat koleksiyonu için envanter, sergi sitesi ve rotasyon günlüğü. Kurulum
gerektirmez: derleme aracı, çerçeve, bağımlılık yok — sadece HTML, CSS ve
JavaScript. Veri, depoda duran iki JSON dosyasında.

**Neler var**

- **Koleksiyon** — saat kartları, arama, marka/tür filtresi, yedi farklı sıralama
- **Künye** — mekanizma, kasa, kadran, kayış özellikleri; satın alma tarihi ve bilgileri
- **Rotasyon takvimi** — hangi gün hangi saati taktığın, aylık takvim görünümünde
- **İstatistik** — saat başına takılma günü ve payı, en çok/en az takılan, en uzun seri,
  uzun süredir takılmayanlar, sıradaki için öneri, servis takvimi, takılma başına maliyet
- **İki görünüm modu** — herkese açık (fiyat/seri no gizli) ve koleksiyoner (her şey görünür)
- Karanlık/aydınlık tema, telefon uyumlu yerleşim, klavye erişilebilirliği

---

## Hızlı başlangıç

```bash
node scripts/serve.mjs        # http://localhost:8080
```

> Dosyayı çift tıklayarak (`file://`) açma — JSON dosyaları `fetch` ile
> okunduğu için sayfanın bir `http://` adresinden gelmesi gerekir.

Açılışta örnek olarak dört saat ve dört aylık bir rotasyon günlüğü gelir.
Kendi koleksiyonuna geçmek için:

1. `data/watches.json` içindekileri sil, kendi saatlerini ekle
   (siteden "Kayıt ekle" sekmesini kullanabilirsin — aşağıya bak)
2. `data/wears.json` içeriğini `[]` yap
3. `site.config.json` içinde koleksiyon adını ve para birimini değiştir

---

## Veri nerede duruyor? (ve siteye giren biri veriyi değiştirebilir mi?)

Hayır, değiştiremez. İki ayrı katman var:

| | Nerede | Kim değiştirebilir |
|---|---|---|
| **Asıl veri** | Depodaki `data/*.json` | Sadece depoya yazma yetkisi olan sen |
| **Taslak** | Ziyaretçinin kendi tarayıcısı (`localStorage`) | Herkes — ama sadece kendi ekranında |

Sitedeki formlar taslağa yazar. Taslak o cihazdan dışarı çıkmaz: sunucu yok,
veritabanı yok, gönderilecek bir yer yok. Bir ziyaretçi form doldurursa yalnızca
kendi sekmesindeki görüntüyü değiştirmiş olur; sayfayı yenilediğinde bile senin
verinde hiçbir şey değişmez.

Sen bir kayıt eklediğinde de aynısı olur — bu yüzden kalıcı hale getirmek için
bir adım daha var:

**Kayıt ekle → `watches.json` indir / `wears.json` indir → dosyaları `data/`
klasörüne koy → commit et.**

Terminali tercih ediyorsan taslak adımını tamamen atlayabilirsin:

```bash
node scripts/log-wear.mjs "Speedmaster"             # bugün için kaydet
node scripts/log-wear.mjs "BB58" 2026-08-20         # belirli bir gün
node scripts/log-wear.mjs "SKX" dün "yağmurlu gün"  # notlu
node scripts/validate-data.mjs                      # commit öncesi doğrula
```

`log-wear.mjs` saati marka, model, takma ad veya referanstan bulur; birden fazla
eşleşme olursa sana sorar.

---

## Gizli alanlar — önemli ayrım

Üstteki **"Herkese açık / Koleksiyoner modu"** düğmesi satın alma fiyatını,
satıcıyı, seri numarasını ve güncel değeri gizler. Bu bir **görüntü tercihidir,
güvenlik önlemi değildir**: veri tarayıcıya indiği için isteyen ham JSON'a
bakabilir.

Siteyi herkese açık yayınlayacaksan gerçek çözüm, o alanların yayınlanan
kopyada hiç bulunmamasıdır:

```bash
npm run build          # dist/ — hassas alanlar JSON'dan tamamen SİLİNİR
npm run build:private  # dist/ — her şey dahil (yalnızca özel yayın için)
```

`npm run build` depodaki asıl dosyalara dokunmaz; sadece `dist/` kopyasını
temizler. Hangi alanların gizli sayılacağını `site.config.json` içindeki
`privateFields` listesi belirler.

Deponun kendisi private ise ve site yalnızca sana açıksa `build:private`
kullanabilirsin.

---

## Yayınlama (GitHub Pages)

`.github/workflows/pages.yml` hazır. Tek seferlik ayar:

1. GitHub'da depo → **Settings → Pages**
2. **Source** olarak **GitHub Actions** seç

Bundan sonra ana dala her gönderimde veri doğrulanır, site derlenir ve
yayınlanır. İş akışı `npm run build` kullanır — yani **yayınlanan sitede fiyat,
satıcı, seri no ve güncel değer bulunmaz**. Bunu değiştirmek istersen
`pages.yml` içindeki derleme adımını `node scripts/build.mjs --private` yap
(ve deponun private olduğundan emin ol).

---

## Fotoğraf ekleme

Dosyaları `photos/` klasörüne koy, sonra saat kaydına yolunu yaz:

```json
"photos": ["photos/speedmaster-1.jpg", "photos/speedmaster-2.jpg"]
```

İlk fotoğraf kapak görseli olur. Ayrıntı: `photos/README.md`.

---

## Dosya düzeni

```
index.html               site kabuğu
site.config.json         koleksiyon adı, para birimi, gizli alan listesi, eşikler
assets/
  css/styles.css         tüm stiller ve renk jetonları
  js/
    app.js               yönlendirme, tema, görünürlük modu
    data.js              veri yükleme, tarayıcı taslakları, dışa aktarım
    stats.js             rotasyon istatistiği hesaplamaları
    ui.js                DOM yardımcıları, biçimlendiriciler, ipuçları
    views/               koleksiyon · detay · takvim · istatistik · kayıt
data/
  watches.json           envanter
  wears.json             rotasyon günlüğü
  README.md              alan alan şema açıklaması
photos/                  fotoğraflar
scripts/
  serve.mjs              yerel sunucu
  log-wear.mjs           terminalden rotasyon kaydı
  validate-data.mjs      veri doğrulama
  build.mjs              dist/ hazırlama (hassas alanları temizler)
```

Veri şemasının tamamı — hangi alan ne işe yarıyor, hangileri zorunlu —
[`data/README.md`](data/README.md) içinde.

---

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm start` | Yerel sunucuyu başlatır (`http://localhost:8080`) |
| `npm run validate` | `data/*.json` dosyalarını doğrular |
| `npm run wear -- "BB58"` | Bugün için rotasyon kaydı ekler |
| `npm run build` | `dist/` hazırlar, hassas alanları siler |
| `npm run build:private` | `dist/` hazırlar, her şeyi dahil eder |

Node 18 veya üstü yeterli; kurulacak paket yok.

---

## Renkler

Takvim ve grafiklerdeki renkler, renk körlüğü ayrımı ve zemin kontrastı için
doğrulanmış sekiz yuvalı bir paletten gelir. Her yuva bir saate **koleksiyondaki
sabit sırasına göre** atanır — filtre değiştirmek renkleri kaydırmaz. Koleksiyon
sekiz saatten büyükse renk tamamen bırakılır ve kimliği yalnızca yazı taşır;
zaten her takvim hücresinde saatin kısa adı, her grafiğin altında da aynı veriyi
veren bir tablo görünümü vardır.

Kendi renklerini kullanmak istersen `assets/css/styles.css` başındaki
`--series-1 … --series-8` değişkenlerini değiştir; hem aydınlık hem karanlık mod
için ayrı ayrı tanımlı.

---

## Notlar

- `data/watches.json` içindeki dört saat **örnektir**; teknik özellikler yaklaşık
  değerlerdir, kendi kayıtlarını girerken üreticinin verisinden doğrula.
- Bir saatin `id` alanını sonradan değiştirme — rotasyon kayıtları o kimliğe bağlı.
  Değiştirmen gerekirse `data/wears.json` içindeki `watchId` değerlerini de güncelle.
- Aynı güne birden fazla saat yazabilirsin; takvim hepsini gösterir.
