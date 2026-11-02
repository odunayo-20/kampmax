import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS, filtersFromParams, paramsFromFilters, sameFilters } from "../marketplace-url";

const read = (query: string, campus = "") => filtersFromParams(new URLSearchParams(query), campus);
const write = (filters: Partial<typeof DEFAULT_FILTERS>, campus = "") =>
  paramsFromFilters({ ...DEFAULT_FILTERS, campusId: campus, ...filters }, campus).toString();

describe("filtersFromParams", () => {
  it("is the defaults for a bare address, on the visitor's own campus", () => {
    expect(read("", "c1")).toEqual({ ...DEFAULT_FILTERS, campusId: "c1" });
  });

  it("reads every filter, tolerating the old spellings", () => {
    expect(read("search=logo&category=k1&vendor=v1&condition=USED&minPrice=500&maxPrice=9000&sort=price_low")).toEqual({
      search: "logo",
      categoryId: "k1",
      vendorId: "v1",
      campusId: "",
      condition: "Used",
      minPrice: "500",
      maxPrice: "9000",
      sort: "price_low",
    });
  });

  it("ignores a sort or condition it doesn't know", () => {
    expect(read("sort=popular&condition=broken")).toMatchObject({ sort: "recent", condition: "" });
  });

  it("tells 'every campus' from 'my campus'", () => {
    expect(read("campus=all", "c1").campusId).toBe("");
    expect(read("campus=c2", "c1").campusId).toBe("c2");
    expect(read("", "c1").campusId).toBe("c1");
  });
});

describe("paramsFromFilters", () => {
  it("writes nothing when nothing differs from the defaults", () => {
    expect(write({})).toBe("");
    expect(write({}, "c1")).toBe("");
  });

  it("writes only what differs, in a fixed order", () => {
    expect(write({ sort: "price_high", search: " logo ", categoryId: "k1", minPrice: "500" })).toBe(
      "q=logo&category=k1&minPrice=500&sort=price_high"
    );
  });

  it("writes the campus only when it isn't the visitor's own", () => {
    expect(write({ campusId: "c1" }, "c1")).toBe("");
    expect(write({ campusId: "c2" }, "c1")).toBe("campus=c2");
    expect(write({ campusId: "" }, "c1")).toBe("campus=all");
  });

  it("round-trips: what is written reads back the same", () => {
    const filters = { ...DEFAULT_FILTERS, search: "desk", categoryId: "k1", condition: "New" as const, maxPrice: "20000", campusId: "" };

    expect(read(paramsFromFilters(filters, "c1").toString(), "c1")).toEqual(filters);
  });
});

describe("sameFilters", () => {
  it("compares every filter", () => {
    expect(sameFilters(DEFAULT_FILTERS, { ...DEFAULT_FILTERS })).toBe(true);
    expect(sameFilters(DEFAULT_FILTERS, { ...DEFAULT_FILTERS, minPrice: "1" })).toBe(false);
  });
});
