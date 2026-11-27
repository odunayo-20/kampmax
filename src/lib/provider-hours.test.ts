import { describe, expect, it } from "vitest";
import {
  ADVANCE_DAYS,
  ADVANCE_OPTIONS,
  checkNewSlot,
  describeHoursError,
  groupByDay,
  HOURS_PRESETS,
  normalizeTime,
  presetWindows,
  suggestWindow,
  timeLabel,
  timeOptions,
  weekSummary,
  withCurrentOption,
  type Slot,
} from "./provider-hours";

const slot = (id: string, dayOfWeek: number, startTime: string, endTime: string): Slot => ({ id, dayOfWeek, startTime, endTime });

describe("provider hours", () => {
  it("lays the week out Monday first, windows in time order", () => {
    const week = groupByDay([slot("b", 3, "14:00", "18:00"), slot("a", 3, "09:00", "12:00"), slot("c", 0, "10:00", "12:00")]);
    expect(week.map((d) => d.day.short)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
    expect(week[2].slots.map((s) => s.id)).toEqual(["a", "b"]);
    expect(week[0].slots).toEqual([]);
  });

  it("refuses a window that closes first or overlaps another, and allows a lunch break", () => {
    const existing = [slot("a", 3, "09:00", "12:00")];
    expect(checkNewSlot(existing, 3, "14:00", "18:00")).toEqual({ ok: true, startTime: "14:00", endTime: "18:00" });
    expect(checkNewSlot(existing, 3, "18:00", "09:00")).toEqual({ ok: false, error: "The closing time must be after the opening time." });
    expect(checkNewSlot(existing, 3, "11:00", "13:00")).toEqual({ ok: false, error: "That overlaps your 9:00 AM to 12:00 PM hours." });
    expect(checkNewSlot(existing, 3, "10:00", "11:00", "a").ok).toBe(true);
    expect(checkNewSlot(existing, 4, "10:00", "11:00").ok).toBe(true);
  });

  it("reads and shows times the way people say them", () => {
    expect(normalizeTime("9:00")).toBe("09:00");
    expect(normalizeTime("25:00")).toBeNull();
    expect(timeLabel("17:30")).toBe("5:30 PM");
    expect(timeLabel("00:00")).toBe("12:00 AM");
    expect(timeLabel("09:00:00")).toBe("9:00 AM");
    expect(timeOptions()[0]).toBe("05:00");
    expect(timeOptions(["04:45"])[0]).toBe("04:45");
  });

  it("starts from a preset without doubling up days, and suggests the next window", () => {
    expect(presetWindows(HOURS_PRESETS[0], [slot("a", 1, "09:00", "12:00")]).map((w) => w.dayOfWeek)).toEqual([2, 3, 4, 5]);
    expect(suggestWindow([])).toEqual({ start: "09:00", end: "17:00" });
    expect(suggestWindow([{ startTime: "09:00", endTime: "12:00" }])).toEqual({ start: "12:00", end: "14:00" });
    expect(suggestWindow([{ startTime: "09:00", endTime: "22:00" }])).toEqual({ start: "09:00", end: "17:00" });
  });

  it("sums the week", () => {
    expect(weekSummary([])).toBeNull();
    expect(weekSummary([slot("a", 1, "09:00", "17:00"), slot("b", 2, "09:00", "17:00")])).toBe("Open 2 days, about 16 hours a week");
  });

  it("shows a server reason only when it is a short refusal", () => {
    expect(describeHoursError("That overlaps your 09:00 to 12:00 hours.", 409)).toBe("That overlaps your 09:00 to 12:00 hours.");
    expect(describeHoursError("QueryFailedError", 500)).toMatch(/Couldn't save/);
    expect(describeHoursError("x".repeat(300), 400)).toMatch(/Couldn't save/);
  });

  it("keeps a saved booking rule that is not a quick pick, and offers nothing past the backend's limit", () => {
    expect(withCurrentOption(ADVANCE_OPTIONS, "45", "days").map((o) => o.value)).toEqual(["7", "14", "30", "45", "60", "90"]);
    expect(withCurrentOption(ADVANCE_OPTIONS, "30", "days")).toBe(ADVANCE_OPTIONS);
    expect(Math.max(...ADVANCE_OPTIONS.map((o) => Number(o.value)))).toBeLessThanOrEqual(ADVANCE_DAYS.max);
  });
});
