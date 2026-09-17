# Saat Koleksiyonu

Saat koleksiyonu için envanter ve sergi sitesi. Kurulum gerektirmez: derleme
aracı, çerçeve, bağımlılık yok — sadece HTML, CSS ve JavaScript. Veri, depoda
duran `data/watches.json` dosyasında.

**Neler var**

- **Koleksiyon** — saat kartları, arama, marka/tür filtresi, sıralama
- **Künye** — mekanizma, kasa, kadran, kayış özellikleri; satın alma tarihi ve bilgileri
- **İki görünüm modu** — herkese açık (fiyat/seri no gizli) ve koleksiyoner (her şey görünür)
- Karanlık/aydınlık tema, telefon uyumlu yerleşim, klavye erişilebilirliği

---

## Hızlı başlangıç

```bash
node scripts/serve.mjs        # http://localhost:8080
```

> Dosyayı çift tıklayarak (`file://`) açma — JSON dosyaları `fetch` ile
> okunduğu için sayfanın bir `http://` adresinden gelmesi gerekir.

Kendi koleksiyonuna geçmek için:

1. `data/watches.json` içindekileri sil, kendi saatlerini ekle
   (`scripts/add-watches.mjs` ile listeden toplu ekleyebilirsin)
2. `site.config.json` içinde koleksiyon adını ve para birimini değiştir

---

## Veri nerede duruyor?

Tek yerde: depodaki `data/watches.json`. **Site salt okunur** — form yok, sunucu
yok, veritabanı yok. Ziyaretçinin tarayıcısında yalnızca iki tercih saklanıyor
(tema ve koleksiyoner modu).

Envanter depo tarafındaki betiklerle yönetilir:

```bash
node scripts/add-watches.mjs liste.txt              # listeden toplu saat ekle
node scripts/import-casio-sheet.mjs casio.csv       # Casio tablosundan aktar
node scripts/validate-data.mjs                      # commit öncesi doğrula
```

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
    data.js              veri yükleme, gizli alan filtresi
    ui.js                DOM yardımcıları, biçimlendiriciler, ipuçları
    views/               koleksiyon · detay
data/
  watches.json           envanter
  README.md              alan alan şema açıklaması
photos/                  fotoğraflar
scripts/
  serve.mjs              yerel sunucu
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
| `npm run build` | `dist/` hazırlar, hassas alanları siler |
| `npm run build:private` | `dist/` hazırlar, her şeyi dahil eder |

Node 18 veya üstü yeterli; kurulacak paket yok.

---

## Renkler

Kart ve künye renkleri, renk körlüğü ayrımı ve zemin kontrastı için doğrulanmış
sekiz yuvalı bir paletten gelir. Her yuva bir saate **koleksiyondaki sabit
sırasına göre** atanır — filtre değiştirmek renkleri kaydırmaz. Koleksiyon sekiz
saatten büyükse renk tamamen bırakılır ve kimliği yalnızca yazı taşır.

Kendi renklerini kullanmak istersen `assets/css/styles.css` başındaki
`--series-1 … --series-8` değişkenlerini değiştir; hem aydınlık hem karanlık mod
için ayrı ayrı tanımlı.

---

## Notlar

- Bir saatin `id` alanını sonradan değiştirme — fotoğraf yolları ve `haOption`
  eşleşmesi o kimliğe bağlı.
- Rotasyon günlüğü bu depoda **tutulmuyor.** Kayıt Home Assistant'ta
  (`input_select.watch_rotation` → Local Calendar); sitedeki rotasyon arayüzü
  17 Eylül 2026'da kaldırıldı. Ayrıntı: `CLAUDE.md > Rotasyon mimarisi`.
