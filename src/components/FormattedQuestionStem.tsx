import React from 'react';
import { parseNumberedQuestion } from '../utils/sanitizeText';

interface FormattedQuestionStemProps {
  questionArabic?: string;
  questionMalay?: string;
  showArabic?: boolean;
  showMalay?: boolean;
  fontSizeClass?: string;
  className?: string;
}

const ARABIC_DIGITS = ['١', '٢', '٣', '٤', '٥', '٦'];

export const FormattedQuestionStem: React.FC<FormattedQuestionStemProps> = ({
  questionArabic = '',
  questionMalay = '',
  showArabic = true,
  showMalay = true,
  fontSizeClass = 'text-xl',
  className = '',
}) => {
  const parsedAr = parseNumberedQuestion(questionArabic, true);
  const parsedMy = parseNumberedQuestion(questionMalay, false);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Arabic Question Stem */}
      {showArabic && questionArabic && (
        <div>
          <div
            className={`font-arabic text-slate-100 font-bold leading-loose text-right dir-rtl ${
              parsedAr.items.length > 0 ? 'mb-2.5' : 'whitespace-pre-line'
            } ${fontSizeClass}`}
            dir="rtl"
          >
            {parsedAr.stem}
          </div>

          {/* If there are numbered statements 1, 2, 3, 4 (١، ٢، ٣، ٤) */}
          {parsedAr.items.length > 0 && (
            <div className="my-2.5 space-y-2 dir-rtl text-right font-arabic" dir="rtl">
              {parsedAr.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-slate-800/70 border border-slate-700/60 rounded-xl px-3.5 py-2.5 text-slate-100 shadow-sm"
                >
                  <span className="shrink-0 w-7 h-7 rounded-lg bg-teal-500/20 border border-teal-500/40 text-teal-300 font-bold text-sm flex items-center justify-center font-arabic">
                    {ARABIC_DIGITS[idx] || `${idx + 1}`}
                  </span>
                  <span className="text-base leading-relaxed pt-0.5 font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Malay Question Stem */}
      {showMalay && questionMalay && (
        <div className="pt-0.5">
          <p
            className={`text-xs text-slate-300 leading-relaxed font-medium ${
              parsedMy.items.length > 0 ? 'mb-2 font-semibold text-slate-200' : 'whitespace-pre-line'
            }`}
          >
            {parsedMy.stem}
          </p>

          {/* If there are numbered statements 1, 2, 3, 4 */}
          {parsedMy.items.length > 0 && (
            <div className="space-y-1.5 mb-1.5">
              {parsedMy.items.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-2.5 bg-slate-800/40 border border-slate-700/40 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                >
                  <span className="shrink-0 w-5 h-5 rounded-md bg-slate-700/80 text-emerald-400 font-bold text-[11px] flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed pt-0.5">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
