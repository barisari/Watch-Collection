GÖREV: Köprünün iki yönünü de sına. Bu dosyayı okuduğunu doğrula, sonra
sonucu `bridge-local` dalına `bridge/results/2026-09-27-kopru-testi.md`
olarak gönder. Gönderimden önce kullanıcıdan onay al (push onay gerektiriyor).

BAĞLAM: İlk görev kopyala-yapıştır ile yürütüldü ve çalıştı. Artık görevler
depo üzerinden gidip gelecek. Bu dosya o kanalın ilk denemesi; içinde gerçek
bir iş yok, yalnızca kanalın çalıştığını görmek istiyoruz. Depo herkese açık:
`https://github.com/barisari/Watch-Collection`

BAŞARI ÖLÇÜTÜ: `bridge-local` dalında sonuç dosyası oluşmuş olması ve içinde
aşağıdaki üç bilginin bulunması.

DÖNÜŞ: Sonuç dosyasında şu üçü olsun:
  1. Bu görev dosyasının tam yolu ve hangi daldan okuduğun.
  2. Depoyu klonladın mı, yoksa tek dosyayı mı çektin (hangi komutla).
  3. Şu adresin bu bilgisayardan açılıp açılmadığı — sadece durum kodu:
     https://www.casio.com/intl/watches/gshock/product.GBX-100-8/
     ve bunu curl ile mi tarayıcıyla mı aldığın.

ONAY GEREKEBİLECEK ADIMLAR:
  - `git push` (sonucu `bridge-local` dalına göndermek için) — kullanıcıdan onay al.
  - `bridge-local` dalı yoksa oluşturulacak; bu da aynı onayın kapsamında.
  - Başka hiçbir şey: dosya silme, cihaza yazma, kurulum, dışarı veri gönderme yok.
