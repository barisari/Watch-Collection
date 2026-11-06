GÖREV: Casio'nun saat yazılımı (firmware) güncelleme duyurularını tara ve
aşağıdaki yedi saatten hangisine yeni yazılım geldiğini bul.

BAĞLAM: Proje watch-collection (github.com/barisari/Watch-Collection),
kullanıcının saat koleksiyonunun vitrini. Kullanıcının telefonuna CASIO WATCHES
uygulamasından "saatiniz için güncelleme var" bildirimi geldi ama hangi saat
olduğu görünmüyor. Bulut oturumu casio.com'u açamıyor (403); sen açabiliyorsun.
Bugün 6 Kasım 2026. Kullanıcının Bluetooth'lu saatleri:
  GBD-200-1 · GBX-100-8 · GM-B2100D-1A · GST-B1000D-2A · GW-BX5600-1A1
  OCW-S400RL-8A · OCW-T200S-1A
Bakılacak yerler (yalnızca herkese açık sayfalar):
  1. Casio'nun saat destek duyuruları: casio.com/intl/support/watches/ altındaki
     bilgi/duyuru listesi ve Japonca karşılığı casio.com/jp/support/watches/
     (ソフトウェアアップデート / ファームウェア geçen duyurular).
  2. Her modelin destek sayfası: casio.com/intl/watches/<seri>/support.<MODEL>/
     (seri: gshock, oceanus; Oceanus'lar için jp yereli de). Sayfada yazılım
     sürümü / güncelleme bilgisi varsa al.
  3. CASIO WATCHES uygulamasının kendi duyuru/destek sayfası varsa ona da bak.

BAŞARI ÖLÇÜTÜ: bridge-local dalında bridge/results/2026-11-06-casio-guncelleme.md
var ve yedi saatin her biri için bir satır dolu.

DÖNÜŞ (ÇIKTILAR altına):
  Her saat için tek satır: MODEL | son güncelleme tarihi | sürüm | ne değişti
  (kısaca) | kaynak adresi. Hiç duyuru yoksa "duyuru yok" yaz ve baktığın
  adresi ver. Özellikle Eylül-Kasım 2026 arasında çıkan güncellemeleri belirt.
  Sayfalar arası çelişki varsa ikisini de yaz, yorum ekleme.

CHROME: yok
ONAY GEREKEBİLECEK ADIMLAR: yok. Yalnızca sonucun bridge-local dalına
gönderilmesi var, o da önceden onaylı.
