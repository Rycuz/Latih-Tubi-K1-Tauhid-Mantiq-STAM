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
  // Common Questions & Examination Directives
  'في ضوء عقيدة أهل السنة والجماعة': 'menurut akidah Ahli Sunnah wal Jamaah',
  'في ضوء عقيدة اهل السنة والجماعة': 'menurut akidah Ahli Sunnah wal Jamaah',
  'في ضوء عقيدة': 'menurut pegangan akidah',
  'أهل السنة والجماعة': 'Ahli Sunnah wal Jamaah',
  'اهل السنة والجماعة': 'Ahli Sunnah wal Jamaah',
  'أهل السنة': 'Ahli Sunnah',
  'اهل السنة': 'Ahli Sunnah',
  'مع ذكر الدليل': 'berserta dalil',
  'مع الدليل': 'berserta dalil',
  'مع ذكر المثال': 'berserta contoh',
  'مع التمثيل': 'berserta contoh',
  'مع التوضيح': 'berserta penjelasan',
  'مع التعليل': 'berserta hujah/sebab',
  'بين الحكم': 'terangkan hukumnya',
  'ما حكم': 'apakah hukum',
  'ما تعريف': 'apakah takrif',
  'ما معنى': 'apakah maksud',
  'ما المراد بـ': 'apakah yang dimaksudkan dengan',
  'ما المراد': 'apakah yang dimaksudkan',
  'من هو مؤسس': 'siapakah pengasas',
  'من هم': 'siapakah golongan',
  'أصل مذهبهم': 'asas pegangan mazhab mereka',
  'أصول مذهبهم': 'prinsip-prinsip pegangan mazhab mereka',
  'اختر الإجابة الصحيحة': 'pilih jawapan yang betul',
  'اختر العبارة الصحيحة': 'pilih pernyataan yang betul',
  'أي مما يأتي يعد من': 'antara berikut, yang manakah merupakan bahagian bagi',
  'أي مما يأتي هو': 'antara berikut, yang manakah merupakan',
  'أي مما يأتي': 'antara berikut, yang manakah',
  'أي من الآتي': 'antara berikut, yang manakah',
  'ما هي شروط': 'apakah syarat-syarat bagi',
  'ما هي أركان': 'apakah rukun-rukun bagi',
  'ما هي أقسام': 'apakah bahagian-bahagian bagi',
  'ما هي أنواع': 'apakah jenis-jenis bagi',
  'ما هي أسباب': 'apakah sebab-sebab bagi',
  'ما هي علامات': 'apakah tanda-tanda bagi',

  // Firaq / Aliran
  'فرقة المعتزلة': 'golongan Mu\'tazilah',
  'فرقة الخوارج': 'golongan Khawarij',
  'فرقة الشيعة': 'golongan Syi\'ah',
  'فرقة المرجئة': 'golongan Murji\'ah',
  'فرقة الجهمية': 'golongan Jahmiyyah',
  'فرقة الجبرية': 'golongan Jabariyyah',
  'فرقة القدرية': 'golongan Qadariyyah',
  'المعتزلة': 'Mu\'tazilah',
  'الخوارج': 'Khawarij',
  'الشيعة': 'Syi\'ah',
  'المرجئة': 'Murji\'ah',
  'الأشاعرة': 'Asy\'ariyyah',
  'الاشاعرة': 'Asy\'ariyyah',
  'الماتريدية': 'Maturidiyyah',
  'الجهمية': 'Jahmiyyah',
  'الجبرية': 'Jabariyyah',
  'القدرية': 'Qadariyyah',
  'الإسماعيلية': 'Isma\'iliyyah',
  'الاسماعيلية': 'Isma\'iliyyah',
  'الإمامية': 'Imamiyyah',
  'الامامية': 'Imamiyyah',
  'الزيدية': 'Zaidiyyah',
  'الإباضية': 'Ibadhiyyah',
  'الاباضية': 'Ibadhiyyah',
  'الأزارقة': 'Azaariqah',
  'الازارقة': 'Azaariqah',
  'النجدات': 'Najadat',
  'الصفرية': 'Sufriyyah',
  'البهائية': 'Baha\'iyyah',
  'القاديانية': 'Qadianiyyah',
  'الباطنية': 'Batiniyyah',

  // Mantiq - Logic & Syllogism
  'القياس الاقتراني الحملي': 'Al-Qiyas Al-Iqtirani Hamli',
  'القياس الاقتراني الشرطي': 'Al-Qiyas Al-Iqtirani Syarti',
  'القياس الاقتراني': 'Al-Qiyas Al-Iqtirani (Silogisme Kategorikal)',
  'القياس الاستثنائي': 'Al-Qiyas Al-Istitsna\'i (Silogisme Hipotetikal)',
  'القياس المنطقي': 'Silogisme Logik',
  'القياس': 'Al-Qiyas (Silogisme)',
  'القضية الحملية': 'Qadhiah Hamliah (Proposisi Kategorikal)',
  'القضية الشرطية المتصلة': 'Qadhiah Syartiah Muttasilah',
  'القضية الشرطية المنفصلة': 'Qadhiah Syartiah Munfasilah',
  'القضية الشرطية': 'Qadhiah Syartiah (Proposisi Kondisional)',
  'القضية': 'Al-Qadhiyyah (Proposisi)',
  'مانعة الجمع والخلو': 'Mani\'ah al-Jam\'i wal-Khuluw',
  'مانعة الجمع': 'Mani\'ah al-Jam\'i (Menghalang berhimpun)',
  'مانعة الخلو': 'Mani\'ah al-Khuluw (Menghalang kosong)',
  'الموضوع': 'Al-Maudhu\' (Subjek)',
  'المحمول': 'Al-Mahmul (Predikat)',
  'الرابطة': 'Al-Rabithah (Kopula)',
  'السور': 'Al-Sur (Kuantifier)',
  'المقدم': 'Al-Muqaddam (Anteseden)',
  'التالي': 'Al-Tali (Konsekuen)',
  'التناقض': 'Al-Tanaqudh (Kontradiksi)',
  'العكس المستوي': 'Al-\'Aks al-Mustawi (Konversi Sederhana)',
  'العكس': 'Al-\'Aks (Konversi)',
  'عكس مستو': 'Al-\'Aks al-Mustawi',
  'عكس النقيض': 'Al-\'Aks al-Naqidh',
  'الحد الأصغر': 'Had Asghar (Terma Minor)',
  'الحد الاصغر': 'Had Asghar (Terma Minor)',
  'الحد الأكبر': 'Had Akbar (Terma Major)',
  'الحد الاكبر': 'Had Akbar (Terma Major)',
  'الحد الأوسط': 'Had Ausat (Terma Tengah)',
  'الحد الاوسط': 'Had Ausat (Terma Tengah)',
  'مقدمة صغرى': 'Muqaddimah Sughra (Premis Minor)',
  'مقدمة كبرى': 'Muqaddimah Kubra (Premis Major)',
  'النتيجة': 'Natijah (Kesimpulan)',
  'الشكل الأول': 'Bentuk Pertama (Al-Syakl al-Awwal)',
  'الشكل الاول': 'Bentuk Pertama (Al-Syakl al-Awwal)',
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

  // Tauhid / Sam'iyyat / Ilahiyyat / Nubuwwat
  'الإيمان بالملائكة': 'beriman kepada para malaikat',
  'الايمان بالملائكة': 'beriman kepada para malaikat',
  'الإيمان بالرسل': 'beriman kepada para rasul',
  'الايمان بالرسل': 'beriman kepada para rasul',
  'الإيمان بالكتب': 'beriman kepada kitab-kitab suci',
  'الايمان بالكتب': 'beriman kepada kitab-kitab suci',
  'الإيمان باليوم الآخر': 'beriman kepada hari akhirat',
  'الايمان باليوم الاخر': 'beriman kepada hari akhirat',
  'الإيمان بالقدر': 'beriman kepada qada\' dan qadar',
  'الايمان بالقدر': 'beriman kepada qada\' dan qadar',
  'الإيمان بالسمعيات': 'beriman kepada perkara sam\'iyyat',
  'الايمان بالسمعيات': 'beriman kepada perkara sam\'iyyat',
  'الإيمان بالغيب': 'beriman kepada perkara ghaib',
  'الايمان بالغيب': 'beriman kepada perkara ghaib',
  'الإيمان': 'iman / beriman',
  'الايمان': 'iman / beriman',
  'بالإيمان': 'dengan beriman',
  'بالايمان': 'dengan beriman',
  'الإسلام': 'Islam',
  'الاسلام': 'Islam',
  'الإحسان': 'Ihsan',
  'الاحسان': 'Ihsan',
  'العقيدة الإسلامية': 'akidah Islam',
  'العقيدة الاسلامية': 'akidah Islam',
  'عقيدة': 'akidah',
  'العقيدة': 'akidah',
  'التوحيد': 'tauhid',
  'السمعيات': 'Al-Sam\'iyyat (Perkara yang didengar melalui wahyu)',
  'الغيبيات': 'Al-Ghaibiyyat (Perkara-perkara ghaib)',
  'الملائكة': 'para malaikat',
  'بالملائكة': 'kepada para malaikat',
  'للملائكة': 'bagi para malaikat',
  'الملائكة الحفظة': 'Al-Hafazah (Malaikat Penjaga)',
  'الملائكة الكتبة': 'Al-Katabah (Malaikat Pencatat)',
  'الحفظة': 'Al-Hafazah (Malaikat Penjaga)',
  'الكتبة': 'Al-Katabah (Malaikat Pencatat)',
  'منكر ونكير': 'Munkar dan Nakir',
  'ملك الموت': 'Malaikat Maut',
  'إسرافيل': 'Malaikat Israfil',
  'اسرافيل': 'Malaikat Israfil',
  'جبريل': 'Malaikat Jibril',
  'ميكائيل': 'Malaikat Mikail',
  'عزرائيل': 'Malaikat Izrail',
  'رضوان': 'Malaikat Ridwan',
  'مالك': 'Malaikat Malik',
  'الجن': 'bangsa jin',
  'الشيطان': 'syaitan',
  'الشياطين': 'syaitan-syaitan',
  'إبليس': 'Iblis',
  'ابليس': 'Iblis',
  'الموت': 'kematian',
  'أجل': 'ajal',
  'اجل': 'ajal',
  'الروح': 'roh',
  'عذاب القبر ونعيمه': 'azab dan nikmat kubur',
  'نعيم القبر وعذابه': 'nikmat dan azab kubur',
  'عذاب القبر': 'azab kubur',
  'نعيم القبر': 'nikmat kubur',
  'سؤال منكر ونكير': 'soalan Munkar dan Nakir',
  'سؤال القبر': 'soalan kubur',
  'فتنة القبر': 'fitnah kubur',
  'البرزخ': 'Alam Barzakh',
  'البعث والنشور': 'kebangkitan semula dan penyebaran makhluk',
  'البعث': 'Al-Ba\'th (kebangkitan semula dari kubur)',
  'النشور': 'Al-Nusyur (penyebaran makhluk)',
  'الحشر': 'Al-Hasyr (perhimpunan di Padang Mahsyar)',
  'المحشر': 'Padang Mahsyar',
  'الحساب': 'Al-Hisab (perhitungan amalan)',
  'الميزان': 'Al-Mizan (timbangan amalan)',
  'الصراط': 'Titian Sirat',
  'تطاير الصحف': 'penerimaan buku catatan amalan',
  'الحوض': 'Al-Haudh (Kolam Nabi Muhammad SAW)',
  'الكوثر': 'Telaga Al-Kauthar',
  'الشفاعة العظمى': 'Syafaat Teragung (Al-Syafa\'ah Al-\'Uzma)',
  'الشفاعة': 'syafaat',
  'الجنة': 'Syurga',
  'النار': 'Neraka',
  'رؤية الله تعالى': 'melihat Allah Taala di akhirat',
  'رؤية الله': 'melihat Allah Taala',

  // Fiqh & Hukum (Rulings)
  'واجب شرعا': 'wajib dari sudut syarak',
  'واجب عقلا': 'wajib dari sudut akal',
  'مستحيل شرعا': 'mustahil dari sudut syarak',
  'مستحيل عقلا': 'mustahil dari sudut akal',
  'جائز شرعا': 'harus dari sudut syarak',
  'جائز عقلا': 'harus dari sudut akal',
  'حرام قطعا': 'haram secara pasti / qat\'i',
  'كفر مخرج من الملة': 'kufur yang mengeluarkan dari agama',
  'واجب': 'wajib',
  'حرام': 'haram',
  'مستحيل': 'mustahil',
  'جائز': 'harus',
  'مكروه': 'makruh',
  'مندوب': 'sunat (mandub)',
  'سنة': 'sunnah',
  'مباح': 'harus (mubah)',
  'كفر': 'kufur',
  'فسق': 'kefasikan',
  'بدعة': 'bidaah',
  'كافر': 'kafir',
  'فاسق': 'fasiq',
  'مبتدع': 'ahli bidaah',
  'عاص': 'pelaku maksiat',
  'عاصي': 'pelaku maksiat',
  'إجماعا': 'secara ijmak ulama',
  'اجماعا': 'secara ijmak ulama',
  'بالإجماع': 'dengan ijmak ulama',
  'بالاجماع': 'dengan ijmak ulama',
  'قطعي': 'pasti (qat\'i)',
  'ظني': 'zanni (anggapan kuat)',
};

// Pre-compiled Normalized Dictionary Entries (Longest First)
interface NormalizedEntry {
  normKey: string;
  val: string;
}

const NORMALIZED_STAM_ENTRIES: NormalizedEntry[] = Object.entries(STAM_DICTIONARY)
  .map(([k, val]) => ({
    normKey: normalizeArabicText(k),
    val,
  }))
  .sort((a, b) => b.normKey.length - a.normKey.length);

// Internal Stem & Option Caches
const QUESTIONS_STEM_CACHE = new Map<string, string>();
const NORMALIZED_STEM_CACHE = new Map<string, string>();
const QUESTIONS_OPTIONS_CACHE = new Map<string, string>();
const NORMALIZED_OPTIONS_CACHE = new Map<string, string>();
const NORMALIZED_DICTIONARY = new Map<string, string>();

for (const [ar, my] of Object.entries(STAM_DICTIONARY)) {
  NORMALIZED_DICTIONARY.set(normalizeArabicText(ar), my);
}

function initCaches() {
  const allData = [
    ...(FIRAQ_QUESTIONS_PART1 || []),
    ...(TAUHID_QUESTIONS_PART1 || []),
    ...(TAUHID_QUESTIONS_PART2 || []),
    ...(MANTIQ_QUESTIONS_PART1 || []),
  ];

  for (const q of allData) {
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

initCaches();

/**
 * Common Arabic individual words to Malay mapping for complete fallback
 */
const COMMON_ARABIC_WORDS: Record<string, string> = {
  'الله': 'Allah',
  'تعالى': 'Taala',
  'رسول': 'rasul',
  'الرسول': 'Rasulullah SAW',
  'نبي': 'nabi',
  'النبي': 'Nabi SAW',
  'القرآن': 'Al-Quran',
  'القران': 'Al-Quran',
  'الحديث': 'Hadis',
  'السنة': 'Sunnah',
  'الإسلام': 'Islam',
  'الاسلام': 'Islam',
  'الإيمان': 'iman',
  'الايمان': 'iman',
  'عقيدة': 'akidah',
  'العقيدة': 'akidah',
  'حكم': 'hukum',
  'الحكم': 'hukum',
  'دليل': 'dalil',
  'الدليل': 'dalil',
  'تعريف': 'takrif',
  'التعريف': 'takrif',
  'معنى': 'maksud',
  'المعنى': 'maksud',
  'شروط': 'syarat-syarat',
  'أركان': 'rukun-rukun',
  'اركان': 'rukun-rukun',
  'أقسام': 'bahagian-bahagian',
  'اقسام': 'bahagian-bahagian',
  'أنواع': 'jenis-jenis',
  'انواع': 'jenis-jenis',
  'سبب': 'sebab',
  'أسباب': 'sebab-sebab',
  'اسباب': 'sebab-sebab',
  'مثال': 'contoh',
  'أمثلة': 'contoh-contoh',
  'امثلة': 'contoh-contoh',
  'فرقة': 'aliran/golongan',
  'فرق': 'aliran-aliran',
  'مذهب': 'mazhab',
  'مذاهb': 'mazhab-mazhab',
  'مؤسس': 'pengasas',
  'موسس': 'pengasas',
  'قضية': 'proposisi',
  'القضية': 'proposisi',
  'قياس': 'silogisme',
  'القياس': 'silogisme',
  'حد': 'terma',
  'الحد': 'terma',
  'أوسط': 'tengah (had ausat)',
  'اوسط': 'tengah (had ausat)',
  'الأوسط': 'tengah (had ausat)',
  'الاوسط': 'tengah (had ausat)',
  'أصغر': 'minor (asghar)',
  'اصغر': 'minor (asghar)',
  'الأصغر': 'minor',
  'الاصغر': 'minor',
  'أكبر': 'major (akbar)',
  'اكبر': 'major (akbar)',
  'الأكبر': 'major',
  'الاكبر': 'major',
  'مقدمة': 'premis',
  'المقدمة': 'premis',
  'صغرى': 'minor',
  'كبرى': 'major',
  'نتيجة': 'kesimpulan (natijah)',
  'النتيجة': 'kesimpulan (natijah)',
  'موضوع': 'subjek (al-maudhu\')',
  'الموضوع': 'subjek (al-maudhu\')',
  'محمول': 'predikat (al-mahmul)',
  'المحمول': 'predikat (al-mahmul)',
  'رابطة': 'kopula (al-rabithah)',
  'الرابطة': 'kopula (al-rabithah)',
  'سور': 'kuantifier (al-sur)',
  'السور': 'kuantifier (al-sur)',
  'ملائكة': 'malaikat',
  'الملائكة': 'para malaikat',
  'قبر': 'kubur',
  'القبر': 'kubur',
  'عذاب': 'azab',
  'نعيم': 'nikmat',
  'موت': 'kematian',
  'الموت': 'kematian',
  'روح': 'roh',
  'الروح': 'roh',
  'سؤال': 'soalan',
  'حساب': 'hisab amalan',
  'الحساب': 'hisab amalan',
  'ميزان': 'mizan',
  'الميزان': 'timbangan amalan (al-mizan)',
  'صراط': 'Titian Sirat',
  'الصراط': 'Titian Sirat',
  'جنة': 'syurga',
  'الجنة': 'Syurga',
  'نار': 'neraka',
  'النار': 'Neraka',
  'شفاعة': 'syafaat',
  'الشفاعة': 'syafaat',
  'سمعيات': 'sam\'iyyat',
  'السمعيات': 'Al-Sam\'iyyat',
  'غيبيات': 'perkara ghaib',
  'الغيبيات': 'perkara ghaib',
  'كافر': 'kafir',
  'فاسق': 'fasiq',
  'مبتدع': 'ahli bidaah',
  'عاصي': 'pelaku maksiat',
  'عاص': 'pelaku maksiat',
  'واجب': 'wajib',
  'مستحيل': 'mustahil',
  'جائز': 'harus',
  'حرام': 'haram',
  'مكروه': 'makruh',
  'منكر': 'orang yang mengingkari',
  'إنكار': 'pengingkaran',
  'انكار': 'pengingkaran',
  'ثابت': 'tetap (thabit)',
  'قطعي': 'pasti (qat\'i)',
  'ظني': 'zanni (dugaan)',
  'إجماع': 'ijmak ulama',
  'اجماع': 'ijmak ulama',
  'الإجماع': 'ijmak ulama',
  'الاجماع': 'ijmak ulama',
  'عقل': 'akal',
  'العقل': 'akal',
  'شرع': 'syarak',
  'الشرع': 'syarak',
  'عقلا': 'menurut akal',
  'شرعا': 'menurut syarak',
  'ضوء': 'sudut pandang',
  'رأي': 'pandangan',
  'الرأي': 'pandangan',
  'قول': 'pendapat',
  'القول': 'pendapat',
  'أقوال': 'pendapat-pendapat',
  'اقوال': 'pendapat-pendapat',
  'أهل': 'ahli/golongan',
  'اهل': 'ahli/golongan',
  'أصحاب': 'para sahabat',
  'اصحاب': 'para sahabat',
  'صحابة': 'para sahabat',
  'الصحابة': 'para sahabat',
  'خلف': 'khalaf',
  'سلف': 'salaf',
  'السلف': 'ulama Salaf',
  'الخلف': 'ulama Khalaf',
  'أول': 'pertama',
  'اول': 'pertama',
  'الأول': 'pertama',
  'الاول': 'pertama',
  'ثاني': 'kedua',
  'الثاني': 'kedua',
  'ثالث': 'ketiga',
  'الثالث': 'ketiga',
  'رابع': 'keempat',
  'الرابع': 'keempat',
  'صحيح': 'betul/sahih',
  'الصحيح': 'yang betul/sahih',
  'خطأ': 'salah',
  'باطل': 'batil',
  'حق': 'benar',
  'نعم': 'ya',
  'لا': 'tidak',
  'ليس': 'bukan',
  'غير': 'selain',
  'كل': 'setiap',
  'بعض': 'sebahagian',
  'جميع': 'semua',
  'فقط': 'sahaja',
  'هو': 'adalah',
  'هي': 'adalah',
  'هما': 'kedua-duanya',
  'هم': 'mereka',
  'هن': 'mereka',
  'في': 'dalam',
  'من': 'daripada',
  'عن': 'tentang',
  'على': 'atas',
  'إلى': 'kepada/ke',
  'الى': 'kepada/ke',
  'مع': 'bersama',
  'بين': 'antara',
  'عند': 'di sisi/menurut',
  'لدى': 'pada/menurut',
  'حيث': 'dari sudut',
  'أن': 'bahawa',
  'ان': 'bahawa',
  'أنها': 'bahawa ia',
  'انها': 'bahawa ia',
  'أنه': 'bahawa ia',
  'انه': 'bahawa ia',
  'كان': 'adalah',
  'يكون': 'adalah',
  'إذا': 'sekiranya',
  'اذا': 'sekiranya',
  'لو': 'jika',
  'حتى': 'sehingga',
};

const NORMALIZED_COMMON_WORDS: NormalizedEntry[] = Object.entries(COMMON_ARABIC_WORDS)
  .map(([k, val]) => ({
    normKey: normalizeArabicText(k),
    val,
  }))
  .sort((a, b) => b.normKey.length - a.normKey.length);

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

  return translateArabicPhraseToMalay(trimmed);
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

  // 3. Normalized match in STAM dictionary
  if (NORMALIZED_DICTIONARY.has(normalized)) {
    return NORMALIZED_DICTIONARY.get(normalized)!;
  }

  // 4. Question starter template patterns (using normalized text)
  const patterns: Array<{ regex: RegExp; template: (term: string) => string }> = [
    {
      regex: /^ما حكم\s+(.+)$/,
      template: (term) => `Apakah hukum ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما تعريف\s+(.+)$/,
      template: (term) => `Apakah takrif ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما المراد بـ?\s*(.+)$/,
      template: (term) => `Apakah yang dimaksudkan dengan ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما معنى\s+(.+)$/,
      template: (term) => `Apakah maksud ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^من هو مؤسس\s+(.+)$/,
      template: (term) => `Siapakah pengasas bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^من هو موسس\s+(.+)$/,
      template: (term) => `Siapakah pengasas bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^من هم\s+(.+)$/,
      template: (term) => `Siapakah golongan ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^اختر العبارة الصحيحة\s*(.*)$/,
      template: () => 'Pilih pernyataan yang betul:',
    },
    {
      regex: /^اختر الاجابه الصحيحه\s*(.*)$/,
      template: () => 'Pilih jawapan yang betul:',
    },
    {
      regex: /^أي مما يأتي يعد من\s+(.+)$/,
      template: (term) => `Antara berikut, yang manakah merupakan bahagian bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^اي مما ياتي يعد من\s+(.+)$/,
      template: (term) => `Antara berikut, yang manakah merupakan bahagian bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^أي مما يأتي هو\s+(.+)$/,
      template: (term) => `Antara berikut, yang manakah merupakan ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^اي مما ياتي هو\s+(.+)$/,
      template: (term) => `Antara berikut, yang manakah merupakan ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^أي مما يأتي\s*(.*)$/,
      template: (term) => term ? `Antara berikut, yang manakah ${translateArabicPhraseToMalay(term)}?` : 'Antara berikut, yang manakah benar?',
    },
    {
      regex: /^اي مما ياتي\s*(.*)$/,
      template: (term) => term ? `Antara berikut, yang manakah ${translateArabicPhraseToMalay(term)}?` : 'Antara berikut, yang manakah benar?',
    },
    {
      regex: /^ما هي شروط\s+(.+)$/,
      template: (term) => `Apakah syarat-syarat bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما هي أركان\s+(.+)$/,
      template: (term) => `Apakah rukun-rukun bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما هي اركان\s+(.+)$/,
      template: (term) => `Apakah rukun-rukun bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما هي أقسام\s+(.+)$/,
      template: (term) => `Apakah bahagian-bahagian bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما هي اقسام\s+(.+)$/,
      template: (term) => `Apakah bahagian-bahagian bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما هي أنواع\s+(.+)$/,
      template: (term) => `Apakah jenis-jenis bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^ما هي انواع\s+(.+)$/,
      template: (term) => `Apakah jenis-jenis bagi ${translateArabicPhraseToMalay(term)}?`,
    },
    {
      regex: /^عرف\s+(.+)$/,
      template: (term) => `Takrifkan ${translateArabicPhraseToMalay(term)}.`,
    },
    {
      regex: /^اذكر\s+(.+)$/,
      template: (term) => `Nyatakan ${translateArabicPhraseToMalay(term)}.`,
    },
    {
      regex: /^بين\s+(.+)$/,
      template: (term) => `Terangkan ${translateArabicPhraseToMalay(term)}.`,
    },
    {
      regex: /^وضح\s+(.+)$/,
      template: (term) => `Jelaskan ${translateArabicPhraseToMalay(term)}.`,
    },
  ];

  for (const p of patterns) {
    const match = normalized.match(p.regex);
    if (match) {
      return p.template(match[1] || '');
    }
  }

  return translateArabicPhraseToMalay(trimmed);
}

/**
 * Clean Rumi transliteration for leftover words that preserves pronounceable Malay syllables
 */
export function arabicToRumiPhonetic(arabicText: string): string {
  if (!arabicText || !/[\u0600-\u06FF]/.test(arabicText)) return arabicText;

  let res = normalizeArabicText(arabicText);

  // Replace common Islamic prefixes
  res = res.replace(/(^|\s)بالملايكه(\s|$)/g, '$1kepada para malaikat$2');
  res = res.replace(/(^|\s)بالرسل(\s|$)/g, '$1kepada para rasul$2');
  res = res.replace(/(^|\s)بالكتب(\s|$)/g, '$1kepada kitab-kitab suci$2');
  res = res.replace(/(^|\s)باليوم الاخر(\s|$)/g, '$1kepada hari akhirat$2');
  res = res.replace(/(^|\s)بالسمعيات(\s|$)/g, '$1kepada perkara sam\'iyyat$2');
  res = res.replace(/(^|\s)بالغيبيات(\s|$)/g, '$1kepada perkara ghaib$2');
  res = res.replace(/(^|\s)بالقدر(\s|$)/g, '$1kepada qada\' dan qadar$2');
  res = res.replace(/(^|\s)بالله(\s|$)/g, '$1kepada Allah Taala$2');
  res = res.replace(/(^|\s)بالقبر(\s|$)/g, '$1dengan kubur$2');
  res = res.replace(/(^|\s)بالايمان(\s|$)/g, '$1dengan beriman$2');
  res = res.replace(/(^|\s)بالاسلام(\s|$)/g, '$1dengan Islam$2');
  res = res.replace(/(^|\s)بالعقل(\s|$)/g, '$1menurut akal$2');
  res = res.replace(/(^|\s)بالشرع(\s|$)/g, '$1menurut syarak$2');
  res = res.replace(/(^|\s)بالاجماع(\s|$)/g, '$1secara ijmak ulama$2');

  res = res.replace(/(^|\s)بال/g, '$1dengan ');
  res = res.replace(/(^|\s)لل/g, '$1bagi ');
  res = res.replace(/(^|\s)كال/g, '$1seperti ');
  res = res.replace(/(^|\s)وال/g, '$1dan ');
  res = res.replace(/(^|\s)فال/g, '$1maka ');
  res = res.replace(/(^|\s)ب/g, '$1dengan ');
  res = res.replace(/(^|\s)ل/g, '$1bagi ');
  res = res.replace(/(^|\s)و/g, '$1dan ');
  res = res.replace(/(^|\s)ف/g, '$1maka ');

  for (const item of NORMALIZED_COMMON_WORDS) {
    const reg = new RegExp(`(^|\\s)${item.normKey}(\\s|$)`, 'g');
    res = res.replace(reg, `$1${item.val}$2`);
  }

  // Phonetic letters mapping for unknown roots
  const charMap: Record<string, string> = {
    'ا': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th', 'ج': 'j', 'ح': 'h', 'خ': 'kh',
    'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z', 'س': 's', 'ش': 'sy',
    'ص': 'sh', 'ض': 'dh', 'ط': 'th', 'ظ': 'zh', 'ع': '\'', 'غ': 'gh',
    'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y'
  };

  res = res.replace(/[\u0600-\u06FF]/g, (ch) => charMap[ch] || '');
  return res.replace(/\s+/g, ' ').trim();
}

/**
 * Translates an Arabic phrase completely into Malay with 100% completion (Zero leftover Arabic text)
 */
export function translateArabicPhraseToMalay(phrase: string): string {
  if (!phrase || !phrase.trim()) return '';
  const trimmed = phrase.trim();

  // 1. Direct dictionary match on exact phrase
  if (STAM_DICTIONARY[trimmed]) {
    return STAM_DICTIONARY[trimmed];
  }

  // 2. Normalized dictionary match
  const normalized = normalizeArabicText(trimmed);
  if (NORMALIZED_DICTIONARY.has(normalized)) {
    return NORMALIZED_DICTIONARY.get(normalized)!;
  }

  let result = normalized;

  // 3. Multi-word phrases in normalized STAM dictionary (longest first)
  for (const item of NORMALIZED_STAM_ENTRIES) {
    if (result.includes(item.normKey)) {
      result = result.split(item.normKey).join(` ${item.val} `);
    }
  }

  // 4. Handle attached prefixes (e.g. بالملايكه -> kepada para malaikat)
  const prefixPatterns: Array<{ regex: RegExp; replace: string }> = [
    { regex: /(^|\s)بالملايكه(\s|$)/g, replace: '$1kepada para malaikat$2' },
    { regex: /(^|\s)بالرسل(\s|$)/g, replace: '$1kepada para rasul$2' },
    { regex: /(^|\s)بالكتب(\s|$)/g, replace: '$1kepada kitab-kitab suci$2' },
    { regex: /(^|\s)باليوم الاخر(\s|$)/g, replace: '$1kepada hari akhirat$2' },
    { regex: /(^|\s)بالله(\s|$)/g, replace: '$1kepada Allah Taala$2' },
    { regex: /(^|\s)بالقدر(\s|$)/g, replace: '$1kepada qada\' dan qadar$2' },
    { regex: /(^|\s)بالسمعيات(\s|$)/g, replace: '$1kepada perkara sam\'iyyat$2' },
    { regex: /(^|\s)بالغيبيات(\s|$)/g, replace: '$1kepada perkara ghaib$2' },
    { regex: /(^|\s)بالقبر(\s|$)/g, replace: '$1dengan kubur$2' },
    { regex: /(^|\s)بالايمان(\s|$)/g, replace: '$1dengan beriman$2' },
    { regex: /(^|\s)بالاسلام(\s|$)/g, replace: '$1dengan Islam$2' },
    { regex: /(^|\s)بالعقل(\s|$)/g, replace: '$1menurut akal$2' },
    { regex: /(^|\s)بالشرع(\s|$)/g, replace: '$1menurut syarak$2' },
    { regex: /(^|\s)بالاجماع(\s|$)/g, replace: '$1secara ijmak ulama$2' },
    { regex: /(^|\s)للملايكه(\s|$)/g, replace: '$1bagi para malaikat$2' },
    { regex: /(^|\s)للرسل(\s|$)/g, replace: '$1bagi para rasul$2' },
    { regex: /(^|\s)للموت(\s|$)/g, replace: '$1bagi kematian$2' },
    { regex: /(^|\s)للسمعيات(\s|$)/g, replace: '$1bagi perkara sam\'iyyat$2' },
    { regex: /(^|\s)للغيبيات(\s|$)/g, replace: '$1bagi perkara ghaib$2' },
    { regex: /(^|\s)وللقدر(\s|$)/g, replace: '$1dan bagi qada\' dan qadar$2' },
    { regex: /(^|\s)والايمان(\s|$)/g, replace: '$1dan beriman$2' },
    { regex: /(^|\s)والاسلام(\s|$)/g, replace: '$1dan Islam$2' },
    { regex: /(^|\s)والاحسان(\s|$)/g, replace: '$1dan Ihsan$2' },
  ];

  for (const p of prefixPatterns) {
    result = result.replace(p.regex, p.replace);
  }

  // 5. Common single words
  for (const item of NORMALIZED_COMMON_WORDS) {
    if (result.includes(item.normKey)) {
      const reg = new RegExp(`(^|\\s)${item.normKey}(\\s|$)`, 'g');
      result = result.replace(reg, `$1${item.val}$2`);
    }
  }

  // 6. Particles and connectives
  const particles: Record<string, string> = {
    'ما هو ': 'apakah ',
    'ما هي ': 'apakah ',
    'ما ': 'apakah ',
    'من هو ': 'siapakah ',
    'من هي ': 'siapakah ',
    'من هم ': 'siapakah golongan ',
    'من انكر': 'sesiapa yang mengingkari',
    'من قال': 'sesiapa yang berkata',
    'من اعتقد': 'sesiapa yang beriktikad',
    'اين ': 'di manakah ',
    'كيف ': 'bagaimanakah ',
    'متى ': 'bilakah ',
    'لماذا ': 'mengapakah ',
    'هل ': 'adakah ',
    'اختر ': 'pilih ',
    'حكم ': 'hukum ',
    'تعريف ': 'takrif ',
    'معنى ': 'maksud ',
    'شروط ': 'syarat-syarat ',
    'اركان ': 'rukun-rukun ',
    'اقسام ': 'bahagian-bahagian ',
    'انواع ': 'jenis-jenis ',
    'مثال ': 'contoh ',
    'امثلة ': 'contoh-contoh ',
    'دليل ': 'dalil ',
    'سبب ': 'sebab ',
    'علة ': 'sebab ',
    'في ': 'dalam ',
    'من ': 'daripada ',
    'الى ': 'kepada ',
    'على ': 'atas ',
    'عن ': 'tentang ',
    'مع ': 'bersama ',
    'هو ': 'adalah ',
    'هي ': 'adalah ',
    'ان ': 'bahawa ',
    'انه ': 'bahawa ia ',
    'لا ': 'tidak ',
    'ليس ': 'bukan ',
    'غير ': 'selain ',
    'كل ': 'setiap ',
    'بعض ': 'sebahagian ',
    'فقط': 'sahaja',
    'اجماعا': 'secara ijmak ulama',
    'واذكر': 'dan nyatakan',
    'اذكر': 'nyatakan',
    'بين': 'terangkan',
    'عرف': 'takrifkan',
    'ثلاثة امثلة': 'tiga contoh',
    'مثالين': 'dua contoh',
    'مثال واحد': 'satu contoh',
    'لها': 'mengenainya',
    'له': 'mengenainya',
  };

  for (const [arP, myP] of Object.entries(particles)) {
    if (result.includes(arP)) {
      result = result.split(arP).join(` ${myP} `);
    }
  }

  // 7. Ensure NO Arabic script remains outside Quran brackets
  if (/[\u0600-\u06FF]/.test(result)) {
    result = arabicToRumiPhonetic(result);
  }

  // Clean extra spaces, punctuation, and question marks
  result = result
    .replace(/\s+/g, ' ')
    .replace(/\s*\?\s*$/, '')
    .trim();

  // Capitalize first character
  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result;
}

// Reverse STAM dictionary for Malay -> Arabic translations
const REVERSE_STAM_DICTIONARY = new Map<string, string>();
for (const [ar, my] of Object.entries(STAM_DICTIONARY)) {
  const cleanMy = my.toLowerCase().trim();
  if (!REVERSE_STAM_DICTIONARY.has(cleanMy)) {
    REVERSE_STAM_DICTIONARY.set(cleanMy, ar);
  }
}

/**
 * Smart Arabic to Malay translator using glossary, phrase replacement, and sentence pattern matching
 */
export function translateArabicToMalaySmart(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();

  // 1. Direct question match
  const qMatch = autoTranslateArabicQuestion(trimmed);
  if (qMatch && !/[\u0600-\u06FF]/.test(qMatch)) return qMatch;

  // 2. Direct option match
  const optMatch = autoTranslateArabicOption(trimmed);
  if (optMatch && !/[\u0600-\u06FF]/.test(optMatch)) return optMatch;

  // 3. Quranic verse citation: ﴿ ... ﴾
  if (trimmed.includes('﴿') && trimmed.includes('﴾')) {
    return trimmed.replace(/﴿([^﴾]+)﴾/g, 'Firman Allah Taala: ﴿$1﴾');
  }

  // 4. Full phrase translation guarantee (100% Malay Rumi, no leftover Arabic)
  return translateArabicPhraseToMalay(trimmed);
}

/**
 * Smart Malay to Arabic translator
 */
export function translateMalayToArabicSmart(text: string): string {
  if (!text || !text.trim()) return '';
  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  // Direct reverse dictionary lookup
  if (REVERSE_STAM_DICTIONARY.has(lower)) {
    return REVERSE_STAM_DICTIONARY.get(lower)!;
  }

  // Match in question bank
  for (const [ar, my] of QUESTIONS_OPTIONS_CACHE.entries()) {
    if (my.toLowerCase().trim() === lower) {
      return ar;
    }
  }

  for (const [ar, my] of QUESTIONS_STEM_CACHE.entries()) {
    if (my.toLowerCase().trim() === lower) {
      return ar;
    }
  }

  return trimmed;
}

/**
 * Ensures a Malay translation is 100% in Rumi and contains NO leftover Arabic characters (outside Quran brackets ﴿ ﴾)
 */
export function ensureCleanMalayTranslation(text: string): string {
  if (!text) return '';
  // If no Arabic characters at all, return directly
  if (!/[\u0600-\u06FF]/.test(text)) return text;

  // Preserve Quran brackets ﴿ ... ﴾
  const quranParts: string[] = [];
  let masked = text.replace(/﴿[^﴾]+﴾/g, (match) => {
    quranParts.push(match);
    return `__QURAN_PART_${quranParts.length - 1}__`;
  });

  // If there are still Arabic characters in masked text, translate them
  if (/[\u0600-\u06FF]/.test(masked)) {
    // Replace any remaining Arabic words inside the text
    masked = masked.replace(/[\u0600-\u06FF\s]+(?=[^\u0600-\u06FF]|$)/g, (arabicSubstring) => {
      const translated = translateArabicPhraseToMalay(arabicSubstring);
      return translated || arabicSubstring;
    });

    if (/[\u0600-\u06FF]/.test(masked)) {
      masked = arabicToRumiPhonetic(masked);
    }
  }

  // Restore Quran parts
  quranParts.forEach((part, idx) => {
    masked = masked.replace(`__QURAN_PART_${idx}__`, part);
  });

  return masked;
}

/**
 * Full Question Offline Translation Fallback
 */
export function translateQuestionFullOffline(params: {
  questionArabic?: string;
  questionMalay?: string;
  options?: Array<{ id: string; textArabic?: string; textMalay?: string }>;
  explanationArabic?: string;
  explanationMalay?: string;
  diagramArabic?: string;
  targetLanguage?: string;
}) {
  const isToMalay = params.targetLanguage !== 'ar';

  let translatedQuestion = '';
  if (isToMalay) {
    translatedQuestion =
      autoTranslateArabicQuestion(params.questionArabic || '') ||
      translateArabicToMalaySmart(params.questionArabic || '') ||
      'Pilih jawapan yang paling tepat berdasarkan soalan di atas.';
    translatedQuestion = ensureCleanMalayTranslation(translatedQuestion);
  } else {
    translatedQuestion =
      translateMalayToArabicSmart(params.questionMalay || '') ||
      params.questionMalay ||
      'اختر الإجابة الصحيحة مما يأتي:';
  }

  const translatedOptions = (params.options || []).map((opt) => {
    let text = '';
    if (isToMalay) {
      text =
        autoTranslateArabicOption(opt.textArabic || '') ||
        translateArabicToMalaySmart(opt.textArabic || '') ||
        '';
      text = ensureCleanMalayTranslation(text);
      if (!text) {
        text = `Pilihan ${opt.id.toUpperCase()}`;
      }
    } else {
      text =
        translateMalayToArabicSmart(opt.textMalay || '') ||
        opt.textMalay ||
        '';
    }
    return {
      id: opt.id,
      translatedText: text,
    };
  });

  let translatedExplanation = '';
  if (isToMalay) {
    translatedExplanation = params.explanationArabic
      ? ensureCleanMalayTranslation(translateArabicToMalaySmart(params.explanationArabic))
      : '';
  } else {
    translatedExplanation = params.explanationMalay
      ? translateMalayToArabicSmart(params.explanationMalay)
      : '';
  }

  return {
    translatedQuestion,
    translatedDiagram: params.diagramArabic ? ensureCleanMalayTranslation(translateArabicToMalaySmart(params.diagramArabic)) : '',
    translatedOptions,
    translatedExplanation,
  };
}
