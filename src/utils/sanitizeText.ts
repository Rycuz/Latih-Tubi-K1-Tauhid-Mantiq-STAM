/**
 * Utility to sanitize repeated strings or sentences in question stimuli/diagrams.
 * Prevents and eliminates duplicated phrases (e.g. text repeated 2x, 3x, 4x
 * with or without spacing), ensuring stimuli and statements remain crisp and clean.
 */

function cleanSingleString(s: string): string {
  if (!s || s.length < 6) return s;

  // 1. Check exact string multiplication (s = sub * n)
  for (let n = 8; n >= 2; n--) {
    if (s.length % n === 0) {
      const len = s.length / n;
      const sub = s.slice(0, len);
      if (sub.repeat(n) === s) {
        return cleanSingleString(sub);
      }
    }
  }

  // 2. Check whitespace-separated repeated chunks (e.g. "word ... word ...")
  for (let n = 8; n >= 2; n--) {
    const parts = s.split(/\s+/);
    if (parts.length >= n && parts.length % n === 0) {
      const chunkSize = parts.length / n;
      const firstChunk = parts.slice(0, chunkSize).join(' ');
      let allMatch = true;
      for (let i = 1; i < n; i++) {
        const nextChunk = parts.slice(i * chunkSize, (i + 1) * chunkSize).join(' ');
        if (nextChunk !== firstChunk) {
          allMatch = false;
          break;
        }
      }
      if (allMatch) {
        return cleanSingleString(firstChunk);
      }
    }
  }

  // 3. Repeated contiguous substrings of length >= 8
  const regex = /(.{8,}?)\1+/g;
  const replaced = s.replace(regex, '$1');
  if (replaced !== s && replaced.length >= 6) {
    return cleanSingleString(replaced);
  }

  return s;
}

export function cleanRepeatedText(text?: string): string {
  if (!text || typeof text !== 'string') return text || '';
  const trimmed = text.trim();
  if (trimmed.length < 6) return trimmed;

  // If it's a markdown table, clean each cell individually
  if (trimmed.includes('|')) {
    return trimmed
      .split(/\n|\\n/)
      .map((row) => {
        if (!row.includes('|')) return cleanSingleString(row.trim());
        return row
          .split('|')
          .map((cell) => cleanSingleString(cell.trim()))
          .join(' | ');
      })
      .join('\n');
  }

  // If there are multiple lines (e.g. \n or \\n)
  if (trimmed.includes('\n') || trimmed.includes('\\n')) {
    return trimmed
      .split(/\n|\\n/)
      .map((line) => cleanSingleString(line.trim()))
      .join('\n');
  }

  return cleanSingleString(trimmed);
}

export function sanitizeQuestion<T extends { diagramArabic?: string; questionArabic?: string; questionMalay?: string }>(q: T): T {
  return {
    ...q,
    diagramArabic: q.diagramArabic ? cleanRepeatedText(q.diagramArabic) : q.diagramArabic,
    questionArabic: q.questionArabic ? cleanRepeatedText(q.questionArabic) : q.questionArabic,
    questionMalay: q.questionMalay ? cleanRepeatedText(q.questionMalay) : q.questionMalay,
  };
}

export interface ParsedNumberedQuestion {
  stem: string;
  items: string[];
}

/**
 * Parses complex multiple choice questions where numbered statements 1, 2, 3, 4
 * (or ١, ٢, ٣, ٤) need to be arranged on separate distinct lines.
 */
export function parseNumberedQuestion(text?: string, isArabic = false): ParsedNumberedQuestion {
  if (!text || typeof text !== 'string') return { stem: text || '', items: [] };

  const clean = cleanRepeatedText(text);
  const normalized = clean.replace(/\\n/g, '\n').trim();

  // Pattern A: Split by newlines if lines start with numbers or bullets
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    const numRegex = /^([1-4١-٤][\.\)\-\s]|[\(（][1-4١-٤][\)）]|[1-4١-٤])/;
    const potentialItems = lines.slice(1);
    if (potentialItems.some((l) => numRegex.test(l))) {
      const stem = lines[0].replace(/\\+$/, '').trim();
      const items = potentialItems
        .map((l) =>
          l
            .replace(/^([1-4١-٤][\.\)\-\s]*|[\(（][1-4١-٤][\)）]\s*)/, '')
            .replace(/\\+$/, '')
            .trim()
        )
        .filter(Boolean);
      if (items.length >= 2) return { stem, items };
    }
  }

  // Pattern B: In-line Arabic numerals ١, ٢, ٣, ٤ (even without newlines)
  if (normalized.includes('١') && normalized.includes('٢')) {
    const splitRegex = /(?=[١-٤]\s*[\.\)\-]?)/;
    const parts = normalized.split(splitRegex);
    if (parts.length >= 3) {
      const stem = parts[0].replace(/\\+$/, '').trim();
      const items = parts
        .slice(1)
        .map((s) =>
          s
            .replace(/^[١-٤]\s*[\.\)\-]?\s*/, '')
            .replace(/\\+$/, '')
            .trim()
        )
        .filter(Boolean);
      if (items.length >= 2) {
        return { stem, items };
      }
    }
  }

  // Pattern C: In-line Western digits 1., 2., 3., 4. or 1), 2), 3), 4)
  if (
    (normalized.includes('1.') || normalized.includes('1)')) &&
    (normalized.includes('2.') || normalized.includes('2)'))
  ) {
    const splitRegex = /(?=[1-4][\.\)]\s*)/;
    const parts = normalized.split(splitRegex);
    if (parts.length >= 3) {
      const stem = parts[0].replace(/\\+$/, '').trim();
      const items = parts
        .slice(1)
        .map((s) =>
          s
            .replace(/^[1-4][\.\)]\s*/, '')
            .replace(/\\+$/, '')
            .trim()
        )
        .filter(Boolean);
      if (items.length >= 2) {
        return { stem, items };
      }
    }
  }

  return { stem: normalized, items: [] };
}

