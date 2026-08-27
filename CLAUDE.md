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

### Bekleyen adımlar

1. **Teknik özellikler** — 24 saatin kalibre/modül, kasa ölçüleri, su
   geçirmezlik, kadran, kordon bilgileri boş. Üreticinin verisinden doldurulup
   kullanıcıya doğrulatılacak.
2. **`Casio MRS-301-2EVDF`** — tabloda fiyatı ve tarihi yok, bu yüzden içe
   aktarılmadı. Kullanıcıyla konuşulacak.
3. **Casio dışı saatler** — Seiko'lar ve diğerleri henüz girilmedi.
4. **Fotoğraflar** — hepsi boş. Tabloda resmi Casio görsel URL'leri var ama
   hotlink kırılgan; kullanıcının kendi fotoğrafları tercih edilir.

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
