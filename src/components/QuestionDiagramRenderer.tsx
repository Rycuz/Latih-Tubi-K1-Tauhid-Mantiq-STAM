import React from 'react';
import { BookOpen, Table } from 'lucide-react';
import { cleanRepeatedText } from '../utils/sanitizeText';
import { ConceptTreeDiagram, parseTreeDiagram } from './ConceptTreeDiagram';
import { renderFormattedUnderlineText } from '../utils/formatTextWithUnderline';

interface QuestionDiagramRendererProps {
  diagramArabic?: string;
  diagramType?: 'tree' | 'table' | 'box' | 'none';
  reviewMode?: boolean;
  isAnswerSubmitted?: boolean;
  correctAnswer?: string;
  className?: string;
}

export const QuestionDiagramRenderer: React.FC<QuestionDiagramRendererProps> = ({
  diagramArabic,
  diagramType,
  reviewMode,
  isAnswerSubmitted,
  correctAnswer,
  className = '',
}) => {
  if (!diagramArabic || !diagramArabic.trim() || !diagramType || diagramType === 'none') return null;

  const cleanedDiag = cleanRepeatedText(diagramArabic);
  if (!cleanedDiag || !cleanedDiag.trim()) return null;

  // 1. Tree diagram
  if (diagramType === 'tree' || (diagramType !== 'table' && diagramType !== 'box' && parseTreeDiagram(cleanedDiag))) {
    return <ConceptTreeDiagram diagramText={cleanedDiag} className={className} />;
  }

  // 2. Table diagram
  if (diagramType === 'table') {
    const rawRows = cleanedDiag
      .split(/\n|\\n/)
      .map((r) => r.trim())
      .filter(Boolean);

    if (rawRows.length === 0) return null;

    const headerRow = rawRows[0].split('|').map((c) => c.trim());
    const bodyRows = rawRows.slice(1).map((r) => r.split('|').map((c) => c.trim()));

    return (
      <div className={`my-3 overflow-x-auto rounded-2xl border border-teal-500/30 bg-slate-900/90 shadow-md ${className}`}>
        <div className="px-4 py-2 bg-slate-800/80 border-b border-slate-700/60 flex items-center justify-between text-xs text-teal-400 font-sans">
          <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider">
            <Table className="w-3.5 h-3.5" />
            <span>جدول المقارنة / Jadual Perbandingan</span>
          </span>
        </div>
        <table className="w-full text-right dir-rtl font-arabic border-collapse" dir="rtl">
          <thead>
            <tr className="bg-teal-900/40 border-b border-teal-500/30 text-teal-200">
              <th className="p-3 text-xs font-bold text-center border-l border-teal-500/20 w-12 text-slate-400">
                الخيار
              </th>
              {headerRow.map((h, i) => (
                <th key={i} className="p-3 text-sm font-bold border-l border-teal-500/20 last:border-0 text-teal-200">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {bodyRows.map((rowCells, rIdx) => {
              const optLabels = ['(أ)', '(ب)', '(ج)', '(د)'];
              const isCorrectRow =
                reviewMode ||
                (isAnswerSubmitted && correctAnswer && rIdx === ['a', 'b', 'c', 'd'].indexOf(correctAnswer));
              return (
                <tr
                  key={rIdx}
                  className={`border-b border-slate-800/80 transition-colors ${
                    isCorrectRow
                      ? 'bg-emerald-950/40 font-bold text-emerald-300'
                      : rIdx % 2 === 0
                      ? 'bg-slate-900/50 text-slate-200'
                      : 'bg-slate-800/30 text-slate-200'
                  }`}
                >
                  <td className="p-2.5 text-xs text-center border-l border-slate-800 text-slate-400 font-sans">
                    {optLabels[rIdx] || `${rIdx + 1}`}
                  </td>
                  {rowCells.map((cell, cIdx) => (
                    <td key={cIdx} className="p-2.5 text-sm border-l border-slate-800/60 last:border-0 leading-relaxed">
                      {renderFormattedUnderlineText(cell, true)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // 3. Box statement
  if (diagramType === 'box') {
    return (
      <div className={`my-3 p-4 rounded-2xl bg-teal-950/30 border border-teal-500/40 text-right dir-rtl ${className}`} dir="rtl">
        <div className="text-xs font-semibold text-teal-400 mb-1 flex items-center justify-end gap-1.5 font-sans">
          <BookOpen className="w-3.5 h-3.5" />
          <span>نص البيان / السند:</span>
        </div>
        <p className="font-arabic text-base text-teal-100 leading-relaxed font-medium">
          {renderFormattedUnderlineText(cleanedDiag, true)}
        </p>
      </div>
    );
  }

  return null;
};
