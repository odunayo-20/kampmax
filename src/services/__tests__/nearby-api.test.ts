import { describe, expect, it } from "vitest";
import { buildNearbyQuery, datePresetRange, formatDistance, isSafeDetailPath, roundCoordinate } from "../nearby-api";

describe("formatDistance", () => {
  it.each([
    [250, "250 m away"],
    [850, "850 m away"],
    [1200, "1.2 km away"],
    [4800, "4.8 km away"],
    [3, "10 m away"],
  ])("%p → %s", (m, text) => expect(formatDistance(m)).toBe(text));
  it("returns nothing for invalid values", () => {
    expect(formatDistance(NaN)).toBe("");
    expect(formatDistance(-5)).toBe("");
  });
});

describe("buildNearbyQuery", () => {
  it("rounds the origin to ~11 m and includes filters", () => {
    const qs = new URLSearchParams(
      buildNearbyQuery({ latitude: 7.196612345, longitude: 5.586698765, radiusMeters: 2000, entityType: "VENDOR", q: "  bread " }),
    );
    expect(qs.get("latitude")).toBe("7.1966");
    expect(qs.get("longitude")).toBe("5.5867");
    expect(qs.get("radiusMeters")).toBe("2000");
    expect(qs.get("entityTypes")).toBe("VENDOR");
    expect(qs.get("q")).toBe("bread");
    expect(qs.get("page")).toBe("1");
  });
  it("omits empty filters and caps search length", () => {
    const qs = new URLSearchParams(buildNearbyQuery({ latitude: 1, longitude: 2, radiusMeters: 1000, q: "x".repeat(300) }));
    expect(qs.has("entityTypes")).toBe(false);
    expect(qs.has("categoryId")).toBe(false);
    expect(qs.has("campusId")).toBe(false);
    expect(qs.get("q")).toHaveLength(100);
  });
  it("includes category and campus scope when set", () => {
    const qs = new URLSearchParams(
      buildNearbyQuery({
        latitude: 1,
        longitude: 2,
        radiusMeters: 1000,
        categoryId: "cat-1",
        campusId: "campus-1",
        campusScope: "WITHIN",
      }),
    );
    expect(qs.get("categoryId")).toBe("cat-1");
    expect(qs.get("campusId")).toBe("campus-1");
    expect(qs.get("campusScope")).toBe("WITHIN");
  });
  it("omits campusScope without a campusId", () => {
    const qs = new URLSearchParams(buildNearbyQuery({ latitude: 1, longitude: 2, radiusMeters: 1000, campusScope: "WITHIN" }));
    expect(qs.has("campusId")).toBe(false);
    expect(qs.has("campusScope")).toBe(false);
  });
  it("includes a date range and a non-default sort", () => {
    const qs = new URLSearchParams(
      buildNearbyQuery({
        latitude: 1,
        longitude: 2,
        radiusMeters: 1000,
        dateFrom: "2025-06-01T00:00:00.000Z",
        dateTo: "2025-06-07T00:00:00.000Z",
        sort: "upcoming",
      }),
    );
    expect(qs.get("dateFrom")).toBe("2025-06-01T00:00:00.000Z");
    expect(qs.get("dateTo")).toBe("2025-06-07T00:00:00.000Z");
    expect(qs.get("sort")).toBe("upcoming");
  });
  it("omits sort when it's the default (nearest)", () => {
    const qs = new URLSearchParams(buildNearbyQuery({ latitude: 1, longitude: 2, radiusMeters: 1000, sort: "nearest" }));
    expect(qs.has("sort")).toBe(false);
  });
  it("roundCoordinate is stable", () => expect(roundCoordinate(1.23456789)).toBe(1.2346));
});

describe("datePresetRange", () => {
  // A fixed Wednesday so "week"/"weekend" math is deterministic.
  const WED = new Date(2025, 5, 4, 9, 0, 0); // Wed 4 Jun 2025, 09:00 local
  const SAT = new Date(2025, 5, 7, 15, 0, 0); // Sat 7 Jun 2025, 15:00 local
  const SUN = new Date(2025, 5, 8, 10, 0, 0); // Sun 8 Jun 2025, 10:00 local

  it("today: from now until the start of tomorrow", () => {
    const { dateFrom, dateTo } = datePresetRange("today", WED);
    expect(dateFrom).toBe(WED.toISOString());
    expect(new Date(dateTo).getTime() - new Date(new Date(2025, 5, 4).toISOString()).getTime()).toBe(86_400_000);
  });

  it("tomorrow: the full next calendar day", () => {
    const { dateFrom, dateTo } = datePresetRange("tomorrow", WED);
    expect(new Date(dateTo).getTime() - new Date(dateFrom).getTime()).toBe(86_400_000);
    expect(new Date(dateFrom).getTime()).toBeGreaterThan(WED.getTime());
  });

  it("week: from now, 7 days forward", () => {
    const { dateFrom, dateTo } = datePresetRange("week", WED);
    expect(dateFrom).toBe(WED.toISOString());
    expect(new Date(dateTo).getTime() - new Date(new Date(2025, 5, 4).toISOString()).getTime()).toBe(7 * 86_400_000);
  });

  it("weekend: the upcoming Saturday through Monday when asked on a weekday", () => {
    const { dateFrom, dateTo } = datePresetRange("weekend", WED);
    const from = new Date(dateFrom);
    const to = new Date(dateTo);
    expect(from.getDay()).toBe(6); // Saturday
    expect(to.getTime() - from.getTime()).toBe(2 * 86_400_000); // covers Sat + Sun
  });

  it("weekend: starts now when it's already Saturday", () => {
    const { dateFrom } = datePresetRange("weekend", SAT);
    expect(dateFrom).toBe(SAT.toISOString());
  });

  it("weekend: still covers the rest of the weekend on Sunday", () => {
    const { dateFrom, dateTo } = datePresetRange("weekend", SUN);
    expect(dateFrom).toBe(SUN.toISOString());
    expect(new Date(dateTo).getDay()).toBe(1); // Monday 00:00
  });
});

describe("isSafeDetailPath", () => {
  it("only accepts same-site paths", () => {
    expect(isSafeDetailPath("/store/x")).toBe(true);
    expect(isSafeDetailPath("//evil.com")).toBe(false);
    expect(isSafeDetailPath("https://evil.com")).toBe(false);
    expect(isSafeDetailPath("javascript:alert(1)")).toBe(false);
    expect(isSafeDetailPath(undefined)).toBe(false);
  });
});
