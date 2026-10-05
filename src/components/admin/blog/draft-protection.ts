import { useEffect, useRef } from "react";
import type { ArticleFormState } from "./article-form";
import { isDirty } from "./article-form";

/** Local recovery copy of unsaved edits, so closing the tab or navigating away never loses work. */
export interface StoredDraft {
  form: ArticleFormState;
  savedAt: number;
  /** The article's `updatedAt` when editing started; null for a new article. */
  baseUpdatedAt: string | null;
}

export const LOCAL_SAVE_DELAY_MS = 1500;
export const AUTOSAVE_DELAY_MS = 20_000;
/** Recovery copies older than this are ignored and removed. */
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export const draftKey = (articleId?: string) => `kampmax_blog_draft:${articleId ?? "new"}`;

export function readDraft(key: string, now = Date.now()): StoredDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredDraft;
    if (!parsed?.form || typeof parsed.savedAt !== "number" || now - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, draft: StoredDraft): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* storage full or unavailable: recovery is best-effort */
  }
}

export function clearDraft(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

/**
 * A stored copy is offered for recovery only if it differs from what is saved
 * and was made against the same server version. If the article changed on the
 * server since, restoring could silently overwrite someone else's work.
 */
export function isRecoverable(
  stored: StoredDraft | null,
  baseline: ArticleFormState,
  currentUpdatedAt: string | null
): stored is StoredDraft {
  if (!stored) return false;
  if (stored.baseUpdatedAt !== currentUpdatedAt) return false;
  return isDirty(stored.form, baseline);
}

/** Debounced copy of the in-progress form into localStorage while it has unsaved changes. */
export function useLocalDraftWriter(opts: {
  key: string;
  form: ArticleFormState;
  dirty: boolean;
  baseUpdatedAt: string | null;
  enabled: boolean;
}) {
  const { key, form, dirty, baseUpdatedAt, enabled } = opts;
  useEffect(() => {
    if (!enabled || !dirty) return;
    const timer = setTimeout(() => writeDraft(key, { form, savedAt: Date.now(), baseUpdatedAt }), LOCAL_SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [key, form, dirty, baseUpdatedAt, enabled]);
}

/**
 * Calls `save` once the writer has paused for `delayMs`. The timer restarts on
 * every change, so a burst of typing produces a single request.
 */
export function useDebouncedAutosave(opts: {
  enabled: boolean;
  /** Changes whenever the content changes, restarting the timer. */
  signal: unknown;
  save: () => void;
  delayMs?: number;
}) {
  const { enabled, signal, delayMs = AUTOSAVE_DELAY_MS } = opts;
  const saveRef = useRef(opts.save);
  useEffect(() => {
    saveRef.current = opts.save;
  });
  useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(() => saveRef.current(), delayMs);
    return () => clearTimeout(timer);
  }, [enabled, signal, delayMs]);
}
