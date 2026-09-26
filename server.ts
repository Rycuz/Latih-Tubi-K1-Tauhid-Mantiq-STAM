import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import {
  translateArabicToMalaySmart,
  translateMalayToArabicSmart,
  translateQuestionFullOffline,
  autoTranslateArabicOption,
  ensureCleanMalayTranslation,
} from './src/utils/bilingualTranslator.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '10mb' }));

// Initialize Google Gemini AI SDK
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const STAM_SYSTEM_INSTRUCTION = `Anda adalah pakar bahasa dan penterjemah kurikulum STAM (Sijil Tinggi Agama Malaysia) bagi subjek Al-Dirasat Al-Islamiah (Tauhid, Firaq, dan Mantiq).
Tugas anda adalah menterjemahkan teks soalan peperiksaan objektif, pilihan jawapan (A, B, C, D), rajah/jadual teks, dan huraian jawapan antara Bahasa Arab dan Bahasa Melayu dengan KELENGKAPAN SEPENUHNYA (100% lengkap).

PANDUAN DAN SYARAT MUTLAK TERJEMAHAN BAHASA ARAB KE BAHASA MELAYU (BA -> BM):
1. WAJIB TERJEMAH KESELURUHAN AYAT (100% LENGKAP):
   - Wajib terjemahkan keseluruhan soalan, pilihan jawapan, dan huraian dari perkataan pertama hingga terakhir ke dalam Bahasa Melayu standard STAM.
   - DILARANG SAMA SEKALI menterjemah separuh atau sekerat jalan (contoh dilarang: "Apakah hukum الإيمان بالملائكة...").
   - DILARANG meninggalkan sebarang huruf atau perkataan dalam tulisan/abjad Arab di tengah-tengah ayat Bahasa Melayu!
2. ISTILAH AGAMA & ILMU DALAM EJAAN RUMI BAKU:
   - Semua istilah ilmu Tauhid, Firaq, Mantiq, dan Usuluddin MESTI ditulis dalam tulisan RUMI Bahasa Melayu standard silibus STAM Malaysia (contoh: Ahli Sunnah wal Jamaah, Al-Sam'iyyat, Al-Ghaibiyyat, Mu'tazilah, Khawarij, Syiah, Qadhiyyah Hamliyyah, Qadhiyyah Syartiyyah, Had Ausat, Al-Maudhu', Al-Mahmul, Al-Burhan, Titian Sirat, Al-Mizan, Alam Barzakh, dsb.), BUKAN dalam abjad Arab!
3. PENGECUALIAN AYAT AL-QURAN:
   - Hanya teks firman Allah (ayat Al-Quran) yang berada dalam tanda kurungan khas ﴿ ... ﴾ sahaja yang dibenarkan mengekalkan teks Arab.
4. KEKALKAN FORMAT TAG KATA KUNCI:
   - Sekiranya terdapat tag pemformatan penekanan kata kunci seperti <b>...</b> atau <merah>...</merah>, kekalkan tag tersebut dengan membungkus perkataan terjemahan yang sepadan.`;

function formatGeminiError(error: any, defaultMsg: string): string {
  const rawMsg = String(error?.message || '');
  if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand') || rawMsg.includes('overloaded')) {
    return 'Pelayan Gemini AI sedang menerima permintaan tinggi buat sementara waktu. Sila cuba lagi dalam beberapa saat.';
  }
  if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return 'Had kuota seminit Gemini AI telah dicapai. Sila tunggu beberapa saat sebelum menekan semula butang terjemah.';
  }
  return error?.message || defaultMsg;
}

async function generateContentWithRetry(params: any, retries = 3) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
  let lastError: any;
  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        if (response && response.text) {
          return response;
        }
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient =
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand') ||
          msg.includes('overloaded');
        if (isTransient && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          continue;
        }
        break; // try next model in candidate list
      }
    }
  }
  throw lastError;
}

// Health & Status check endpoint
app.get('/api/gemini/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: Boolean(apiKey),
    model: 'gemini-3.8-flash',
  });
});

// Single text translation endpoint
app.post('/api/translate/text', async (req: Request, res: Response) => {
  const { text, from = 'auto', to = 'ms', context = 'stam_exam' } = req.body;

  if (!text || typeof text !== 'string' || !text.trim()) {
    res.status(400).json({ error: 'Sila masukkan teks untuk diterjemahkan.' });
    return;
  }

  const isToMalay = to !== 'ar';

  try {
    const directionPrompt = isToMalay
      ? 'Terjemahkan KESELURUHAN teks peperiksaan STAM berikut daripada Bahasa Arab ke Bahasa Melayu dengan 100% LENGKAP. Berikan TEKS HASIL TERJEMAHAN SAHAJA tanpa sebarang tajuk awalan, tanpa pengenalan seperti "**Terjemahan Bahasa Melayu:**", dan tanpa mukadimah. WAJIB terjemah setiap perkataan dari awal sampai habis ke dalam ejaan Rumi Bahasa Melayu standard STAM:'
      : 'Terjemahkan teks berikut daripada Bahasa Melayu ke Bahasa Arab standard STAM. Berikan teks terjemahan sahaja tanpa sebarang tajuk awalan atau mukadimah:';

    const response = await generateContentWithRetry({
      contents: `${directionPrompt}\n\nTeks Asal:\n${text.trim()}`,
      config: {
        systemInstruction: STAM_SYSTEM_INSTRUCTION + '\n\nPERINGATAN FORMAT:\nBerikan teks hasil terjemahan secara terus tanpa meletakkan sebarang tajuk awalan, pengenalan, atau mukadimah seperti "**Terjemahan Bahasa Melayu:**".',
        temperature: 0.2,
      },
    });

    let translatedText = response.text ? response.text.trim() : '';
    if (translatedText) {
      // Clean accidental conversational headers like "**Terjemahan Bahasa Melayu:**" or "Terjemahan:"
      translatedText = translatedText
        .replace(/^\s*\*{0,2}Terjemahan\s*(Bahasa\s*Melayu|Bahasa\s*Arab)?\s*:?\*{0,2}\s*\n*/i, '')
        .trim();

      if (isToMalay) {
        translatedText = ensureCleanMalayTranslation(translatedText);
      }
      res.json({ translatedText, fallback: false });
      return;
    }
  } catch (error: any) {
    console.warn('[Translate /api/translate/text] Gemini API unavailable or rate-limited. Activating STAM offline translator.');
  }

  // Graceful offline fallback
  let fallbackText = isToMalay
    ? translateArabicToMalaySmart(text)
    : translateMalayToArabicSmart(text);

  if (isToMalay && fallbackText) {
    fallbackText = ensureCleanMalayTranslation(fallbackText);
  }

  res.json({
    translatedText: fallbackText || text,
    fallback: true,
    notice: 'Terjemahan dijana melalui Glosari Pintar STAM (Mod Sandaran Lengkap).',
  });
});

// Full Question & 4 Options translation endpoint
app.post('/api/translate/question-full', async (req: Request, res: Response) => {
  const {
    questionArabic = '',
    questionMalay = '',
    options = [],
    explanationArabic = '',
    explanationMalay = '',
    diagramArabic = '',
    targetLanguage = 'ms', // 'ms' (translate Arabic to Malay) or 'ar' (translate Malay to Arabic)
  } = req.body;

  const isToMalay = targetLanguage === 'ms';

  try {
    const prompt = `Sila terjemahkan KESELURUHAN komponen soalan peperiksaan STAM berikut ${
      isToMalay
        ? 'daripada Bahasa Arab ke Bahasa Melayu dengan 100% LENGKAP dan SEMPURNA (semua istilah Tauhid, Firaq, Mantiq ditulis dalam tulisan RUMI Bahasa Melayu standard STAM. DILARANG membiarkan ayat sekerat atau meninggalkan perkataan dalam aksara Arab).'
        : 'daripada Bahasa Melayu ke Bahasa Arab standard kurikulum STAM.'
    }.

Komponen Soalan:
- Teks Soalan (${isToMalay ? 'Bahasa Arab' : 'Bahasa Melayu'}): ${isToMalay ? questionArabic : questionMalay}
${diagramArabic ? `- Rajah / Pernyataan Tambahan: ${diagramArabic}` : ''}
- Pilihan Jawapan:
${options
  .map(
    (opt: any) =>
      `  * Pilihan (${opt.id.toUpperCase()}): ${isToMalay ? opt.textArabic || opt.textMalay : opt.textMalay || opt.textArabic}`
  )
  .join('\n')}
${(isToMalay ? explanationArabic : explanationMalay) ? `- Huraian/Penerangan: ${isToMalay ? explanationArabic : explanationMalay}` : ''}

Sila kembalikan hasil terjemahan dalam format JSON berstruktur yang ditetapkan.`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        systemInstruction: STAM_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedQuestion: {
              type: Type.STRING,
              description: isToMalay
                ? 'Terjemahan soalan penuh dalam Bahasa Melayu Rumi (100% lengkap tanpa aksara Arab)'
                : 'Terjemahan soalan dalam Bahasa Arab',
            },
            translatedDiagram: {
              type: Type.STRING,
              description: 'Terjemahan teks rajah atau jadual jika ada, atau kosong jika tiada',
            },
            translatedOptions: {
              type: Type.ARRAY,
              description: 'Senarai 4 pilihan jawapan yang telah diterjemahkan lengkap',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'id pilihan: a, b, c, atau d' },
                  translatedText: { type: Type.STRING, description: 'Teks terjemahan lengkap pilihan jawapan' },
                },
                required: ['id', 'translatedText'],
              },
            },
            translatedExplanation: {
              type: Type.STRING,
              description: 'Terjemahan huraian/penerangan jika ada',
            },
          },
          required: ['translatedQuestion', 'translatedOptions'],
        },
        temperature: 0.2,
      },
    });

    const jsonText = response.text ? response.text.trim() : '{}';
    const parsedData = JSON.parse(jsonText);

    if (parsedData && parsedData.translatedQuestion) {
      if (isToMalay) {
        parsedData.translatedQuestion = ensureCleanMalayTranslation(parsedData.translatedQuestion);
        if (parsedData.translatedDiagram) {
          parsedData.translatedDiagram = ensureCleanMalayTranslation(parsedData.translatedDiagram);
        }
        if (parsedData.translatedExplanation) {
          parsedData.translatedExplanation = ensureCleanMalayTranslation(parsedData.translatedExplanation);
        }
        if (Array.isArray(parsedData.translatedOptions)) {
          parsedData.translatedOptions = parsedData.translatedOptions.map((opt: any) => ({
            ...opt,
            translatedText: ensureCleanMalayTranslation(opt.translatedText),
          }));
        }
      }
      res.json({ ...parsedData, fallback: false });
      return;
    }
  } catch (error: any) {
    console.warn('[Translate /api/translate/question-full] Gemini API unavailable or rate-limited. Activating STAM offline translator.');
  }

  // Graceful offline fallback using rich STAM question & options bank
  const offlineData = translateQuestionFullOffline({
    questionArabic,
    questionMalay,
    options,
    explanationArabic,
    explanationMalay,
    diagramArabic,
    targetLanguage,
  });

  res.json({
    ...offlineData,
    fallback: true,
    notice: 'Terjemahan dijana melalui Glosari Pintar STAM (Mod Sandaran Lengkap).',
  });
});

// Options-only batch translation endpoint
app.post('/api/translate/options-batch', async (req: Request, res: Response) => {
  const { options = [], targetLanguage = 'ms' } = req.body;

  if (!Array.isArray(options) || options.length === 0) {
    res.status(400).json({ error: 'Sila hantar senarai pilihan jawapan untuk diterjemahkan.' });
    return;
  }

  const isToMalay = targetLanguage === 'ms';

  try {
    const prompt = `Sila terjemahkan 4 pilihan jawapan aneka pilihan (MCQ) peperiksaan STAM berikut ${
      isToMalay
        ? 'daripada Bahasa Arab ke Bahasa Melayu dengan 100% LENGKAP (setiap pilihan diterjemahkan sepenuhnya ke dalam tulisan Rumi Bahasa Melayu standard STAM tanpa perkataan Arab yang tertinggal)'
        : 'daripada Bahasa Melayu ke Bahasa Arab standard kurikulum STAM'
    }:

${options
  .map(
    (opt: any) =>
      `- [${opt.id}]: ${isToMalay ? opt.textArabic || opt.textMalay : opt.textMalay || opt.textArabic}`
  )
  .join('\n')}

Semua istilah teknikal subjek STAM (Tauhid, Firaq, Mantiq) mesti dieja dalam tulisan RUMI Bahasa Melayu standard.`;

    const response = await generateContentWithRetry({
      contents: prompt,
      config: {
        systemInstruction: STAM_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translatedOptions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  translatedText: { type: Type.STRING },
                },
                required: ['id', 'translatedText'],
              },
            },
          },
          required: ['translatedOptions'],
        },
        temperature: 0.2,
      },
    });

    const jsonText = response.text ? response.text.trim() : '{}';
    const parsedData = JSON.parse(jsonText);

    if (parsedData && Array.isArray(parsedData.translatedOptions)) {
      if (isToMalay) {
        parsedData.translatedOptions = parsedData.translatedOptions.map((opt: any) => ({
          ...opt,
          translatedText: ensureCleanMalayTranslation(opt.translatedText),
        }));
      }
      res.json({ ...parsedData, fallback: false });
      return;
    }
  } catch (error: any) {
    console.warn('[Translate /api/translate/options-batch] Gemini API unavailable or rate-limited. Activating STAM offline translator.');
  }

  // Graceful offline fallback
  const translatedOptions = options.map((opt: any) => {
    let text = isToMalay
      ? autoTranslateArabicOption(opt.textArabic || '') ||
        translateArabicToMalaySmart(opt.textArabic || '') ||
        ''
      : translateMalayToArabicSmart(opt.textMalay || '') ||
        opt.textMalay ||
        '';

    if (isToMalay && text) {
      text = ensureCleanMalayTranslation(text);
    }
    return {
      id: opt.id,
      translatedText: text || (isToMalay ? `Pilihan ${opt.id.toUpperCase()}` : opt.textArabic || ''),
    };
  });

  res.json({
    translatedOptions,
    fallback: true,
    notice: 'Pilihan jawapan diterjemahkan menggunakan Glosari Pintar STAM (Mod Sandaran Lengkap).',
  });
});

// Vite or Static file serving
async function setupViteOrStatic() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running at http://0.0.0.0:${port}`);
  });
}

setupViteOrStatic().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
