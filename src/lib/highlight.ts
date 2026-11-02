export interface TextPart {
  text: string;
  /** True for the pieces that match the search. */
  match: boolean;
}

/** A one-letter word matches nearly everything, which highlights nothing useful. */
const MIN_WORD = 2;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Splits `text` into the pieces that match a word of `query` and the pieces that don't, so
 * a result can show why it matched. Case-insensitive; each word of the query is matched on
 * its own, so "logo design" lights up both words wherever they are. Returns plain data (no
 * HTML), which React escapes when it renders.
 */
export function highlightParts(text: string, query: string): TextPart[] {
  const words = [...new Set(query.toLowerCase().split(/\s+/).filter((w) => w.length >= MIN_WORD))];
  if (!text || words.length === 0) return text ? [{ text, match: false }] : [];

  // Longest first, so "design" wins over "des" where both would match.
  const pattern = new RegExp(`(${words.sort((a, b) => b.length - a.length).map(escapeRegExp).join("|")})`, "gi");

  // With one capture group, split puts the matches at the odd positions.
  return text
    .split(pattern)
    .map((piece, i) => ({ text: piece, match: i % 2 === 1 }))
    .filter((part) => part.text !== "");
}
