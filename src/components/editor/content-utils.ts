/**
 * Pure helpers over the editor's HTML output. They mirror the checks the
 * backend runs before publishing, so authors see problems early; the backend
 * remains the authority.
 */

export const ALT_PLACEHOLDER = "Describe the image";

/** Number of images whose alt text is empty or still the placeholder. */
export function countImagesMissingAlt(html: string): number {
  let missing = 0;
  for (const tag of html.matchAll(/<img\b[^>]*>/gi)) {
    const alt = /\balt="([^"]*)"/i.exec(tag[0])?.[1].trim() ?? "";
    if (!alt || alt === ALT_PLACEHOLDER) missing++;
  }
  return missing;
}

/**
 * Heading-order problems: the article title is the page's H1, so the first
 * section heading should be an H2 and levels must not skip (H2 → H4).
 */
export function findHeadingIssues(html: string): string[] {
  return headingIssuesFromLevels([...html.matchAll(/<h([1-6])\b/gi)].map((m) => Number(m[1])));
}

/** Same check over heading levels in document order (used by the live editor). */
export function headingIssuesFromLevels(levels: number[]): string[] {
  const issues: string[] = [];
  if (levels.length && levels[0] > 2) issues.push("Start with a Heading 2");
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      issues.push(`Heading ${levels[i - 1]} is followed by Heading ${levels[i]}; don't skip a level`);
      break;
    }
  }
  return issues;
}

/** Words in plain text (e.g. a ProseMirror document's text content). */
export function countWordsInText(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Words in the visible text of HTML. */
export function countWords(html: string): number {
  const text = html
    .replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
  return text ? text.split(/\s+/).length : 0;
}

/** Accepts http(s), mailto, tel, site-relative paths and in-page anchors. */
export function normalizeLinkUrl(input: string): { url: string } | { error: string } {
  const raw = input.trim();
  if (!raw) return { error: "Enter a web address." };
  if (/^(javascript|data|vbscript|file):/i.test(raw)) return { error: "That kind of link isn't allowed." };
  if (/^(mailto:|tel:)/i.test(raw)) return { url: raw };
  if (raw.startsWith("/") || raw.startsWith("#")) return { url: raw };

  const withProtocol = /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withProtocol);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { error: "Links must start with http:// or https://." };
    }
    if (!url.hostname.includes(".") && url.hostname !== "localhost") {
      return { error: "That doesn't look like a valid web address." };
    }
    return { url: url.toString() };
  } catch {
    return { error: "That doesn't look like a valid web address." };
  }
}

export function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/** Image upload limits, matching the backend's blogCover category. */
export const IMAGE_UPLOAD_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const IMAGE_UPLOAD_MAX_BYTES = 10 * 1024 * 1024;

export function validateImageFile(file: File): string | null {
  if (!IMAGE_UPLOAD_TYPES.includes(file.type)) return "Use a JPG, PNG, WebP or GIF image.";
  if (file.size > IMAGE_UPLOAD_MAX_BYTES) return "That image is larger than 10 MB. Choose a smaller one.";
  return null;
}
