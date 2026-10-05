// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { EMPTY_FORM } from "../article-form";
import {
  AUTOSAVE_DELAY_MS,
  LOCAL_SAVE_DELAY_MS,
  clearDraft,
  draftKey,
  isRecoverable,
  readDraft,
  useDebouncedAutosave,
  useLocalDraftWriter,
  writeDraft,
} from "../draft-protection";

const form = { ...EMPTY_FORM, title: "Edited title" };

/** Plain in-memory Storage, so the tests do not depend on the runtime's localStorage. */
function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (k) => (data.has(k) ? (data.get(k) as string) : null),
    key: (i) => [...data.keys()][i] ?? null,
    removeItem: (k) => void data.delete(k),
    setItem: (k, v) => void data.set(k, String(v)),
  };
}

beforeEach(() => {
  Object.defineProperty(window, "localStorage", { value: memoryStorage(), configurable: true });
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("local draft storage", () => {
  it("round-trips a draft and clears it", () => {
    const key = draftKey("abc");
    writeDraft(key, { form, savedAt: Date.now(), baseUpdatedAt: "2026-01-01T00:00:00.000Z" });
    expect(readDraft(key)?.form.title).toBe("Edited title");
    clearDraft(key);
    expect(readDraft(key)).toBeNull();
  });

  it("keeps new-article drafts separate from saved articles", () => {
    expect(draftKey()).not.toBe(draftKey("abc"));
  });

  it("ignores and removes corrupt or expired entries", () => {
    const key = draftKey("x");
    window.localStorage.setItem(key, "{not json");
    expect(readDraft(key)).toBeNull();
    writeDraft(key, { form, savedAt: Date.now() - 15 * 24 * 3600 * 1000, baseUpdatedAt: null });
    expect(readDraft(key)).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();
  });

  it("survives storage being unavailable", () => {
    const spy = vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota");
    });
    expect(() => writeDraft("k", { form, savedAt: 1, baseUpdatedAt: null })).not.toThrow();
    spy.mockRestore();
  });
});

describe("isRecoverable", () => {
  const base = { ...EMPTY_FORM, title: "Saved title" };
  const stored = (over = {}) => ({ form, savedAt: Date.now(), baseUpdatedAt: "v1", ...over });

  it("offers recovery of different content made on the same server version", () => {
    expect(isRecoverable(stored(), base, "v1")).toBe(true);
  });
  it("does not offer content identical to what is saved", () => {
    expect(isRecoverable(stored({ form: base }), base, "v1")).toBe(false);
  });
  it("does not offer a draft made against an older server version (could overwrite newer edits)", () => {
    expect(isRecoverable(stored({ baseUpdatedAt: "v0" }), base, "v1")).toBe(false);
  });
  it("handles nothing stored", () => {
    expect(isRecoverable(null, base, "v1")).toBe(false);
  });
});

describe("useLocalDraftWriter", () => {
  it("writes once after typing pauses, and only while there are unsaved changes", () => {
    const key = draftKey("a");
    const { rerender } = renderHook((p) => useLocalDraftWriter(p), {
      initialProps: { key, form, dirty: false, baseUpdatedAt: "v1", enabled: true },
    });
    act(() => void vi.advanceTimersByTime(LOCAL_SAVE_DELAY_MS * 2));
    expect(readDraft(key)).toBeNull();

    rerender({ key, form: { ...form, title: "a" }, dirty: true, baseUpdatedAt: "v1", enabled: true });
    rerender({ key, form: { ...form, title: "ab" }, dirty: true, baseUpdatedAt: "v1", enabled: true });
    act(() => void vi.advanceTimersByTime(LOCAL_SAVE_DELAY_MS - 1));
    expect(readDraft(key)).toBeNull();
    act(() => void vi.advanceTimersByTime(2));
    expect(readDraft(key)?.form.title).toBe("ab");
  });

  it("does nothing when disabled", () => {
    const key = draftKey("b");
    renderHook(() => useLocalDraftWriter({ key, form, dirty: true, baseUpdatedAt: null, enabled: false }));
    act(() => void vi.advanceTimersByTime(LOCAL_SAVE_DELAY_MS * 2));
    expect(readDraft(key)).toBeNull();
  });
});

describe("useDebouncedAutosave", () => {
  it("fires once after the writer pauses, not on every keystroke", () => {
    const save = vi.fn();
    const { rerender } = renderHook((p) => useDebouncedAutosave(p), {
      initialProps: { enabled: true, signal: "a", save },
    });
    for (const signal of ["ab", "abc", "abcd"]) {
      act(() => void vi.advanceTimersByTime(5000));
      rerender({ enabled: true, signal, save });
    }
    expect(save).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("never fires while disabled (e.g. for live articles or invalid forms)", () => {
    const save = vi.fn();
    renderHook(() => useDebouncedAutosave({ enabled: false, signal: "x", save }));
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS * 3));
    expect(save).not.toHaveBeenCalled();
  });

  it("cancels a pending save when disabled before it fires", () => {
    const save = vi.fn();
    const { rerender } = renderHook((p) => useDebouncedAutosave(p), { initialProps: { enabled: true, signal: "a", save } });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 100));
    rerender({ enabled: false, signal: "a", save });
    act(() => void vi.advanceTimersByTime(1000));
    expect(save).not.toHaveBeenCalled();
  });
});
