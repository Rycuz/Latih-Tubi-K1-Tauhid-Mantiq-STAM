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

const STAM_SYSTEM_INSTRUCTION = `Anda adalah pakar bahasa dan penterjemah kurikulum STAM (Sijil Tinggi Agama Malaysia) bagi sukatan Al-Dirasat Al-Islamiah (Tauhid, Firaq, dan Mantiq).
Tugas anda adalah menterjemahkan teks soalan peperiksaan objektif, pilihan jawapan (A, B, C, D), rajah/jadual teks, dan huraian jawapan antara Bahasa Arab dan Bahasa Melayu dengan standard kualiti tertinggi.

Panduan Terjemahan STAM:
1. Ketepatan Istilah Teknologis Agama: Kekalkan istilah ilmu Kalam, Usuluddin, Firaq dan Mantiq (contoh: Al-Sam'iyyat, Al-Ghaibiyyat, Mu'tazilah, Khawarij, Qadhiyyah Hamliyyah, Qadhiyyah Syartiyyah, Had Ausat, Al-Burhan, Al-Mizan, Titian Sirat, Maqasid Syariah, dsb.) dengan padanan rasmi silibus STAM Malaysia.
2. Pemeliharaan Format Tag: Kekalkan dengan rapi sebarang tag teks garis seperti <u>perkataan</u> atau [u]perkataan[/u] sekiranya ada dalam teks asal.
3. Ayat al-Quran & Hadis: Kekalkan teks ayat al-Quran dalam kurungan ﴿ ﴾ dengan teks Arabnya yang asli atau sertakan maksud firman Allah jika dikehendaki.
4. Gaya Bahasa Peperiksaan: Gunakan laras bahasa Melayu standard peperiksaan Malaysia (contoh: "Antara berikut, yang manakah...", "Pilih pernyataan yang tepat:", "Apakah bahagian bagi perkataan yang bergaris...").
5. Hasil mestilah ringkas, kemas dan bersesuaian dengan format aneka pilihan (MCQ).`;

function formatGeminiError(error: any, defaultMsg: string): string {
  const rawMsg = String(error?.message || '');
  if (rawMsg.includes('503') || rawMsg.includes('UNAVAILABLE') || rawMsg.includes('high demand')) {
    return 'Pelayan Gemini AI sedang menerima permintaan tinggi buat sementara waktu. Sila cuba lagi dalam beberapa saat.';
  }
  if (rawMsg.includes('429') || rawMsg.includes('quota') || rawMsg.includes('RESOURCE_EXHAUSTED')) {
    return 'Had kuota seminit Gemini AI telah dicapai. Sila tunggu beberapa saat sebelum menekan semula butang terjemah.';
  }
  return error?.message || defaultMsg;
}
async function generateContentWithRetry(params: any, retries = 2) {
  const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
  let lastError: any;
  for (const model of models) {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || '');
        const isTransient =
          msg.includes('503') ||
          msg.includes('429') ||
          msg.includes('UNAVAILABLE') ||
          msg.includes('high demand');
        if (isTransient && attempt < retries) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
          continue;
        }
        break; // try next model
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
      ? 'Terjemahkan teks berikut daripada Bahasa Arab ke Bahasa Melayu standard STAM:'
      : 'Terjemahkan teks berikut daripada Bahasa Melayu ke Bahasa Arab standard STAM:';

    const response = await generateContentWithRetry({
      contents: `${directionPrompt}\n\nTeks Asal:\n${text.trim()}`,
      config: {
        systemInstruction: STAM_SYSTEM_INSTRUCTION,
        temperature: 0.2,
      },
    });

    const translatedText = response.text ? response.text.trim() : '';
    if (translatedText) {
      res.json({ translatedText, fallback: false });
      return;
    }
  } catch (error: any) {
    console.warn('[Translate /api/translate/text] Gemini API unavailable or rate-limited. Activating STAM offline translator.');
  }

  // Graceful offline fallback
  const fallbackText = isToMalay
    ? translateArabicToMalaySmart(text)
    : translateMalayToArabicSmart(text);

  res.json({
    translatedText: fallbackText || text,
    fallback: true,
    notice: 'Terjemahan dijana melalui Glosari Pintar STAM (Mod Luar Talian).',
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
    const prompt = `Sila terjemahkan komponen soalan STAM berikut ${
      isToMalay
        ? 'daripada Bahasa Arab ke Bahasa Melayu'
        : 'daripada Bahasa Melayu ke Bahasa Arab'
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
                ? 'Terjemahan soalan dalam Bahasa Melayu'
                : 'Terjemahan soalan dalam Bahasa Arab',
            },
            translatedDiagram: {
              type: Type.STRING,
              description: 'Terjemahan teks rajah atau jadual jika ada, atau kosong jika tiada',
            },
            translatedOptions: {
              type: Type.ARRAY,
              description: 'Senarai 4 pilihan jawapan yang telah diterjemahkan',
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING, description: 'id pilihan: a, b, c, atau d' },
                  translatedText: { type: Type.STRING, description: 'Teks terjemahan pilihan jawapan' },
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
    notice: 'Terjemahan dijana melalui Glosari Pintar STAM (Mod Luar Talian).',
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
      isToMalay ? 'daripada Bahasa Arab ke Bahasa Melayu' : 'daripada Bahasa Melayu ke Bahasa Arab'
    }:

${options
  .map(
    (opt: any) =>
      `- [${opt.id}]: ${isToMalay ? opt.textArabic || opt.textMalay : opt.textMalay || opt.textArabic}`
  )
  .join('\n')}

Kekalkan istilah teknikal subjek STAM (Tauhid, Firaq, Mantiq).`;

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
      res.json({ ...parsedData, fallback: false });
      return;
    }
  } catch (error: any) {
    console.warn('[Translate /api/translate/options-batch] Gemini API unavailable or rate-limited. Activating STAM offline translator.');
  }

  // Graceful offline fallback
  const translatedOptions = options.map((opt: any) => {
    const text = isToMalay
      ? autoTranslateArabicOption(opt.textArabic || '') ||
        translateArabicToMalaySmart(opt.textArabic || '') ||
        opt.textArabic ||
        ''
      : translateMalayToArabicSmart(opt.textMalay || '') ||
        opt.textMalay ||
        '';
    return {
      id: opt.id,
      translatedText: text,
    };
  });

  res.json({
    translatedOptions,
    fallback: true,
    notice: 'Pilihan jawapan diterjemahkan menggunakan Glosari Pintar STAM.',
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
