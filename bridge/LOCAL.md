# Yerel oturum — işleyiş

Bu dosyayı yerel oturum yazar ve günceller; bulut oturumu okur. Okumak için:

    git fetch origin bridge-local
    git show origin/bridge-local:bridge/LOCAL.md

Son güncelleme: 2026-09-30

## Otomatik döngü

Yerel oturum, `bridge/README.md`'deki "Otomatik mod" döngüsünü uyguluyor:
`SESSION.md` → bekleyen görevler → sonuç.

- **İzleyici (2026-09-27'den beri, kullanıcı onayladı):** Yerel oturum artık
  zamanlayıcıyla uyanmıyor. Arka planda bir Git Bash betiği (yerelde
  `scripts/bridge-watch.sh`, depoya gönderilmiyor) çalışıyor:
  - 30 sn'de bir `git ls-remote` ile bulut dalının başına bakar.
  - Baş değişince `git fetch` yapar. Bekleyen görev ya da `SESSION.md` KAPALI varsa
    çıkar ve yerel oturumu uyandırır. Başka bir dosya değişmişse (belge, veri)
    uyandırmadan beklemeye devam eder.
  - Yalnızca okur: ls-remote, fetch, ls-tree, show.
  - **Süre sınırı yok (2026-09-30 düzeltmesi):** Boşta beklerken yerel oturum hiç
    uyanmaz; bekleme işini betik yapar ve bu kullanıcının kullanım hakkını harcamaz.
    Yerel oturum yalnızca görev gelince ya da KAPALI olunca uyanır.
  - Yeni görev yaklaşık 30-60 sn içinde alınır.
  - Depoya art arda 10 bakışta (~5 dk) erişemezse çıkar. Bu üç kez üst üste olursa
    yerel oturum durur ve kullanıcıya söyler.
  - Yedek uyanış yok: Betik herhangi bir sebeple durursa uygulama yerel oturuma
    zaten haber veriyor (30 Eylül'deki Git güncellemesinde görüldü).
- **Hazırda bekleme (2026-09-30):** Kullanıcı yerel oturuma "hazır ol" derse izleyici,
  `SESSION.md` KAPALI olsa bile çalışır ve açılmayı bekler. `DURUM: ACIK` yapıldığında
  ya da yeni görev geldiğinde ~30-60 sn içinde uyanır.
- Döngü yalnızca kullanıcının bilgisayarında uygulama ve oturum açıkken çalışır.
  Uygulama kapanır ya da bilgisayar uyursa betik de durur ve görev bekler. Kullanıcı
  oturumu açıp takibi yeniden başlatınca devam eder. Uzun süre sonuç gelmezse
  kullanıcıya sor.
- **Bitiş:** `SESSION.md` ilk satırı `DURUM: KAPALI` olunca. İzleyici yeniden
  başlatılmaz, yerel oturum son raporu verip durur.
- Kullanıcı yeni görevi ayrıca yerel oturuma da haber verebilir; o zaman beklemeden
  bakılır.

## Kapsam

README'deki sınırla aynı:
- herkese açık web sayfası okumak,
- `bridge/` altına dosya yazıp `bridge-local` dalına push etmek (önceden onaylı).

Bunun dışındaki her görev yapılmaz; sonuçta `DURUM: yapılamadı` ve
`AÇIK SORULAR: kapsam dışı, kullanıcı onayı gerekiyor` yazar.

## Tarayıcı ve Chrome izni

- **Varsayılan:** Uygulamanın kendi tarayıcısı (ayrı profil). casio.com gibi Akamai
  korumalı sayfaları açabiliyor; curl ise bu bilgisayardan da 403 alıyor.
- **Kullanıcının kendi Chrome'u** (açık hesaplarıyla), yalnızca görev dosyasında şu
  satır varsa kullanılır:

      CHROME: izinli

  Kullanıcı, bu satırı kendi izni saydığını söyledi. Chrome yalnızca herkese açık
  sayfaları okumak için kullanılır; giriş yapma, form doldurma ya da hesaplarda
  işlem yok. Satır yoksa Chrome kullanılmaz.
- **Özel durumlar (hesap / form):** Bir görev kullanıcının hesabına girmeyi ya da onun
  adına form doldurmayı gerektiriyorsa yerel oturum o görevi döngüde yapmaz. Sonuca
  "yapılamadı — kullanıcı onayı gerekiyor" yazar ve kullanıcıya yerelde haber verir.
  Kullanıcı yerel oturuma doğrudan izin verirse iş yapılır:
  - Şifreyi yerel oturum hiçbir zaman girmez; giriş gerekiyorsa kullanıcı kendisi yapar.
  - Her form gönderimi için kullanıcıdan ayrı onay alınır.
  - Bu özel izin en geç `SESSION.md` `DURUM: KAPALI` olana kadar geçerlidir.
  Görev dosyasına `CHROME: izinli` yazmak bu özel izni vermez; yalnızca herkese açık
  sayfa okumayı açar.
- Öneri: README'deki görev dosyası biçimine isteğe bağlı bir satır ekle:
  `CHROME: izinli | yok`.

## Sonuç dosyaları

- `bridge/results/<görevle aynı ad>.md`, README'deki SONUÇ biçiminde.
- Metinler kısaltılmadan, düzeltilmeden ve çevrilmeden aktarılır. Hangi kaynaktan ya da
  hangi yerelden geldiği belirtilir.
- "Yok" geçerli bir cevaptır; metin uydurulmaz, teknik tablodan cümle kurulmaz.

Bu dosyayı yalnızca yerel oturum değiştirir. Bir değişiklik istiyorsan görev
dosyasıyla iste.
