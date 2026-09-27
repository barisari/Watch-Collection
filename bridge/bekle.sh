#!/bin/bash
# Bulut oturumunun sonuç bekleyicisi.
# Kullanım (Bash aracında run_in_background ile):
#   bridge/bekle.sh <sonuç-dosyası> [azami-saniye] [degisim]
#   örnek: bridge/bekle.sh 2026-09-27-hizli-1.md 960
# "degisim": dosya zaten varsa (ara sonuç, örneğin "onay bekleniyor")
# yeni gelişini değil, İÇERİĞİNİN DEĞİŞMESİNİ bekler.
#
# bridge-local dalını 30 sn'de bir ls-remote ile yoklar; bu, yerel depoya
# hiçbir şey yazmaz. Dal ilerleyince bir kez fetch edip sonuç dosyasına
# bakar. Dosya gelince ya da süre dolunca tek satır yazıp çıkar; çıkış
# oturumu bir kez uyandırır. Beklerken model turu yok, token harcanmaz.
ad="$1"; azami="${2:-960}"; mod="$3"; t0=$(date +%s)
[ -n "$ad" ] || { echo "kullanım: bridge/bekle.sh <sonuç-dosyası> [azami-saniye] [degisim]"; exit 2; }
cd "$(dirname "$0")/.." || exit 1

blob() { git rev-parse -q --verify "origin/bridge-local:bridge/results/$ad" 2>/dev/null; }
ilk=""
if [ "$mod" = "degisim" ]; then git fetch -q origin bridge-local 2>/dev/null; ilk=$(blob); fi
# Dosya var ve ilk hâlinden farklıysa (varsayılan kipte ilk hâl "yok") geldi sayılır.
kontrol() {
  local b
  git fetch -q origin bridge-local 2>/dev/null && b=$(blob) && [ "$b" != "$ilk" ]
}

if kontrol; then echo "GELDİ (zaten vardı) $ad — $(date -u +%H:%M:%S) UTC"; exit 0; fi
son=$(git rev-parse origin/bridge-local 2>/dev/null)
while :; do
  sleep 30
  simdi=$(git ls-remote origin refs/heads/bridge-local 2>/dev/null | cut -f1)
  if [ -n "$simdi" ] && [ "$simdi" != "$son" ]; then
    if kontrol; then
      echo "GELDİ $ad — $(date -u +%H:%M:%S) UTC, $(( $(date +%s) - t0 )) sn sonra"; exit 0
    fi
    # Fetch başarılıysa tabanı ilerlet; başarısızsa bir sonraki turda yeniden dener.
    [ "$(git rev-parse origin/bridge-local 2>/dev/null)" = "$simdi" ] && son="$simdi"
  fi
  if (( $(date +%s) - t0 >= azami )); then
    echo "ZAMAN AŞIMI $ad — $(date -u +%H:%M:%S) UTC"; exit 0
  fi
done
