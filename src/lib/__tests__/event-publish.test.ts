import { describe, expect, it } from "vitest";
import {
  actionError,
  classifyEventError,
  findLikelyDuplicate,
  parsePrice,
  validateEventDraft,
  validateEventEdit,
  validateTierDraft,
  type EventDraft,
} from "../event-publish";

const now = new Date("2026-11-25T12:00:00");
const draft: EventDraft = {
  title: " Tech  Summit ",
  description: "",
  location: "Main Auditorium",
  categoryId: "",
  startsAt: "2026-12-15T18:00",
  endsAt: "",
  capacity: "",
  tiers: [{ name: "General admission", description: "", price: "0", quantity: "100" }],
};

describe("validateEventDraft", () => {
  it("builds the request from a good draft", () => {
    const result = validateEventDraft(draft, "campus-1", now);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.title).toBe("Tech Summit");
    expect(result.value.tiers).toEqual([{ name: "General admission", price: 0, quantity: 100 }]);
    expect(result.value).not.toHaveProperty("endsAt");
  });

  it("names every problem", () => {
    const result = validateEventDraft(
      {
        ...draft,
        title: "ab",
        location: "",
        startsAt: "2026-11-01T10:00",
        tiers: [
          { name: "VIP", description: "", price: "2000000", quantity: "0" },
          { name: "vip", description: "", price: "abc", quantity: "5" },
        ],
      },
      null,
      now
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.campus).toBeDefined();
    expect(result.errors.title).toBeDefined();
    expect(result.errors.location).toBeDefined();
    expect(result.errors.startsAt).toContain("already passed");
    expect(result.errors.tier?.[0]?.price).toBeDefined();
    expect(result.errors.tier?.[0]?.quantity).toBeDefined();
    expect(result.errors.tier?.[1]?.name).toContain("same name");
  });

  it("refuses an end before the start and tickets beyond the capacity", () => {
    const result = validateEventDraft({ ...draft, endsAt: "2026-12-15T17:00", capacity: "50" }, "c", now);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.endsAt).toBeDefined();
    expect(result.errors.capacity).toContain("more than the capacity");
  });
});

describe("parsePrice", () => {
  it.each([
    ["", 0],
    ["1,500", 1500],
    ["₦1500.50", 1500.5],
    ["1.234", null],
    ["-5", null],
  ])("%j -> %j", (input, expected) => {
    expect(parsePrice(input)).toBe(expected);
  });
});

describe("classifyEventError", () => {
  it("treats no answer or a server fault as unclear", () => {
    expect(classifyEventError({ code: "NETWORK_ERROR" }).kind).toBe("unclear");
    expect(classifyEventError({ status: 502 }).kind).toBe("unclear");
  });
  it("passes on a short refusal from the server", () => {
    expect(classifyEventError({ status: 400, message: "Bad venue" })).toEqual({ kind: "refused", message: "Bad venue" });
  });
});

describe("findLikelyDuplicate", () => {
  const mine = [{ id: "e1", title: "Tech Summit", startsAt: "2026-12-15T17:00:30.000Z" }];
  it("matches the same name within a minute", () => {
    expect(findLikelyDuplicate(mine, { title: "tech  summit", startsAt: "2026-12-15T17:00:00.000Z" })?.id).toBe("e1");
  });
  it("ignores a different time", () => {
    expect(findLikelyDuplicate(mine, { title: "Tech Summit", startsAt: "2026-12-16T17:00:00.000Z" })).toBeNull();
  });
});

describe("editing an event", () => {
  const saved = {
    title: "Tech Summit",
    description: "",
    location: "Main Auditorium",
    categoryId: "cat-1",
    startsAt: "2026-12-15T18:00",
    endsAt: "2026-12-15T21:00",
    capacity: "100",
    coverImageUrl: "",
    ticketsSold: 40,
  };

  it("sends nothing when nothing changed", () => {
    expect(validateEventEdit(saved, saved, now)).toEqual({ ok: true, patch: {} });
  });

  it("sends the end along with a moved start", () => {
    const result = validateEventEdit(saved, { ...saved, startsAt: "2026-12-15T17:00" }, now);
    expect(result.ok && Object.keys(result.patch).sort()).toEqual(["endsAt", "startsAt"]);
  });

  it("lets a started event keep its start while the venue is fixed", () => {
    const later = new Date("2026-12-15T19:00");
    const result = validateEventEdit(saved, { ...saved, location: "Hall B" }, later);
    expect(result.ok && result.patch).toEqual({ location: "Hall B" });
  });

  it("refuses removing a category or capacity, or dropping capacity below sales", () => {
    const removed = validateEventEdit(saved, { ...saved, categoryId: "", capacity: "" }, now);
    expect(!removed.ok && removed.errors.categoryId && removed.errors.capacity).toBeTruthy();
    const low = validateEventEdit(saved, { ...saved, capacity: "10" }, now);
    expect(!low.ok && low.errors.capacity).toContain("40");
  });

  it("keeps a ticket quantity at or above what is sold", () => {
    const result = validateTierDraft({ name: "VIP", description: "", price: "100", quantity: "3" }, { sold: 5 });
    expect(!result.ok && result.errors.quantity).toContain("already sold");
  });

  it("shows a server refusal but hides anything else", () => {
    expect(actionError({ status: 409, message: "Revenue was already released" }, "x")).toBe("Revenue was already released");
    expect(actionError({ status: 500, message: "stack trace" }, "Try again.")).toBe("Try again.");
  });
});
