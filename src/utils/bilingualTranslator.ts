// Dictionary and helper functions for STAM Al-Dirasat Al-Islamiah Bilingual Options

// Common STAM vocabulary translations
export const STAM_DICTIONARY: Record<string, string> = {
  // Firaq / Aliran
  'الخوارج': 'Khawarij',
  'الشيعة': 'Syi\'ah',
  'المعتزلة': 'Mu\'tazilah',
  'المرجئة': 'Murji\'ah',
  'الأشاعرة': 'Asy\'ariyyah',
  'الماتريدية': 'Maturidiyyah',
  'أهل السنة والجماعة': 'Ahli Sunnah wal Jamaah',
  'الجبرية': 'Jabariyyah',
  'القدرية': 'Qadariyyah',
  'الإسماعيلية': 'Isma\'iliyyah',
  'الإمامية': 'Imamiyyah',
  'الزيدية': 'Zaidiyyah',
  'الإباضية': 'Ibadhiyyah',
  'الأزارقة': 'Azaariqah',
  'النجدات': 'Najadat',
  'الصفرية': 'Sufriyyah',

  // Mantiq
  'موجبة': 'Mujabah (Afirmatif/Positif)',
  'سالبة': 'Salibah (Negatif)',
  'كلية': 'Kulliyyah (Universal)',
  'جزئية': 'Juz\'iyyah (Partikular)',
  'مهملة': 'Muhmalah (Diabaikan kuantiti)',
  'شخصية': 'Syakhsiyyah (Individu)',
  'مخصوصة': 'Makhsusah (Khusus)',
  'حملية': 'Hamliyyah (Kategorikal)',
  'شرطية': 'Syartiyyah (Kondisional)',
  'متصلة': 'Muttasilah (Hipotetikal)',
  'منفصلة': 'Munfasilah (Disjungtif)',
  'لزومية': 'Luzumiyyah (Kemestian logik)',
  'اتفاقية': 'Ittifaqiyyah (Kebetulan)',
  'مانعة الجمع': 'Mani\'ah al-Jam\'i (Menghalang berhimpun)',
  'مانعة الخلو': 'Mani\'ah al-Khuluw (Menghalang kosong)',
  'مانعة الجمع والخلو': 'Mani\'ah al-Jam\'i wal-Khuluw',
  'الموضوع': 'Al-Maudhu\' (Subjek)',
  'المحمول': 'Al-Mahmul (Predikat)',
  'الرابطة': 'Al-Rabithah (Kopula)',
  'السور': 'Al-Sur (Kuantifier)',
  'المقدم': 'Al-Muqaddam (Anteseden)',
  'التالي': 'Al-Tali (Konsekuen)',
  'القياس': 'Al-Qiyas (Silogisme)',
  'التناقض': 'Al-Tanaqudh (Kontradiksi)',
  'العكس': 'Al-\'Aks (Konversi)',
  'عكس مستو': 'Al-\'Aks al-Mustawi',
  'الحد الأصغر': 'Had Asghar (Terma Minor)',
  'الحد الأكبر': 'Had Akbar (Terma Major)',
  'الحد الأوسط': 'Had Ausat (Terma Tengah)',
  'مقدمة صغرى': 'Muqaddimah Sughra (Premis Minor)',
  'مقدمة كبرى': 'Muqaddimah Kubra (Premis Major)',
  'النتيجة': 'Natijah (Kesimpulan)',
  'الشكل الأول': 'Bentuk Pertama (Al-Syakl al-Awwal)',
  'الشكل الثاني': 'Bentuk Kedua',
  'الشكل الثالث': 'Bentuk Ketiga',
  'الشكل الرابع': 'Bentuk Keempat',

  // Tauhid / Sam'iyyat
  'السمعيات': 'Al-Sam\'iyyat (Perkara yang didengar dari wahyu)',
  'الغيبيات': 'Al-Ghaibiyyat (Perkara-perkara ghaib)',
  'الملائكة': 'Para Malaikat',
  'الجن': 'Jin',
  'الشيطان': 'Syaitan',
  'إبليس': 'Iblis',
  'الموت': 'Kematian',
  'أجل': 'Ajal',
  'الروح': 'Roh',
  'عذاب القبر': 'Azab Kubur',
  'نعيم القبر': 'Nikmat Kubur',
  'سؤال منكر ونكير': 'Soalan Munkar dan Nakir',
  'البعث': 'Al-Ba\'th (Kebangkitan semula)',
  'النشور': 'Al-Nusyur (Penyebaran makhluk)',
  'الحشر': 'Al-Hasyr (Perhimpunan di Mahsyar)',
  'الحساب': 'Al-Hisab (Perhitungan amalan)',
  'الميزان': 'Al-Mizan (Timbangan amalan)',
  'الصراط': 'Al-Sirat (Titian Sirat)',
  'الحوض': 'Al-Haudh (Kolam Nabi)',
  'الشفاعة': 'Al-Syafa\'ah (Syafaat)',
  'الشفاعة العظمى': 'Al-Syafa\'ah al-\'Uzma (Syafaat Agung)',
  'الجنة': 'Al-Jannah (Syurga)',
  'النار': 'Al-Nar (Neraka)',
  'رؤية الله': 'Ru\'yatullah (Melihat Allah)',
  'الأعراف': 'Al-A\'raf (Tempat tinggi antara Syurga dan Neraka)',
  'التوبة': 'Taubat',
  'الحسنات': 'Al-Hasanat (Kebaikan)',
  'السيئات': 'Al-Sayyi\'at (Keburukan/Dosa)',
  'مرتكب الكبيرة': 'Pelaku dosa besar',
  'فاسق': 'Fasiq',
  'كافر': 'Kafir',
  'مؤمن': 'Mukmin',

  // Common Numbers & Selectors
  '١ و ٢': '1 dan 2',
  '٢ و ٣': '2 dan 3',
  '٣ و ٤': '3 dan 4',
  '١ و ٤': '1 dan 4',
  '١ و ٣': '1 dan 3',
  '٢ و ٤': '2 dan 4',
};

/**
 * Attempts to automatically suggest or translate an Arabic option string to Malay
 */
export function autoTranslateArabicOption(textArabic: string): string {
  if (!textArabic || !textArabic.trim()) return '';
  const trimmed = textArabic.trim();

  // 1. Exact match in dictionary
  if (STAM_DICTIONARY[trimmed]) {
    return STAM_DICTIONARY[trimmed];
  }

  // 2. Numbers combinations (e.g. ١ و ٢)
  const normalizedNumbers = trimmed
    .replace(/١/g, '1')
    .replace(/٢/g, '2')
    .replace(/٣/g, '3')
    .replace(/٤/g, '4')
    .replace(/\s*و\s*/g, ' dan ');
  if (/^[1-4](\s+dan\s+[1-4])+$/.test(normalizedNumbers)) {
    return normalizedNumbers;
  }

  // 3. Substring replacement for common key phrases
  for (const [ar, my] of Object.entries(STAM_DICTIONARY)) {
    if (trimmed === ar) return my;
  }

  return '';
}
