import { beforeEach, describe, expect, it } from "vitest";
import { getVisitorId, resetVisitorIdForTests } from "../featured-promotions";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

const memoryStorage = (initial: Record<string, string> = {}) => {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
};

beforeEach(() => resetVisitorIdForTests());

describe("getVisitorId", () => {
  it("makes an id once and keeps it", () => {
    const storage = memoryStorage();
    const first = getVisitorId(storage, () => UUID_A);
    const second = getVisitorId(storage, () => UUID_B);
    expect(first).toBe(UUID_A);
    expect(second).toBe(UUID_A);
    expect(storage.data.get("kampmax-visitor")).toBe(UUID_A);
  });

  it("reuses an id already saved in the browser", () => {
    const storage = memoryStorage({ "kampmax-visitor": UUID_B });
    expect(getVisitorId(storage, () => UUID_A)).toBe(UUID_B);
  });

  it("replaces a saved value that is not a valid id", () => {
    const storage = memoryStorage({ "kampmax-visitor": "not-a-uuid" });
    expect(getVisitorId(storage, () => UUID_A)).toBe(UUID_A);
    expect(storage.data.get("kampmax-visitor")).toBe(UUID_A);
  });

  it("keeps one id for the page when there is no storage", () => {
    const first = getVisitorId(null, () => UUID_A);
    const second = getVisitorId(null, () => UUID_B);
    expect(first).toBe(UUID_A);
    expect(second).toBe(UUID_A);
  });

  it("still returns an id when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(getVisitorId(broken, () => UUID_A)).toBe(UUID_A);
  });
});
