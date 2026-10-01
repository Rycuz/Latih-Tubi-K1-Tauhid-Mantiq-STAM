export interface TranslateQuestionFullParams {
  questionArabic?: string;
  questionMalay?: string;
  options: Array<{ id: string; textArabic?: string; textMalay?: string }>;
  explanationArabic?: string;
  explanationMalay?: string;
  diagramArabic?: string;
  targetLanguage?: 'ms' | 'ar';
}

export interface TranslateQuestionFullResult {
  translatedQuestion: string;
  translatedDiagram?: string;
  translatedOptions: Array<{ id: string; translatedText: string }>;
  translatedExplanation?: string;
}

export async function checkGeminiStatus(): Promise<{ available: boolean; model: string }> {
  try {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) return { available: false, model: 'gemini-3.8-flash' };
    const data = await res.json();
    return { available: Boolean(data.hasApiKey), model: data.model || 'gemini-3.8-flash' };
  } catch {
    return { available: false, model: 'gemini-3.8-flash' };
  }
}

/**
 * Translates a single text string using Gemini AI (no glossary fallback).
 */
export async function translateTextWithGemini(
  text: string,
  to: 'ms' | 'ar' = 'ms'
): Promise<{ success: boolean; translatedText?: string; error?: string }> {
  if (!text || !text.trim()) {
    return { success: false, error: 'Teks untuk diterjemahkan adalah kosong.' };
  }

  try {
    const res = await fetch('/api/translate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, to }),
    });

    const data = await res.json();
    if (res.ok && data && data.translatedText) {
      return { success: true, translatedText: data.translatedText };
    }
    return { success: false, error: data?.error || 'Gagal menterjemah teks dengan Gemini AI.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ralat sambungan ke pelayan terjemahan Gemini AI.' };
  }
}

/**
 * Translates a full question (stem, diagram, 4 options, explanation) using Gemini AI (no glossary fallback).
 */
export async function translateQuestionFullWithGemini(
  params: TranslateQuestionFullParams
): Promise<{ success: boolean; data?: TranslateQuestionFullResult; error?: string }> {
  try {
    const res = await fetch('/api/translate/question-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (res.ok && data && data.translatedQuestion) {
      return {
        success: true,
        data: {
          translatedQuestion: data.translatedQuestion,
          translatedDiagram: data.translatedDiagram,
          translatedOptions: data.translatedOptions || [],
          translatedExplanation: data.translatedExplanation,
        },
      };
    }
    return { success: false, error: data?.error || 'Gagal menterjemahkan soalan penuh dengan Gemini AI.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ralat sambungan ke pelayan terjemahan Gemini AI.' };
  }
}

/**
 * Translates an array of MCQ options using Gemini AI (no glossary fallback).
 */
export async function translateOptionsBatchWithGemini(
  options: Array<{ id: string; textArabic?: string; textMalay?: string }>,
  targetLanguage: 'ms' | 'ar' = 'ms'
): Promise<{ success: boolean; translatedOptions?: Array<{ id: string; translatedText: string }>; error?: string }> {
  try {
    const res = await fetch('/api/translate/options-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options, targetLanguage }),
    });

    const data = await res.json();
    if (res.ok && data && Array.isArray(data.translatedOptions)) {
      return { success: true, translatedOptions: data.translatedOptions };
    }
    return { success: false, error: data?.error || 'Gagal menterjemah pilihan jawapan dengan Gemini AI.' };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Ralat sambungan ke pelayan terjemahan Gemini AI.' };
  }
}
