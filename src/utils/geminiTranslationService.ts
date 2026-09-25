import { 
  autoTranslateArabicOption, 
  autoTranslateArabicQuestion,
  translateArabicToMalaySmart,
  translateMalayToArabicSmart,
  translateQuestionFullOffline
} from './bilingualTranslator';

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

export async function translateTextWithGemini(
  text: string,
  to: 'ms' | 'ar' = 'ms'
): Promise<{ success: boolean; translatedText?: string; error?: string; usedFallback?: boolean }> {
  if (!text || !text.trim()) {
    return { success: false, error: 'Teks kosong.' };
  }

  const isToMalay = to !== 'ar';

  try {
    const res = await fetch('/api/translate/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, to }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.translatedText) {
        return { success: true, translatedText: data.translatedText, usedFallback: Boolean(data.fallback) };
      }
    }
  } catch {
    // Proceed to client offline fallback
  }

  // Graceful offline STAM fallback
  const fallbackText = isToMalay
    ? translateArabicToMalaySmart(text) || autoTranslateArabicOption(text) || autoTranslateArabicQuestion(text)
    : translateMalayToArabicSmart(text);

  return { success: true, translatedText: fallbackText || text, usedFallback: true };
}

export async function translateQuestionFullWithGemini(
  params: TranslateQuestionFullParams
): Promise<{ success: boolean; data?: TranslateQuestionFullResult; error?: string; fallback?: boolean; notice?: string }> {
  try {
    const res = await fetch('/api/translate/question-full', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.translatedQuestion) {
        return {
          success: true,
          data: {
            translatedQuestion: data.translatedQuestion,
            translatedDiagram: data.translatedDiagram,
            translatedOptions: data.translatedOptions || [],
            translatedExplanation: data.translatedExplanation,
          },
          fallback: data.fallback,
          notice: data.notice,
        };
      }
    }
  } catch {
    // Proceed to client offline fallback
  }

  // Resilient offline fallback guarantee
  const offlineData = translateQuestionFullOffline(params);
  return {
    success: true,
    data: offlineData,
    fallback: true,
    notice: 'Terjemahan dijana melalui Glosari Pintar STAM (Mod Sandaran).',
  };
}

export async function translateOptionsBatchWithGemini(
  options: Array<{ id: string; textArabic?: string; textMalay?: string }>,
  targetLanguage: 'ms' | 'ar' = 'ms'
): Promise<{ success: boolean; translatedOptions?: Array<{ id: string; translatedText: string }>; error?: string; fallback?: boolean }> {
  const isToMalay = targetLanguage !== 'ar';

  try {
    const res = await fetch('/api/translate/options-batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ options, targetLanguage }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.translatedOptions)) {
        return { success: true, translatedOptions: data.translatedOptions, fallback: data.fallback };
      }
    }
  } catch {
    // Proceed to client offline fallback
  }

  // Resilient offline fallback guarantee
  const translatedOptions = options.map((opt) => {
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

  return { success: true, translatedOptions, fallback: true };
}
