/** Rules for writing a community post, matching the mobile app. */

import type { PostKind } from "@/services/posts-api";

export const POST_MAX = 5000;
export const MAX_PHOTOS = 4;
export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 6;
export const POLL_OPTION_MAX = 100;
export const POLL_DAYS = [1, 3, 7, 14];
export const LOST_FOUND_FIELD_MAX = 200;

export interface PostDraft {
  kind: PostKind;
  text: string;
  photoCount: number;
  pollOptions: string[];
  lostItem: string;
  lostLocation: string;
}

/** Poll answers with blanks removed. */
export function cleanOptions(options: string[]): string[] {
  return options.map((o) => o.trim()).filter(Boolean);
}

/** Why this draft can't be posted yet, in plain words, or null when it can. */
export function draftProblem(draft: PostDraft, { hasCampus }: { hasCampus: boolean }): string | null {
  const text = draft.text.trim();
  if (text.length > POST_MAX) return `Posts can be up to ${POST_MAX.toLocaleString("en-NG")} characters.`;
  switch (draft.kind) {
    case "POST":
      return text || draft.photoCount > 0 ? null : "Write something or add a photo.";
    case "POLL": {
      if (!text) return "Ask your question first.";
      const options = cleanOptions(draft.pollOptions);
      if (options.length < MIN_POLL_OPTIONS) return "Add at least two answers.";
      if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) return "Each answer must be different.";
      return null;
    }
    case "LOST_FOUND":
      if (!draft.lostItem.trim()) return "Say what the item is.";
      if (!draft.lostLocation.trim()) return "Say where it was lost or found.";
      return null;
    case "ANNOUNCEMENT":
      if (!text) return "Write the announcement.";
      return hasCampus ? null : "Choose your campus first.";
  }
}
