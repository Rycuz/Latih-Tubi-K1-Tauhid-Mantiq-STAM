import React, { useState, useEffect } from 'react';
import { 
  X, 
  ArrowUp, 
  ArrowDown, 
  ChevronsUp, 
  ChevronsDown, 
  Save, 
  RotateCcw, 
  ListOrdered,
  CheckCircle2
} from 'lucide-react';
import { Question, TopicInfo } from '../types';
import { soundEffects } from '../utils/audio';

interface TopicQuestionsReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: TopicInfo | undefined;
  topicQuestions: Question[];
  onSaveReordered: (orderedQuestionIds: string[]) => void;
}

export const TopicQuestionsReorderModal: React.FC<TopicQuestionsReorderModalProps> = ({
  isOpen,
  onClose,
  topic,
  topicQuestions,
  onSaveReordered,
}) => {
  const [items, setItems] = useState<Question[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync state whenever modal opens or questions update
  useEffect(() => {
    if (isOpen) {
      setItems([...topicQuestions]);
      setHasChanges(false);
    }
  }, [isOpen, topicQuestions]);

  if (!isOpen || !topic) return null;

  const handleMove = (index: number, direction: 'up' | 'down') => {
    soundEffects.playClick();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === items.length - 1) return;

    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...items];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;

    setItems(copy);
    setHasChanges(true);
  };

  const handleMoveToExtreme = (index: number, extreme: 'top' | 'bottom') => {
    soundEffects.playClick();
    if (extreme === 'top' && index === 0) return;
    if (extreme === 'bottom' && index === items.length - 1) return;

    const copy = [...items];
    const [removed] = copy.splice(index, 1);
    if (extreme === 'top') {
      copy.unshift(removed);
    } else {
      copy.push(removed);
    }

    setItems(copy);
    setHasChanges(true);
  };

  const handleJumpToPosition = (index: number, targetPos1Based: number) => {
    soundEffects.playClick();
    const targetIdx = Math.max(0, Math.min(targetPos1Based - 1, items.length - 1));
    if (index === targetIdx) return;

    const copy = [...items];
    const [removed] = copy.splice(index, 1);
    copy.splice(targetIdx, 0, removed);

    setItems(copy);
    setHasChanges(true);
  };

  const handleReset = () => {
    soundEffects.playClick();
    setItems([...topicQuestions]);
    setHasChanges(false);
  };

  const handleSave = () => {
    soundEffects.playCorrect();
    onSaveReordered(items.map((q) => q.id));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/90 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 shrink-0">
              <ListOrdered className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2 flex-wrap">
                <span>Susun Kedudukan Soalan</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-teal-950 border border-teal-500/30 text-teal-300 font-semibold">
                  {topic.titleMalay}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Jumlah {items.length} soalan. Gunakan butang anak panah atau tukar nombor untuk ubah urutan.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {items.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              Tiada soalan dalam tajuk ini untuk disusun.
            </div>
          ) : (
            items.map((q, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === items.length - 1;

              return (
                <div
                  key={q.id}
                  className="bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-teal-500/50 rounded-2xl p-3 sm:p-3.5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  {/* Position number & Content */}
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="flex flex-col items-center justify-center shrink-0">
                      <span className="w-8 h-8 rounded-xl bg-teal-950 border border-teal-500/40 text-teal-300 font-black text-xs flex items-center justify-center shadow-inner">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Arabic Question Preview */}
                      <div className="font-arabic text-right text-slate-100 font-medium text-sm line-clamp-2 leading-relaxed" dir="rtl">
                        {q.questionArabic}
                      </div>
                      {/* Malay Question Preview */}
                      {q.questionMalay && (
                        <div className="text-xs text-slate-400 mt-1 line-clamp-1 italic">
                          {q.questionMalay}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ordering Controls */}
                  <div className="flex items-center justify-end gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-700/50">
                    {/* Quick jump dropdown */}
                    <div className="flex items-center gap-1 mr-1">
                      <span className="text-[10px] text-slate-400 hidden sm:inline">No:</span>
                      <select
                        value={idx + 1}
                        onChange={(e) => handleJumpToPosition(idx, Number(e.target.value))}
                        className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[11px] font-bold text-teal-300 focus:outline-none focus:border-teal-500 cursor-pointer"
                        title="Pindah terus ke kedudukan nombor pilihan"
                      >
                        {items.map((_, i) => (
                          <option key={i + 1} value={i + 1}>
                            #{i + 1}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Move to Top */}
                    <button
                      type="button"
                      onClick={() => handleMoveToExtreme(idx, 'top')}
                      disabled={isFirst}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-teal-300 hover:border-teal-500/40 disabled:opacity-25 disabled:hover:text-slate-300 disabled:hover:border-slate-700 transition-colors"
                      title="Pindah ke paling atas (Permulaan Topik)"
                    >
                      <ChevronsUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Up 1 */}
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'up')}
                      disabled={isFirst}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-teal-300 hover:border-teal-500/40 disabled:opacity-25 disabled:hover:text-slate-300 disabled:hover:border-slate-700 transition-colors"
                      title="Naik 1 kedudukan (▲)"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>

                    {/* Move Down 1 */}
                    <button
                      type="button"
                      onClick={() => handleMove(idx, 'down')}
                      disabled={isLast}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-teal-300 hover:border-teal-500/40 disabled:opacity-25 disabled:hover:text-slate-300 disabled:hover:border-slate-700 transition-colors"
                      title="Turun 1 kedudukan (▼)"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>

                    {/* Move to Bottom */}
                    <button
                      type="button"
                      onClick={() => handleMoveToExtreme(idx, 'bottom')}
                      disabled={isLast}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 hover:text-teal-300 hover:border-teal-500/40 disabled:opacity-25 disabled:hover:text-slate-300 disabled:hover:border-slate-700 transition-colors"
                      title="Pindah ke paling bawah (Penghujung Topik)"
                    >
                      <ChevronsDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-40 disabled:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Kembalikan Urutan Asal</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-teal-900/30 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Susunan Baharu</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
