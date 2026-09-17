# Veri şeması

İki dosya var ve ikisi de düz JSON. Elle düzenleyebilir, siteden indirebilir
veya `scripts/` altındaki araçlarla güncelleyebilirsin. Her değişiklikten sonra:

```bash
node scripts/validate-data.mjs
```

---

## `watches.json` — envanter

Saat nesnelerinden oluşan bir dizi. **Zorunlu alanlar sadece `id`, `brand` ve
`model`.** Diğer her şey isteğe bağlı; boş bıraktığın alan sitede hiç
görünmez, "—" bile yazmaz.

```jsonc
{
  "id": "omega-speedmaster-3861",   // benzersiz, kısa, sabit. Sonradan değiştirme:
                                    // sabit; fotoğraf yolları ve haOption buna bağlı.
  "brand": "Omega",
  "model": "Speedmaster Professional Moonwatch",
  "nickname": "Moonwatch",          // kartlarda ve listelerde kısa ad
  "shortCode": "Moon",              // takvim hücresine sığan çok kısa ad (≤6 karakter).
                                    // Boş bırakırsan nickname/model kısaltılarak kullanılır.
  "reference": "310.30.42.50.01.001",
  "year": 2022,
  "category": "kronograf",          // serbest metin; filtre kutusunu besler
  "status": "owned",                // owned | sold | wishlist

  "specs": {
    "movement": {
      "caliber": "Omega 3861",
      "type": "automatic",          // automatic | manual | quartz | spring-drive | solar
      "powerReserve": 50,           // saat
      "frequency": 21600,           // A/s (vph)
      "jewels": 26,
      "certification": "METAS Master Chronometer"
    },
    "case": {
      "material": "Paslanmaz çelik",
      "diameter": 42,               // mm
      "thickness": 13.2,            // mm
      "lugToLug": 47.5,             // mm
      "lugWidth": 20,               // mm — kayış değişimi için
      "crystal": "Hesalite",
      "waterResistance": 50,        // metre
      "bezel": "Takimetre, siyah alüminyum"
    },
    "dial": {
      "color": "Siyah",
      "indices": "Aplike",
      "lume": "Super-LumiNova",
      "complications": ["kronograf", "küçük saniye"]
    },
    "strap": {
      "type": "Bilezik",            // Bilezik | Kayış
      "material": "Paslanmaz çelik",
      "clasp": "Katlanır klips"
    }
  },

  "acquisition": {
    "date": "2022-04-12",           // YYYY-MM-DD — "ne zaman aldım"
    "price": { "amount": 6200, "currency": "USD" },   // gizli alan
    "seller": "Yetkili bayi",                          // gizli alan
    "condition": "new",             // new | like-new | excellent | good | fair | vintage
    "boxPapers": true,
    "serial": "…"                   // gizli alan
  },

  "valuation": { "amount": 7400, "currency": "USD", "asOf": "2026-01-01" },  // gizli

  "service": {
    "lastServiceDate": "2022-04-12",
    "intervalYears": 8              // istatistik sayfasındaki servis takvimini besler
  },

  "photos": ["photos/speedmaster-1.jpg"],   // ilki kapak görseli
  "tags": ["ikonik", "günlük"],
  "notes": "Serbest metin."
}
```

### "Gizli alan" ne demek?

`site.config.json > privateFields` listesindeki alanlar (varsayılan: satın alma
fiyatı, satıcı, seri numarası ve güncel değer) sitede **herkese açık modda
gizlenir**, koleksiyoner modunda görünür.

Bunun bir güvenlik önlemi olmadığını unutma: veri tarayıcıya indiği için
görüntüyü kapatmak yeterli değildir. Siteyi herkese açık yayınlıyorsan
`npm run build` kullan — bu komut, `dist/` kopyasındaki JSON'dan o alanları
**tamamen siler**. Depon private ise ya da siteyi sadece kendin açıyorsan
`npm run build:private` ile her şeyi dahil edebilirsin.

---

## Sık yapılan işler

```bash
node scripts/add-watches.mjs liste.txt              # listeden toplu saat ekle
node scripts/import-casio-sheet.mjs casio.csv       # Casio tablosundan aktar
node scripts/validate-data.mjs                      # doğrula
```
