import { describe, expect, it } from "vitest";
import {
  addDays,
  bookingsPerDay,
  busiestDay,
  chartDays,
  compactNaira,
  completionRate,
  earningsNote,
  periodWindow,
  rangeOf,
  statusPercentage,
  statusRows,
  toEarnings,
  topServices,
  type AnalyticsBooking,
} from "./provider-analytics";

const b = (id: string, serviceId: string, status: string, agreedPrice: number, createdAt = "2026-11-20T10:00:00Z"): AnalyticsBooking => ({
  id, serviceId, status, agreedPrice, createdAt,
});

describe("provider analytics", () => {
  it("works out each period's days in Lagos time", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(periodWindow("7d", "2026-11-26")).toEqual({ start: "2026-11-20", end: "2026-11-26" });
    expect(periodWindow("30d", "2026-11-26")).toEqual({ start: "2026-10-28", end: "2026-11-26" });
    expect(periodWindow("month", "2026-11-26")).toEqual({ start: "2026-11-01", end: "2026-11-26" });
    expect(periodWindow("last_month", "2026-11-26")).toEqual({ start: "2026-10-01", end: "2026-10-31" });
    expect(rangeOf("last_month")).toBe("lastMonth");
    expect(chartDays({ start: "2026-11-01", end: "2026-11-26" }, 3)).toEqual(["2026-11-24", "2026-11-25", "2026-11-26"]);
  });

  it("counts bookings made on each day, and names the busiest", () => {
    const bookings = [b("1", "s", "PENDING", 0), b("2", "s", "COMPLETED", 0), b("3", "s", "COMPLETED", 0, "2026-11-21T10:00:00Z")];
    const points = bookingsPerDay(bookings, ["2026-11-19", "2026-11-20", "2026-11-21"]);
    expect(points.map((p) => p.count)).toEqual([0, 2, 1]);
    expect(busiestDay(points)).toBe("Busiest day: Fri 20 Nov, 2 bookings.");
    expect(busiestDay(bookingsPerDay([], ["2026-11-20"]))).toBeNull();
  });

  it("ranks services by what completed jobs brought in, and ignores jobs that did not finish", () => {
    const titles = new Map([["a", "Braids"], ["b", "Laundry"]]);
    const rows = topServices(
      [b("1", "a", "COMPLETED", 5000), b("2", "a", "COMPLETED", 3000), b("3", "b", "COMPLETED", 9000), b("4", "b", "PENDING", 99999), b("5", "gone", "COMPLETED", 100)],
      titles
    );
    expect(rows).toEqual([
      { id: "b", title: "Laundry", jobs: 1, revenue: 9000 },
      { id: "a", title: "Braids", jobs: 2, revenue: 8000 },
      { id: "gone", title: "A service you removed", jobs: 1, revenue: 100 },
    ]);
  });

  it("names the statuses with bookings, and gives each its share", () => {
    expect(statusRows([{ status: "PENDING", count: 1 }, { status: "COMPLETED", count: 3 }, { status: "CANCELLED", count: 0 }])).toEqual([
      { status: "COMPLETED", label: "Completed", count: 3 },
      { status: "PENDING", label: "Waiting for you", count: 1 },
    ]);
    expect(statusPercentage(1, 4)).toBe(25);
    expect(statusPercentage(1, 0)).toBe(0);
  });

  it("rates how many ended bookings finished, and reads earnings as net of the fee", () => {
    expect(completionRate([])).toBe(100);
    expect(completionRate([b("1", "s", "COMPLETED", 0), b("2", "s", "CANCELLED", 0), b("3", "s", "PENDING", 0)])).toBe(50);
    expect(toEarnings({ earnings: 10000, platformFees: 1000, netEarnings: 9000 })).toEqual({ gross: 10000, fees: 1000, net: 9000 });
    expect(toEarnings({ earnings: 10000, platformFees: 1000 }).net).toBe(9000);
    expect(toEarnings(undefined)).toEqual({ gross: 0, fees: 0, net: 0 });
    expect(earningsNote({ gross: 10000, fees: 1000, net: 9000 })).toMatch(/₦10,000 paid by customers, minus ₦1,000 Kampmax fee/);
    expect(earningsNote({ gross: 0, fees: 0, net: 0 })).toMatch(/after the Kampmax fee/);
    expect(compactNaira(1500)).toBe("₦1.5k");
    expect(compactNaira(2_000_000)).toBe("₦2m");
  });
});
