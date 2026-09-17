# Saat Koleksiyonu

Saat koleksiyonu için envanter ve sergi sitesi. Kurulum gerektirmez: derleme
aracı, çerçeve, bağımlılık yok — sadece HTML, CSS ve JavaScript. Veri, depoda
duran `data/watches.json` dosyasında.

**Neler var**

- **Koleksiyon** — markaya göre gruplu, gerçek ölçekli kontakt baskı; arama
- **Künye** — mekanizma, kasa, kadran, kayış özellikleri; satın alma tarihi ve bilgileri
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
(şu an yalnızca tema tercihi).

Envanter depo tarafındaki betiklerle yönetilir:

```bash
node scripts/add-watches.mjs liste.txt              # listeden toplu saat ekle
node scripts/import-casio-sheet.mjs casio.csv       # Casio tablosundan aktar
node scripts/validate-data.mjs                      # commit öncesi doğrula
```

---

## Hassas alanlar

Satın alma fiyatı, satıcı, seri numarası ve güncel değer bu depoya **hiç
girmez** — depo public. Bir gün yanlışlıkla girilirse yayına çıkmaması için
derleme adımı onları `dist/` kopyasından siliyor:

```bash
npm run build          # dist/ — hassas alanlar JSON'dan tamamen SİLİNİR
npm run build:private  # dist/ — her şey dahil (yalnızca özel yayın için)
```

Depodaki asıl dosyalara dokunmaz, yalnızca `dist/` kopyasını temizler. Hangi
alanların hassas sayılacağını `site.config.json > privateFields` belirler.

**Sitede bunu göster/gizle yapan bir düğme yok.** Eskiden vardı ("Herkese açık /
Koleksiyoner modu"); 17 Eylül 2026'da kaldırıldı, çünkü tarayıcıdaki bir düğme
gizlilik sınırı değildir ve o alanlar yayınlanan veride zaten bulunmuyor —
düğme hiçbir şey yapmıyor, yalnızca gizli veri varmış izlenimi veriyordu.
Gerçek koruma: veriyi hiç yayınlamamak.

**Liste fiyatı (`msrp`) hassas değil** ve künyede görünüyor — üreticinin ilan
ettiği rakam, gizlenecek bir şey yok.

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
site.config.json         koleksiyon adı, para birimi, hassas alan listesi
assets/
  css/styles.css         tüm stiller ve renk jetonları
  js/
    app.js               yönlendirme, tema, görünürlük modu
    data.js              veri yükleme
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

Sayfada renk yok. Zemin akromatik bir stüdyo grisi; fotoğraflar saydam olduğu
için 28 saatin kendi rengi tek renk kaynağı. Dört jeton var (`--ground`,
`--ink`, `--ink-2`, `--rule`), açık ve koyu tema için ayrı ayrı tanımlı ve
her ikisi ölçülmüş: en düşük kontrast 4,56 (WCAG AA eşiği 4,5).

Yazı tek aile: Archivo, `assets/fonts/` altında gömülü (OFL). Üçüncü taraf
isteği yok.

---

## Notlar

- Bir saatin `id` alanını sonradan değiştirme — fotoğraf yolları ve `haOption`
  eşleşmesi o kimliğe bağlı.
- Rotasyon günlüğü bu depoda **tutulmuyor.** Kayıt Home Assistant'ta
  (`input_select.watch_rotation` → Local Calendar); sitedeki rotasyon arayüzü
  17 Eylül 2026'da kaldırıldı. Ayrıntı: `CLAUDE.md > Rotasyon mimarisi`.
