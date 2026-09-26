import { communityCampusOptions } from "@/data/admin/community";

// ------------------------------------------------------------
// Shared helpers for the /admin/campus section components
// ------------------------------------------------------------

/**
 * campusId -> short label. Seeded with the mock campuses (still used by the
 * support/disputes consoles) and extended with the real campuses once the
 * campus console has loaded them.
 */
const CAMPUS_LABELS = new Map(
  communityCampusOptions().map((c) => [c.id, c.shortName])
);

export function registerCommunityCampuses(
  campuses: { id: string; shortName: string }[]
): void {
  for (const c of campuses) CAMPUS_LABELS.set(c.id, c.shortName);
}

/** "futa" -> "FUTA"; falls back to the raw id for unknown campuses. */
export function communityCampusName(campusId: string): string {
  if (!campusId) return "No campus";
  return CAMPUS_LABELS.get(campusId) ?? campusId;
}

/** First N chars of post/comment content with ellipsis. */
export function previewText(content: string, max = 90): string {
  if (content.length <= max) return content;
  return `${content.slice(0, max).trimEnd()}…`;
}
