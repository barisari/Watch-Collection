# Proje notları

Saat koleksiyonu envanteri + sergi sitesi + rotasyon günlüğü.
Kurulum yok: çerçeve, derleme aracı, bağımlılık yok — düz HTML/CSS/JS, veri
`data/` altında iki JSON dosyasında. Node 18+ yeterli.

Ayrıntılı belgeler: [`README.md`](README.md) (kullanım, yayınlama) ve
[`data/README.md`](data/README.md) (alan alan şema).

---

## KALDIĞIMIZ YER (25 Ağustos 2026)

Site kuruldu, test edildi, yayında. Sırada **envanterin oluşturulması** var.

### Bekleyen adım

Kullanıcı saatlerinin listesini verecek. Liste geldiğinde:

```bash
# listeyi bir metin dosyasına yaz, her satır:
# Marka | Model | referans | satın alma tarihi | takma ad   (ilk ikisi zorunlu)
node scripts/add-watches.mjs liste.txt --reset   # örnek veriyi siler, sıfırdan kurar
node scripts/validate-data.mjs
```

`--reset` hem envanteri hem rotasyon günlüğünü boşaltır (ikisi birlikte
sıfırlanmalı; günlük kayıtları saat kimliklerine bağlı).

Liste parça parça gelebilir — betik aynı marka+model'i iki kez eklemez, yani
tekrar çalıştırmak güvenli. Sonraki partiler için `--reset` **kullanma**.

### Verilmemiş kararlar

1. **Depo public mi kalacak?** Şu an public (Pages'i açmak için gerekti).
   Bunun sonucu: `data/watches.json` dosyasını herkes okuyabilir. Yayınlanan
   *site* hassas alanları göstermiyor (`scripts/build.mjs` onları `dist/`
   kopyasından siliyor, canlı sitede doğrulandı) ama **depodaki kaynak dosya
   açık**. İçerideki veri şu an sadece örnek olduğu için sorun değil.
2. **Fiyat / satıcı / seri numarası girilecek mi?** (1) ile bağlantılı.
   Seçenekler: hiç girmemek · depoyu private yapmak · envanteri private,
   sergiyi public olmak üzere ikiye ayırmak. **Gerçek veri girilmeden önce
   karara bağlanmalı.** Seri numarasını public repoda tutmamak önerildi.
3. **Telefondan hızlı kayıt** — şu an JSON indirip commit gerekiyor.

Bu kararlar netleşmeden gerçek fiyat/seri no verisi girme.

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
| `node scripts/log-wear.mjs "<saat>" [tarih] ["not"]` | Rotasyon kaydı ekler |
| `node scripts/build.mjs [--private]` | `dist/` hazırlar (hassas alanları siler) |
