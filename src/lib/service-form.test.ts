import { describe, expect, it } from "vitest";
import {
  CATEGORY_REQUIRED, describeServiceSaveError, durationText, LOCATION_OPTIONS, makeSlug, parseDuration, parsePrice, PRICING_OPTIONS,
  validateServiceForm,
} from "./service-form";

const good = { name: "Room cleaning", description: "A full clean of your room.", categoryId: "c1", pricingModel: "fixed", price: "5,000", duration: "60" };

describe("service form", () => {
  it("accepts a complete form and names every problem otherwise", () => {
    expect(validateServiceForm(good)).toEqual({});
    const e = validateServiceForm({ ...good, name: "a", description: "short", categoryId: "", price: "", duration: "0" });
    expect(Object.keys(e).sort()).toEqual(["category", "description", "duration", "name", "price"]);
    expect(e.category).toBe(CATEGORY_REQUIRED);
  });

  it("needs a price unless the service is negotiable", () => {
    expect(parsePrice("", "quote")).toEqual({ value: 0 });
    expect(parsePrice("₦1,500.50", "fixed")).toEqual({ value: 1500.5 });
    expect("error" in parsePrice("", "fixed")).toBe(true);
    expect("error" in parsePrice("0", "hourly")).toBe(true);
    expect("error" in parsePrice("12.345", "fixed")).toBe(true);
  });

  it("takes whole minutes up to a day and says them in words", () => {
    expect(parseDuration("90")).toEqual({ value: 90 });
    expect("error" in parseDuration("")).toBe(true);
    expect("error" in parseDuration("1441")).toBe(true);
    expect(durationText(90)).toBe("1 hr 30 min");
    expect(durationText(45)).toBe("45 min");
  });

  it("offers only the prices and places the backend has", () => {
    expect(PRICING_OPTIONS.map((o) => o.label)).toEqual(["Fixed price", "Starting from", "Per hour", "Negotiable"]);
    expect(LOCATION_OPTIONS.map((o) => o.label)).toEqual(["On campus", "Off campus", "Remote"]);
  });

  it("makes a slug from the name with a short tail, the same for the same random draw", () => {
    expect(makeSlug("Ada's Room Cleaning!", () => 0.5)).toMatch(/^adas-room-cleaning-[0-9a-z]{4}$/);
    expect(makeSlug("Ada", () => 0.25)).toBe(makeSlug("Ada", () => 0.25));
    expect(makeSlug("!!!", () => 0)).toBe("service-0000");
  });

  it("shows a server reason only for a rule it enforces", () => {
    expect(describeServiceSaveError("That link is already taken.", 409)).toBe("That link is already taken.");
    expect(describeServiceSaveError("title must be longer than or equal to 2 characters", 400)).toMatch(/Couldn't save the service/);
    expect(describeServiceSaveError("boom", 500)).toMatch(/Check the details/);
  });
});
