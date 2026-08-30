/* ---------------------------------------------------------------------------
   Terim sözlüğü.

   Teknik değerler envanterde üreticinin yazdığı haliyle (İngilizce) durur;
   ekranda buradan çevrilir. Böylece:
     · veri kaynağa sadık kalır, "Casio ne diyorsa o" denetlenebilir olur,
     · yeni bir dil eklemek bu dosyaya sütun eklemek olur, 24 kaydı yeniden
       doldurmak değil.

   Sözlükte karşılığı olmayan değer olduğu gibi gösterilir — yani eksik çeviri
   veriyi kaybettirmez, sadece İngilizce görünür.
--------------------------------------------------------------------------- */

const TR = {
  // --- malzemeler ---
  'Stainless steel': 'Paslanmaz çelik',
  'Stainless Steel': 'Paslanmaz çelik',
  'Resin': 'Reçine',
  'Carbon / Resin': 'Karbon / reçine',
  'Bio-based resin': 'Biyo-bazlı reçine',
  'Urethane': 'Üretan',
  'Titanium': 'Titanyum',
  'Leather': 'Deri',
  'Cloth': 'Kumaş',
  'Chrome plated': 'Krom kaplama',

  // --- renkler (Casio'nun resmi ürün görsellerinden okundu) ---
  'Silver': 'Gümüş',
  'Black': 'Siyah',
  'White': 'Beyaz',
  'Off-white': 'Kırık beyaz',
  'Green': 'Yeşil',
  'Grey': 'Gri',
  'Navy blue': 'Lacivert',
  'Blue': 'Mavi',
  'Ice blue': 'Buz mavisi',
  'Beige': 'Bej',
  'Khaki': 'Haki',
  'Bronze': 'Bronz',
  'Burgundy': 'Bordo',
  'Grey LCD': 'Gri LCD',
  'Green LCD': 'Yeşil LCD',
  'Silver / rose gold': 'Gümüş / rose gold',
  'Black (Pac-Man graphic)': 'Siyah (Pac-Man baskılı)',

  // --- cam ---
  'Mineral Glass': 'Mineral cam',
  'Mineral glass': 'Mineral cam',
  'Sapphire': 'Safir',
  'Sapphire crystal': 'Safir cam',
  'Resin Glass': 'Reçine cam',
  'Inorganic glass': 'İnorganik cam',
  'Anti-reflective': 'Yansıma önleyici kaplama',
  'Flat': 'Düz',
  'Curved': 'Kavisli',

  // --- mekanizma tipi ---
  'quartz': 'Kuvars',
  'solar': 'Solar (ışıkla şarj)',
  'automatic': 'Otomatik',
  'manual': 'Manuel kurmalı',
  'spring-drive': 'Spring Drive',

  // --- gösterim ---
  'digital': 'Dijital',
  'analog': 'Analog',
  'ana-digi': 'Ana-dijital',

  // --- kayış / toka ---
  'Bracelet': 'Bilezik',
  'Band': 'Kayış',
  'Resin Band': 'Reçine kayış',
  'Three-fold clasp': 'Üç katlı klips',
  'One-touch three-fold clasp': 'Tek dokunuşla açılan üç katlı klips',
  'Buckle': 'Pimli toka',

  // --- su geçirmezlik (Casio'nun sayısız ifadeleri) ---
  'Water Resistant': 'Suya dayanıklı (günlük kullanım)',
  'Not water resistant': 'Suya dayanıklı değil',

  // --- fonksiyonlar ---
  'World time': 'Dünya saati',
  'Stopwatch': 'Kronometre',
  'Depth meter': 'Derinlik ölçer',
  'Max depth memory': 'Azami derinlik hafızası',
  'Data recall': 'Veri geri çağırma',
  'Countdown timer': 'Geri sayım sayacı',
  'Daily alarm': 'Günlük alarm',
  'Hourly time signal': 'Saat başı sinyali',
  'Auto calendar': 'Otomatik takvim',
  'Full auto-calendar': 'Tam otomatik takvim',
  'Chronograph': 'Kronograf',
  'Date display': 'Tarih göstergesi',
  'Day display': 'Gün göstergesi',
  'Battery level indicator': 'Pil seviye göstergesi',
  'Mute function': 'Sesi kapatma',
  'Power saving': 'Güç tasarrufu',
  'Shock resistant': 'Darbeye dayanıklı',
  'Hand shift feature': 'Akrep-yelkovan kaydırma',
  'LED backlight': 'LED arka aydınlatma',
  'Double LED light': 'Çift LED aydınlatma',
  'Super Illuminator': 'Super Illuminator',
  'Bluetooth smartphone link': 'Bluetooth telefon bağlantısı',
  'Radio-controlled': 'Radyo sinyaliyle otomatik ayar',
};

/** Bilinen bir terimse Türkçesini, değilse olduğu gibi döndürür. */
export const term = (value) => (value == null ? value : (TR[value] ?? value));

/** Virgülle ayrılmış bir listeyi terim terim çevirir. */
export const termList = (values) =>
  (values || []).map((v) => term(v)).join(', ');

/**
 * Su geçirmezlik: sayıysa "200 m", Casio'nun metinsel ifadesiyse çevirisi.
 * Casio bazı modellerde sayı vermeden "Water Resistant" diyor — bu, günlük
 * kullanım (yaklaşık 3 bar) anlamına gelir ama sayıya çevirmiyoruz:
 * üreticinin demediği bir rakamı envantere yazmak yanlış olur.
 */
export const waterResistance = (value) =>
  value == null ? null : (typeof value === 'number' ? `${value} m` : term(value));
