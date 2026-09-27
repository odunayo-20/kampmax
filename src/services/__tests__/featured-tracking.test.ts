import { describe, expect, it } from "vitest";
import { shouldTrackView } from "../featured-promotions";

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
};

describe("shouldTrackView", () => {
  it("counts a slot once per session", () => {
    const storage = memoryStorage();
    expect(shouldTrackView(storage, "f1")).toBe(true);
    expect(shouldTrackView(storage, "f1")).toBe(false);
    expect(shouldTrackView(storage, "f1")).toBe(false);
  });

  it("counts each slot separately", () => {
    const storage = memoryStorage();
    expect(shouldTrackView(storage, "f1")).toBe(true);
    expect(shouldTrackView(storage, "f2")).toBe(true);
  });

  it("counts every time when there is no storage", () => {
    expect(shouldTrackView(null, "f1")).toBe(true);
    expect(shouldTrackView(null, "f1")).toBe(true);
  });

  it("counts the view when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(shouldTrackView(broken, "f1")).toBe(true);
  });
});
