import React from 'react';

/**
 * Rich Text Parser and Renderer for STAM Exam Questions.
 * Exclusively supports:
 * 1. Bold: <b>text</b>, <strong>text</strong>, **text**
 * 2. Warna Merah: <merah>text</merah>, <red>text</red>, <color name="merah">text</color>, <mark>text</mark>
 * 3. Underline: <u>text</u>, [u]text[/u], __text__
 * 4. Quranic brackets: ﴿ayat﴾
 * 
 * Supports nesting (e.g. <b><merah>kata kunci</merah></b> or <merah><b>kata kunci</b></merah>).
 */
export function renderFormattedUnderlineText(
  text?: string,
  isArabic = false,
  depth = 0
): React.ReactNode {
  if (!text) return '';
  if (depth > 6) return text; // Prevent infinite recursion

  // Pattern matching: underline, bold, red tags, and quranic brackets
  const tagPattern = /(<u\b[^>]*>[\s\S]*?<\/u>|\[u\][\s\S]*?\[\/u\]|(?<![\w\u0600-\u06FF])__([^\n_]+?)__(?![\w\u0600-\u06FF])|<b\b[^>]*>[\s\S]*?<\/b>|<strong\b[^>]*>[\s\S]*?<\/strong>|(?<![\w\u0600-\u06FF])\*\*([^\n*]+?)\*\*(?![\w\u0600-\u06FF])|<merah\b[^>]*>[\s\S]*?<\/merah>|<red\b[^>]*>[\s\S]*?<\/red>|<mark\b[^>]*>[\s\S]*?<\/mark>|<color\b[^>]*name=["']?(?:merah|red|rose)["']?[^>]*>[\s\S]*?<\/color>|﴿[^﴾]+?﴾)/gi;

  const parts = text.split(tagPattern);

  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (!part) return null;

    // 1. UNDERLINE: <u>...</u>, [u]...[/u], __...__
    const uHtmlMatch = part.match(/^<u\b[^>]*>([\s\S]*?)<\/u>$/i);
    const uBracketMatch = part.match(/^\[u\]([\s\S]*?)\[\/u\]$/i);
    const uUnderscoreMatch = part.match(/^__([^\n_]+?)__$/);

    if (uHtmlMatch || uBracketMatch || uUnderscoreMatch) {
      const inner = uHtmlMatch?.[1] ?? uBracketMatch?.[1] ?? uUnderscoreMatch?.[1] ?? '';
      return (
        <span
          key={`u-${index}`}
          className={`underline decoration-2 decoration-amber-400 text-white font-extrabold ${
            isArabic
              ? 'decoration-[2.5px] underline-offset-[10px] px-0.5'
              : 'underline-offset-4 px-0.5'
          }`}
        >
          {renderFormattedUnderlineText(inner, isArabic, depth + 1)}
        </span>
      );
    }

    // 2. BOLD: <b>...</b>, <strong>...</strong>, **...**
    const bHtmlMatch = part.match(/^<(?:b|strong)\b[^>]*>([\s\S]*?)<\/(?:b|strong)>$/i);
    const bAsteriskMatch = part.match(/^\*\*([^\n*]+?)\*\*$/);

    if (bHtmlMatch || bAsteriskMatch) {
      const inner = bHtmlMatch?.[1] ?? bAsteriskMatch?.[1] ?? '';
      return (
        <strong
          key={`b-${index}`}
          className={`font-black tracking-wide text-white ${
            isArabic ? 'font-bold text-amber-100 drop-shadow-sm' : 'font-extrabold text-white'
          }`}
        >
          {renderFormattedUnderlineText(inner, isArabic, depth + 1)}
        </strong>
      );
    }

    // 3. WARNA MERAH (KATA KUNCI MERAH): <merah>...</merah>, <red>...</red>, <mark>...</mark>, <color name="merah">...</color>
    const redMatch = part.match(/^<(?:merah|red|mark|color)\b[^>]*>([\s\S]*?)<\/(?:merah|red|mark|color)>$/i);
    if (redMatch) {
      const inner = redMatch[1] ?? '';
      return (
        <span
          key={`red-${index}`}
          className={`font-black text-rose-400 drop-shadow-sm px-0.5 ${
            isArabic ? 'font-arabic text-rose-300' : 'text-rose-400'
          }`}
        >
          {renderFormattedUnderlineText(inner, isArabic, depth + 1)}
        </span>
      );
    }

    // 4. QURANIC BRACKETS: ﴿...﴾
    const quranMatch = part.match(/^﴿([\s\S]*?)﴾$/);
    if (quranMatch) {
      return (
        <span
          key={`quran-${index}`}
          className="font-arabic text-emerald-300 font-bold px-1 inline-block drop-shadow-sm tracking-wide"
          dir="rtl"
        >
          ﴿{renderFormattedUnderlineText(quranMatch[1], true, depth + 1)}﴾
        </span>
      );
    }

    return <React.Fragment key={`plain-${index}`}>{part}</React.Fragment>;
  });
}
