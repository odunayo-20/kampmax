/** Pure text transforms behind the editor toolbar. Each returns the new text and selection. */

export interface EditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

/** Wraps the selection (or a placeholder) with `before`/`after`; toggles off if already wrapped. */
export function wrapSelection(
  text: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder: string
): EditResult {
  const selected = text.slice(start, end);
  const alreadyWrapped =
    selected.length === 0 &&
    text.slice(Math.max(0, start - before.length), start) === before &&
    text.slice(end, end + after.length) === after;

  if (alreadyWrapped) {
    return {
      text: text.slice(0, start - before.length) + text.slice(end + after.length),
      selectionStart: start - before.length,
      selectionEnd: start - before.length,
    };
  }

  const inner = selected || placeholder;
  const next = text.slice(0, start) + before + inner + after + text.slice(end);
  return {
    text: next,
    selectionStart: start + before.length,
    selectionEnd: start + before.length + inner.length,
  };
}

/** Prefixes every line touched by the selection (e.g. "## ", "> ", "- "). `ordered` numbers them. */
export function prefixLines(
  text: string,
  start: number,
  end: number,
  prefix: string,
  ordered = false
): EditResult {
  const lineStart = text.lastIndexOf("\n", start - 1) + 1;
  const nextBreak = text.indexOf("\n", end);
  const lineEnd = nextBreak === -1 ? text.length : nextBreak;
  const block = text.slice(lineStart, lineEnd);
  const lines = block.split("\n");

  const allPrefixed = lines.every((line, i) =>
    line.startsWith(ordered ? `${i + 1}. ` : prefix)
  );
  const next = lines
    .map((line, i) => {
      const p = ordered ? `${i + 1}. ` : prefix;
      return allPrefixed ? line.slice(p.length) : p + line;
    })
    .join("\n");

  return {
    text: text.slice(0, lineStart) + next + text.slice(lineEnd),
    selectionStart: lineStart,
    selectionEnd: lineStart + next.length,
  };
}

/** Inserts a markdown link around the selection; selects the URL placeholder. */
export function insertLink(text: string, start: number, end: number, url = "https://"): EditResult {
  const label = text.slice(start, end) || "link text";
  const inserted = `[${label}](${url})`;
  const urlStart = start + label.length + 3;
  return {
    text: text.slice(0, start) + inserted + text.slice(end),
    selectionStart: urlStart,
    selectionEnd: urlStart + url.length,
  };
}

/** Inserts a block (image, callout) on its own lines. */
export function insertBlock(text: string, start: number, end: number, block: string): EditResult {
  const before = text.slice(0, start);
  const after = text.slice(end);
  const lead = before.length === 0 || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const trail = after.startsWith("\n\n") || after.length === 0 ? "" : after.startsWith("\n") ? "\n" : "\n\n";
  const inserted = lead + block + trail;
  const position = before.length + lead.length;
  return {
    text: before + inserted + after,
    selectionStart: position,
    selectionEnd: position + block.length,
  };
}

/** Placeholder alt text inserted by the Image button; mirrors the backend rule. */
export const ALT_PLACEHOLDER = "Describe the image";

/** Number of Markdown images whose alt text is empty or still the placeholder. */
export function countImagesMissingAlt(markdown: string): number {
  let missing = 0;
  for (const match of markdown.matchAll(/!\[([^\]]*)\]\(/g)) {
    const alt = match[1].trim();
    if (!alt || alt === ALT_PLACEHOLDER) missing++;
  }
  return missing;
}
