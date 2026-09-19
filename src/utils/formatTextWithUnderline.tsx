import React from 'react';

/**
 * Parses and renders text supporting underlining for exam questions.
 * Supports:
 * 1. <u>perkataan</u> (standard HTML tag)
 * 2. [u]perkataan[/u] (BBCode / bracket style)
 * 3. __perkataan__ (Markdown double underscore)
 */
export function renderFormattedUnderlineText(
  text?: string,
  isArabic = false
): React.ReactNode {
  if (!text) return '';

  // Regex to match <u>...</u>, [u]...[/u], or __...__
  const pattern = /(<u\b[^>]*>[\s\S]*?<\/u>|\[u\][\s\S]*?\[\/u\]|(?<![\w\u0600-\u06FF])__([^\n_]+?)__(?![\w\u0600-\u06FF]))/gi;

  const parts = text.split(pattern);

  if (parts.length <= 1) {
    return text;
  }

  return parts.map((part, index) => {
    if (!part) return null;

    // Check if this part is <u>...</u>
    const uHtmlMatch = part.match(/^<u\b[^>]*>([\s\S]*?)<\/u>$/i);
    if (uHtmlMatch) {
      return (
        <span
          key={index}
          className={`underline decoration-2 decoration-amber-400 text-white font-extrabold ${
            isArabic
              ? 'decoration-[2.5px] underline-offset-[10px] px-0.5'
              : 'underline-offset-4 px-0.5'
          }`}
        >
          {uHtmlMatch[1]}
        </span>
      );
    }

    // Check if this part is [u]...[/u]
    const uBracketMatch = part.match(/^\[u\]([\s\S]*?)\[\/u\]$/i);
    if (uBracketMatch) {
      return (
        <span
          key={index}
          className={`underline decoration-2 decoration-amber-400 text-white font-extrabold ${
            isArabic
              ? 'decoration-[2.5px] underline-offset-[10px] px-0.5'
              : 'underline-offset-4 px-0.5'
          }`}
        >
          {uBracketMatch[1]}
        </span>
      );
    }

    // Check if this part is __...__
    const uUnderscoreMatch = part.match(/^__([^\n_]+?)__$/);
    if (uUnderscoreMatch) {
      return (
        <span
          key={index}
          className={`underline decoration-2 decoration-amber-400 text-white font-extrabold ${
            isArabic
              ? 'decoration-[2.5px] underline-offset-[10px] px-0.5'
              : 'underline-offset-4 px-0.5'
          }`}
        >
          {uUnderscoreMatch[1]}
        </span>
      );
    }

    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}
