import { describe, expect, it } from "vitest";
import {
  MAX_WEEKLY_HOURS,
  formatMinutes,
  formatWorkDay,
  hourlyTerms,
  hoursWorth,
  loggableDays,
  minutesFromInputs,
  validateHourlyTerms,
  weeklyCap,
} from "../hourly";

describe("hoursWorth", () => {
  it("is the rate for each hour, and proportional for part of one", () => {
    expect(hoursWorth(3000, 60)).toBe(3000);
    expect(hoursWorth(3000, 90)).toBe(4500);
    expect(hoursWorth(3000, 1110)).toBe(55500);
  });

  it("rounds to the nearest kobo, exactly as the backend does", () => {
    expect(hoursWorth(1000, 1)).toBe(16.67);
    expect(hoursWorth(1000, 7)).toBe(116.67);
    expect(hoursWorth(100, 1)).toBe(1.67);
  });

  it("is nothing for no time", () => {
    expect(hoursWorth(3000, 0)).toBe(0);
  });
});

describe("weeklyCap", () => {
  it("is the rate times the weekly hours, without floating-point drift", () => {
    expect(weeklyCap(3000, 20)).toBe(60000);
    expect(weeklyCap(333.33, 3)).toBe(999.99);
    expect(weeklyCap(19.99, 7)).toBe(139.93);
  });
});

describe("formatMinutes", () => {
  it.each([
    [0, "0m"],
    [45, "45m"],
    [60, "1h"],
    [90, "1h 30m"],
    [1110, "18h 30m"],
  ])("writes %p minutes as %s", (minutes, text) => {
    expect(formatMinutes(minutes)).toBe(text);
  });
});

describe("hourlyTerms", () => {
  it("reads as rate and weekly limit", () => {
    expect(hourlyTerms(3000, 20)).toBe("₦3,000/hr · up to 20 h/week");
  });
});

describe("minutesFromInputs", () => {
  it("turns the hours and minutes boxes into whole minutes", () => {
    expect(minutesFromInputs("2", "30")).toBe(150);
    expect(minutesFromInputs("1", "")).toBe(60);
    expect(minutesFromInputs("", "45")).toBe(45);
    expect(minutesFromInputs("", "")).toBe(0);
  });

  it.each([
    ["1.5", "0"],
    ["1", "-5"],
    ["abc", "0"],
    ["1", "2.5"],
  ])("refuses %p hours and %p minutes", (h, m) => {
    expect(minutesFromInputs(h, m)).toBeNull();
  });
});

describe("validateHourlyTerms", () => {
  it("accepts a sensible rate and weekly limit", () => {
    expect(validateHourlyTerms("3000", "20")).toBeNull();
    expect(validateHourlyTerms("100", "1")).toBeNull();
    expect(validateHourlyTerms("1000000", String(MAX_WEEKLY_HOURS))).toBeNull();
  });

  it.each(["", "abc", "99", "1000001", "-5"])("refuses a rate of %p", (rate) => {
    expect(validateHourlyTerms(rate, "20")?.rate).toMatch(/Enter a rate from ₦100 to ₦1,000,000 an hour/);
  });

  it.each(["", "0", "2.5", "61", "many"])("refuses a weekly limit of %p", (hours) => {
    expect(validateHourlyTerms("3000", hours)?.hours).toMatch(/whole number of hours from 1 to 60/);
  });

  it("reports both problems at once", () => {
    const errors = validateHourlyTerms("", "");
    expect(errors?.rate).toBeTruthy();
    expect(errors?.hours).toBeTruthy();
  });
});

describe("formatWorkDay", () => {
  it("names the weekday, day and month, and never shifts the day", () => {
    expect(formatWorkDay("2026-11-04")).toMatch(/Wed.*4.*Nov|Wed.*Nov.*4/);
    expect(formatWorkDay("2026-12-01")).toMatch(/1/);
    expect(formatWorkDay("2026-12-31")).toMatch(/31/);
  });
});

describe("loggableDays", () => {
  it("lists the days from the day the week was funded up to today", () => {
    expect(loggableDays("2026-11-04", "2026-11-10", "2026-11-06")).toEqual(["2026-11-04", "2026-11-05", "2026-11-06"]);
  });

  it("never offers a day that has not happened yet", () => {
    expect(loggableDays("2026-11-04", "2026-11-10", "2026-11-04")).toEqual(["2026-11-04"]);
    expect(loggableDays("2026-11-04", "2026-11-10", "2026-11-03")).toEqual([]);
  });

  it("stops at the last day of the week even when today is later", () => {
    const days = loggableDays("2026-11-04", "2026-11-10", "2026-11-20");
    expect(days).toHaveLength(7);
    expect(days[6]).toBe("2026-11-10");
  });

  it("crosses a month and year boundary", () => {
    expect(loggableDays("2026-12-30", "2027-01-05", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});
