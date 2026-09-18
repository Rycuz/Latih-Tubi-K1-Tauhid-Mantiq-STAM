// Dictionary and helper functions for STAM Al-Dirasat Al-Islamiah Bilingual Options & Questions
import { FIRAQ_QUESTIONS_PART1 } from '../data/questions/firaqPart1';
import { TAUHID_QUESTIONS_PART1 } from '../data/questions/tauhidPart1';
import { TAUHID_QUESTIONS_PART2 } from '../data/questions/tauhidPart2';
import { MANTIQ_QUESTIONS_PART1 } from '../data/questions/mantiqPart1';

/**
 * Normalizes Arabic text for flexible matching:
 * - Removes diacritics / tashkeel (fathah, kasrah, dammah, tanween, sukun, shaddah, etc.)
 * - Unifies alef forms (أ, إ, آ, ٱ -> ا)
 * - Normalizes hamza forms (ؤ -> و, ئ -> ي)
 * - Normalizes ta marbuta (ة -> ه)
 * - Normalizes alif maqsura (ى -> ي)
 * - Removes tatweel (ـ)
 * - Normalizes punctuation and collapses whitespace
 */
export function normalizeArabicText(text: string): string {
  if (!text) return '';
  return text
    // Remove diacritics / tashkeel / Quranic signs
    .replace(/[\u0617-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    // Unify Alefs
    .replace(/[أإآٱ]/g, 'ا')
    // Unify Hamza on Waw / Ya
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Unify Ta Marbuta
    .replace(/ة/g, 'ه')
    // Unify Alif Maqsura
    .replace(/ى/g, 'ي')
    // Remove Tatweel / Kashida
    .replace(/ـ/g, '')
    // Remove punctuation & brackets
    .replace(/[﴿﴾«»""''()\[\]{}،,:;؟?!\.\-]/g, ' ')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

// Expanded STAM vocabulary translations (Tauhid, Firaq, Mantiq, Usuluddin, Akhlak)
export const STAM_DICTIONARY: Record<string, string> = {
  // Firaq / Aliran
  'الخوارج': 'Khawarij',
  'الشيعة': 'Syi\'ah',
  'المعتزلة': 'Mu\'tazilah',
  'المرجئة': 'Murji\'ah',
  'الأشاعرة': 'Asy\'ariyyah',
  'الماتريدية': 'Maturidiyyah',
  'أهل السنة والجماعة': 'Ahli Sunnah wal Jamaah',
  'أهل السنة': 'Ahli Sunnah',
  'الجبرية': 'Jabariyyah',
  'القدرية': 'Qadariyyah',
  'الإسماعيلية': 'Isma\'iliyyah',
  'الإمامية': 'Imamiyyah',
  'الزيدية': 'Zaidiyyah',
  'الإباضية': 'Ibadhiyyah',
  'الأزارقة': 'Azaariqah',
  'النجدات': 'Najadat',
  'الصفرية': 'Sufriyyah',
  'البهائية': 'Baha\'iyyah',
  'القاديانية': 'Qadianiyyah',
  'الباطنية': 'Batiniyyah',

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
  'عكس النقيض': 'Al-\'Aks al-Naqidh',
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
  'التصور': 'Al-Tasawwur (Konsepsi)',
  'التصديق': 'Al-Tasdiq (Asersi)',
  'الدلالة': 'Al-Dilalah (Penunjukan)',
  'دلالة لفظية': 'Dilalah Lafziyyah',
  'دلالة غير لفظية': 'Dilalah Ghair Lafziyyah',
  'دلالة وضعية': 'Dilalah Wadh\'iyyah',
  'دلالة طبعية': 'Dilalah Tab\'iyyah',
  'دلالة عقلية': 'Dilalah \'Aqliyyah',
  'المعرف': 'Al-Mu\'arrif (Definisi)',
  'البرهان': 'Al-Burhan (Hujah Demonstratif)',
  'الجدل': 'Al-Jadal (Dialektika)',
  'الخطابة': 'Al-Khitabah (Retorik)',
  'الشعر': 'Al-Syi\'ir (Puisi)',
  'السفسطة': 'Al-Safsatah (Safsafah)',

  // Tauhid / Sam'iyyat / Ilahiyyat
  'السمعيات': 'Al-Sam\'iyyat (Perkara yang didengar dari wahyu)',
  'الغيبيات': 'Al-Ghaibiyyat (Perkara-perkara ghaib)',
  'الملائكة': 'Para Malaikat',
  'الملائكة الحفظة': 'Al-Hafazah (Malaikat Penjaga)',
  'الملائكة الكتبة': 'Al-Katabah (Malaikat Pencatat)',
  'الحفظة': 'Al-Hafazah (Malaikat Penjaga)',
  'الكتبة': 'Al-Katabah (Malaikat Pencatat)',
  'منكر ونكير': 'Munkar dan Nakir',
  'ملك الموت': 'Malaikat Maut',
  'إسرافيل': 'Israfil',
  'جبريل': 'Jibril',
  'ميكائيل': 'Mikail',
  'رضوان': 'Ridwan',
  'مالك': 'Malik',
  'الجن': 'Jin',
  'الشيطان': 'Syaitan',
  'الشياطين': 'Syaitan-syaitan',
  'إبليس': 'Iblis',
  'الموت': 'Kematian',
  'أجل': 'Ajal',
  'الروح': 'Roh',
  'عذاب القبر': 'Azab Kubur',
  'نعيم القber': 'Nikmat Kubur',
  'نعيم القبر': 'Nikmat Kubur',
  'سؤال منكر ونكير': 'Soalan Munkar dan Nakir',
  'سؤال القبر': 'Soalan Kubur',
  'فتنة القبر': 'Fitnah Kubur',
  'البرزخ': 'Alam Barzakh',
  'البعث': 'Al-Ba\'th (Kebangkitan semula)',
  'النشور': 'Al-Nusyur (Penyebaran makhluk)',
  'الحشر': 'Al-Hasyr (Perhimpunan di Mahsyar)',
  'المحشر': 'Padang Mahsyar',
  'الموقف': 'Al-Mauqif (Tempat perhimpunan)',
  'الحساب': 'Al-Hisab (Perhitungan amalan)',
  'الميزan': 'Al-Mizan (Timbangan amalan)',
  'الميزان': 'Al-Mizan (Timbangan amalan)',
  'الصحف': 'Al-Suhuf (Buku Catatan Amalan)',
  'صحائف الأعمال': 'Buku-buku catatan amalan',
  'الصراط': 'Al-Sirat (Titian Sirat)',
  'الحوض': 'Al-Haudh (Kolam Nabi)',
  'الكوثر': 'Al-Kauthar',
  'الشفاعة': 'Al-Syafa\'ah (Syafaat)',
  'الشفاعة العظمى': 'Al-Syafa\'ah al-\'Uzma (Syafaat Agung)',
  'الجنة': 'Al-Jannah (Syurga)',
  'النار': 'Al-Nar (Neraka)',
  'جهنم': 'Jahannam',
  'الحطمة': 'Al-Hutamah',
  'الهاوية': 'Al-Hawiyah',
  'سقر': 'Saqar',
  'لظى': 'Laza',
  'الجحيم': 'Al-Jahim',
  'السعير': 'Al-Sa\'ir',
  'العرش': 'Al-\'Arasy',
  'حملة العرش': 'Malaikat Pemikul \'Arasy',
  'الكرسي': 'Al-Kursi',
  'القلم': 'Al-Qalam (Pena Takdir)',
  'اللوح المحفوظ': 'Al-Lauh al-Mahfuz',
  'رؤية الله': 'Ru\'yatullah (Melihat Allah)',
  'الأعراف': 'Al-A\'raf (Tempat tinggi antara Syurga dan Neraka)',
  'التوبة': 'Taubat',
  'شروط التوبة': 'Syarat-syarat taubat',
  'الحسنات': 'Al-Hasanat (Kebaikan/Pahala)',
  'السيئات': 'Al-Sayyi\'at (Keburukan/Dosa)',
  'مرتكب الكبيرة': 'Pelaku dosa besar',
  'الكبيرة': 'Dosa besar',
  'الصغيرة': 'Dosa kecil',
  'فاسق': 'Fasiq',
  'كافر': 'Kafir',
  'مؤمن': 'Mukmin',
  'منافق': 'Munafik',
  'الإمامة': 'Al-Imamah (Kepimpinan Khilafah)',
  'الخليفة': 'Khalifah / Pemimpin',
  'الكليات الخمس': 'Al-Kulliyyat Al-Khams (Lima Maqasid Asas)',
  'حفظ الدين': 'Memelihara Agama',
  'حفظ النفس': 'Memelihara Nyawa',
  'حفظ العقل': 'Memelihara Akal',
  'حفظ النسل': 'Memelihara Keturunan',
  'حفظ المال': 'Memelihara Harta',

  // Rulings / Hukum Syarak & Akal
  'واجب': 'Wajib',
  'واجب عقلا': 'Wajib menurut akal',
  'واجب شرعا': 'Wajib menurut syarak',
  'جائز': 'Harus (Ja\'iz)',
  'جائز عقلا': 'Harus menurut akal',
  'جائز شرعا': 'Harus menurut syarak',
  'مستحيل': 'Mustahil',
  'مستحيل عقلا': 'Mustahil menurut akal',
  'مستحيل شرعا': 'Mustahil menurut syarak',
  'حرام': 'Haram',
  'مكروه': 'Makruh',
  'سنة': 'Sunat',
  'مباح': 'Mubah / Harus',
  'صحيح': 'Sah / Benar',
  'باطل': 'Batal / Salah',
  'كفر': 'Kufur',
  'إيمان': 'Iman',
  'فسق': 'Fasiq',
  'بدعة': 'Bid\'ah',
  'فرض عين': 'Fardu Ain',
  'فرض كفاية': 'Fardu Kifayah',

  // Common Question / Option Selectors
  '١ و ٢': '1 dan 2',
  '٢ و ٣': '2 dan 3',
  '٣ و ٤': '3 dan 4',
  '١ و ٤': '1 dan 4',
  '١ و ٣': '1 dan 3',
  '٢ و ٤': '2 dan 4',
  '١ و ٢ و ٣': '1, 2 dan 3',
  '٢ و ٣ و ٤': '2, 3 dan 4',
  '١ و ٣ و ٤': '1, 3 dan 4',
  '١ و ٢ و ٤': '1, 2 dan 4',
  'جميع ما سبق': 'Semua di atas',
  'كل ما سبق': 'Semua di atas',
  'جميع ما ذكر': 'Semua yang dinyatakan',
  'لا شيء مما سبق': 'Tiada satu pun di atas',
  'القول الأول': 'Pendapat Pertama',
  'القول الثاني': 'Pendapat Kedua',
  'الأول والثاني': 'Pertama dan kedua',
  'الأول فقط': 'Pertama sahaja',
  'الثاني فقط': 'Kedua sahaja',
  'كلاهما صحيح': 'Kedua-duanya benar',
  'كلاهما خطأ': 'Kedua-duanya salah',
};

// Build normalized dictionary for fast normalized lookups
const NORMALIZED_DICTIONARY = new Map<string, string>();
for (const [ar, my] of Object.entries(STAM_DICTIONARY)) {
  NORMALIZED_DICTIONARY.set(normalizeArabicText(ar), my);
}

// Build question options cache from existing questions database
const QUESTIONS_OPTIONS_CACHE = new Map<string, string>();
const NORMALIZED_OPTIONS_CACHE = new Map<string, string>();

const QUESTIONS_STEM_CACHE = new Map<string, string>();
const NORMALIZED_STEM_CACHE = new Map<string, string>();

function initCaches() {
  const allQuestions = [
    ...FIRAQ_QUESTIONS_PART1,
    ...TAUHID_QUESTIONS_PART1,
    ...TAUHID_QUESTIONS_PART2,
    ...MANTIQ_QUESTIONS_PART1,
  ];

  for (const q of allQuestions) {
    if (q.questionArabic && q.questionMalay) {
      const qAr = q.questionArabic.trim();
      const qMy = q.questionMalay.trim();
      QUESTIONS_STEM_CACHE.set(qAr, qMy);
      NORMALIZED_STEM_CACHE.set(normalizeArabicText(qAr), qMy);
    }

    if (q.options) {
      for (const opt of q.options) {
        if (opt.textArabic && opt.textMalay) {
          const ar = opt.textArabic.trim();
          const my = opt.textMalay.trim();
          QUESTIONS_OPTIONS_CACHE.set(ar, my);
          NORMALIZED_OPTIONS_CACHE.set(normalizeArabicText(ar), my);
        }
      }
    }
  }
}

// Initialize once
initCaches();

/**
 * Attempts to automatically suggest or translate an Arabic option string to Malay
 */
export function autoTranslateArabicOption(textArabic: string): string {
  if (!textArabic || !textArabic.trim()) return '';
  const trimmed = textArabic.trim();

  // 1. Exact match in standard STAM glossary
  if (STAM_DICTIONARY[trimmed]) {
    return STAM_DICTIONARY[trimmed];
  }

  // 2. Exact match in existing question bank options
  if (QUESTIONS_OPTIONS_CACHE.has(trimmed)) {
    return QUESTIONS_OPTIONS_CACHE.get(trimmed)!;
  }

  // 3. Numbers combinations (e.g. ١ و ٢, 1 dan 2, ١ ، ٢ و ٣)
  const normalizedNumbers = trimmed
    .replace(/[١1]/g, '1')
    .replace(/[٢2]/g, '2')
    .replace(/[٣3]/g, '3')
    .replace(/[٤4]/g, '4')
    .replace(/،/g, ',')
    .replace(/\s*و\s*/g, ' dan ')
    .replace(/\s*,\s*/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();

  if (/^[1-4](\s*(,|dan)\s*[1-4])+$/.test(normalizedNumbers)) {
    // Format nicely: "1, 2 dan 3"
    const digits = normalizedNumbers.match(/[1-4]/g);
    if (digits && digits.length > 0) {
      if (digits.length === 1) return digits[0];
      if (digits.length === 2) return `${digits[0]} dan ${digits[1]}`;
      const last = digits[digits.length - 1];
      const rest = digits.slice(0, -1).join(', ');
      return `${rest} dan ${last}`;
    }
  }

  // 4. Normalized match in standard STAM glossary
  const normalized = normalizeArabicText(trimmed);
  if (NORMALIZED_DICTIONARY.has(normalized)) {
    return NORMALIZED_DICTIONARY.get(normalized)!;
  }

  // 5. Normalized match in existing question bank options
  if (NORMALIZED_OPTIONS_CACHE.has(normalized)) {
    return NORMALIZED_OPTIONS_CACHE.get(normalized)!;
  }

  // 6. Quranic citation pattern: ﴿ ... ﴾
  if (trimmed.startsWith('﴿') || trimmed.includes('﴿')) {
    return `Firman Allah Taala: (${trimmed})`;
  }

  // 7. Compound pattern matching (e.g. حكم ... عقلا / شرعا)
  if (normalized.startsWith('حكم ') && (normalized.endsWith(' عقلا') || normalized.endsWith(' شرعا'))) {
    const isAqlan = normalized.endsWith(' عقلا');
    const core = normalized.replace(/^حكم\s+/, '').replace(/\s+(عقلا|شرعا)$/, '');
    const coreMalay = NORMALIZED_DICTIONARY.get(core) || core;
    return `Hukum ${coreMalay} menurut ${isAqlan ? 'akal' : 'syarak'}`;
  }

  // 8. Partial sub-phrase matching from glossary
  for (const [ar, my] of Object.entries(STAM_DICTIONARY)) {
    if (trimmed.toLowerCase() === ar.toLowerCase()) return my;
  }

  return '';
}

/**
 * Attempts to automatically suggest or translate an Arabic Question Stem to Malay
 */
export function autoTranslateArabicQuestion(questionArabic: string): string {
  if (!questionArabic || !questionArabic.trim()) return '';
  const trimmed = questionArabic.trim();

  // 1. Exact match in questions database
  if (QUESTIONS_STEM_CACHE.has(trimmed)) {
    return QUESTIONS_STEM_CACHE.get(trimmed)!;
  }

  // 2. Normalized match in questions database
  const normalized = normalizeArabicText(trimmed);
  if (NORMALIZED_STEM_CACHE.has(normalized)) {
    return NORMALIZED_STEM_CACHE.get(normalized)!;
  }

  // 3. Question starter template patterns
  const patterns: Array<{ regex: RegExp; template: (term: string) => string }> = [
    {
      regex: /^ما حكم\s+(.+)$/,
      template: (term) => `Apakah hukum ${autoTranslateArabicOption(term) || term}?`,
    },
    {
      regex: /^ما تعريف\s+(.+)$/,
      template: (term) => `Apakah takrif ${autoTranslateArabicOption(term) || term}?`,
    },
    {
      regex: /^ما المراد بـ?\s*(.+)$/,
      template: (term) => `Apakah yang dimaksudkan dengan ${autoTranslateArabicOption(term) || term}?`,
    },
    {
      regex: /^ما معنى\s+(.+)$/,
      template: (term) => `Apakah makna ${autoTranslateArabicOption(term) || term}?`,
    },
    {
      regex: /^من هو مؤسس\s+(.+)$/,
      template: (term) => `Siapakah pengasas bagi ${autoTranslateArabicOption(term) || term}?`,
    },
    {
      regex: /^من هم\s+(.+)$/,
      template: (term) => `Siapakah golongan ${autoTranslateArabicOption(term) || term}?`,
    },
    {
      regex: /^اختر العبارة الصحيحة\s*(.*)$/,
      template: () => 'Pilih pernyataan yang betul:',
    },
    {
      regex: /^أي مما يأتي\s*(.*)$/,
      template: () => 'Antara berikut, yang manakah benar?',
    },
    {
      regex: /^ما هي شروط\s+(.+)$/,
      template: (term) => `Apakah syarat-syarat bagi ${autoTranslateArabicOption(term) || term}?`,
    },
  ];

  for (const p of patterns) {
    const match = normalized.match(p.regex);
    if (match) {
      return p.template(match[1] || '');
    }
  }

  return '';
}
