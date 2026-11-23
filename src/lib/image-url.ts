/**
 * The address to show a picture from. Pictures are served as uploaded (no resizing
 * service), so the size options are kept only so callers need no change.
 */
export function optimizedImageUrl(
  url: string | null | undefined,
  _options?: { width: number; aspect?: string }
): string | undefined {
  return url || undefined;
}
