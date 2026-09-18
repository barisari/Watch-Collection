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
  "name": "Speedmaster",            // ÜRETİCİNİN saate verdiği ad. Yalnızca
                                    // referans bir depo kodu olduğunda doldur:
                                    // Mondaine'de ad "evo2 Automatic", referans
                                    // MSE.40610.LBV bir SKU. Casio'da referans
                                    // zaten saatin adı — orada BOŞ BIRAK.
                                    // Doluysa ızgara kartının ve künye
                                    // başlığının yazısı bu olur, referans
                                    // başlığın altına küçük düşer.
  "nickname": "Moonwatch",          // kartlarda ve listelerde kısa ad
  "shortCode": "Moon",              // takvim hücresine sığan çok kısa ad (≤6 karakter).
                                    // Boş bırakırsan nickname/model kısaltılarak kullanılır.
  "reference": "310.30.42.50.01.001",
  "year": 2022,
  "category": "kronograf",          // serbest metin; filtre kutusunu besler

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
    "price": { "amount": 6200, "currency": "USD" },   // hassas — depoya girmez
    "seller": "Yetkili bayi",                          // hassas — depoya girmez
    "condition": "new",             // new | like-new | excellent | good | fair | vintage
    "boxPapers": true,
    "serial": "…"                   // hassas — depoya girmez
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

### "Hassas alan" ne demek?

`site.config.json > privateFields` listesindeki alanlar: satın alma fiyatı,
satıcı, seri numarası ve güncel değer.

**Depo public olduğu sürece bunlar veriye hiç girmez** (fiyatlar ayrı bir Drive
tablosunda tutulur). `npm run build` bir sigorta: yanlışlıkla girilmiş olsalar
bile `dist/` kopyasındaki JSON'dan **tamamen silinir**, tarayıcıya inmezler.
Depo private olsa `npm run build:private` ile her şey dahil edilebilir.

Sitede bunları göster/gizle yapan bir düğme yok — tarayıcıdaki bir düğme
gizlilik sınırı değildir. **Liste fiyatı (`msrp`) hassas değil**, künyede
görünür.

---

## Sık yapılan işler

```bash
node scripts/add-watches.mjs liste.txt              # listeden toplu saat ekle
node scripts/import-casio-sheet.mjs casio.csv       # Casio tablosundan aktar
node scripts/validate-data.mjs                      # doğrula
```
