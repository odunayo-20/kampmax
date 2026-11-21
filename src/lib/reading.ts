// ============================================================
// READING WHAT THE SERVER SENDS, AND WORDING HOW FAST SOMEONE REPLIES
// ============================================================
//
// Shared by the employer's hiring numbers and the accommodation agent's
// overview, which say the same kind of thing about how quickly people answer.

import { pluralize } from "@/lib/utils";

/** A count as a whole number, never negative, never NaN: whatever is not a number reads as zero. */
export const countOf = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/** A figure that may be missing: rounded, or null when it is missing, negative or not a number. */
export const maybeNumber = (v: unknown): number | null =>
  v === null || v === undefined || !Number.isFinite(Number(v)) || Number(v) < 0
    ? null
    : Math.round(Number(v));

/** "within an hour", "within 5 hours", "in about 2 days". */
export function replyTimeText(hours: number): string {
  if (hours <= 1) return "within an hour";
  if (hours < 24) return `within ${hours} hours`;
  return `in about ${pluralize(Math.round(hours / 24), "day")}`;
}

/** The short facts about how fast someone answers, strongest first. A fact with too few people behind it (null) is left out. */
export function replyFacts(rep: { typicalReplyHours: number | null; rate: number | null }): string[] {
  const out: string[] = [];
  if (rep.typicalReplyHours !== null) out.push(`Replies ${replyTimeText(rep.typicalReplyHours)}`);
  if (rep.rate !== null) out.push(`${rep.rate}% answered`);
  return out;
}
