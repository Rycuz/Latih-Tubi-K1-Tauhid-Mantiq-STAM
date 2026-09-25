import React from 'react';
import { Bold, Underline } from 'lucide-react';

interface RichTextFormattingToolbarProps {
  value: string;
  onChange: (newValue: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  isArabic?: boolean;
  label?: string;
  compact?: boolean;
}

export const RichTextFormattingToolbar: React.FC<RichTextFormattingToolbarProps> = ({
  value,
  onChange,
  inputRef,
  isArabic = false,
  label,
  compact = false,
}) => {
  /**
   * Wraps selected text or inserts formatting tags at cursor position
   */
  const applyWrap = (prefix: string, suffix: string, placeholder = 'kata_kunci') => {
    const el = inputRef?.current;
    if (!el) {
      // Fallback: append
      onChange(value ? `${value} ${prefix}${placeholder}${suffix}` : `${prefix}${placeholder}${suffix}`);
      return;
    }

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.substring(start, end);

    let replacement = '';

    if (selected.length > 0) {
      replacement = `${prefix}${selected}${suffix}`;
    } else {
      replacement = `${prefix}${placeholder}${suffix}`;
    }

    const updated = value.substring(0, start) + replacement + value.substring(end);
    onChange(updated);

    // Restore focus and cursor position after state update
    setTimeout(() => {
      el.focus();
      try {
        if (selected.length > 0) {
          el.setSelectionRange(start, start + replacement.length);
        } else {
          el.setSelectionRange(start + prefix.length, start + prefix.length + placeholder.length);
        }
      } catch {
        // ignore
      }
    }, 50);
  };

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${compact ? 'py-0.5' : 'py-1'}`}>
      {label && (
        <span className="text-[11px] text-slate-400 font-semibold mr-1">
          {label}:
        </span>
      )}

      {/* 1. BOLD (TEBAL) */}
      <button
        type="button"
        onClick={() => applyWrap('<b>', '</b>', isArabic ? 'كلمة_مهمة' : 'kata_kunci')}
        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
        title="Tebalkan perkataan (Bold: <b>...</b> atau **...**)"
      >
        <Bold className="w-3.5 h-3.5 text-white" />
        <span className="text-[11px]">Tebal (Bold)</span>
      </button>

      {/* 2. WARNA MERAH (KATA KUNCI MERAH) */}
      <button
        type="button"
        onClick={() => applyWrap('<merah>', '</merah>', isArabic ? 'كلمة_حمراء' : 'kata_kunci')}
        className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 active:scale-95 text-rose-300 border border-rose-500/50 text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-sm"
        title="Jadikan perkataan berwarna merah: <merah>...</merah>"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm shadow-rose-500/50"></span>
        <span className="text-[11px] text-rose-200">Warna Merah</span>
      </button>

      {/* 3. UNDERLINE (GARIS BAWAH) */}
      <button
        type="button"
        onClick={() => applyWrap('<u>', '</u>', isArabic ? 'كلمة_مخطوطة' : 'perkataan')}
        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
        title="Garis bawahkan perkataan (<u>...</u>)"
      >
        <Underline className="w-3.5 h-3.5 text-amber-300" />
        <span className="text-[11px] hidden sm:inline">Garis</span>
      </button>

      {/* 4. QURAN BRACKETS (ARABIC ONLY) */}
      {isArabic && (
        <button
          type="button"
          onClick={() => applyWrap('﴿ ', ' ﴾', 'آية_قرآنية')}
          className="px-2 py-1 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 active:scale-95 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition-all shadow-sm"
          title="Sisip Kurungan Khas Ayat Al-Quran (﴿ ﴾)"
        >
          <span className="font-arabic text-sm">﴿ ﴾</span>
          <span className="text-[11px] hidden sm:inline">Quran</span>
        </button>
      )}
    </div>
  );
};
