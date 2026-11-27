import { describe, expect, it } from "vitest";
import type { AccommodationProperty } from "@/types/accommodation";
import {
  archiveBlocker,
  archivePropertyWarning,
  emptyProperty,
  emptyUnit,
  filterCampuses,
  formFromProperty,
  propertyPatch,
  propertyProblems,
  publicPlace,
  unitNameTaken,
  unitProblems,
  unitSummary,
} from "./agent-properties";

const property: AccommodationProperty = {
  id: "p", title: "Sunrise Lodge", description: null, categoryId: "c", categoryName: "Hostel", country: "NG", state: "Lagos", city: "Yaba",
  neighbourhood: "Akoka", address: "12 Church St", landmark: null, latitude: null, longitude: null, campusId: "u1",
  units: [{ id: "r1", propertyId: "p", unitName: "Room 1", unitType: "Single", bedrooms: 1, bathrooms: 1, occupancyCapacity: 1, furnishingStatus: "FURNISHED", availabilityStatus: "AVAILABLE" }],
  createdAt: "", updatedAt: "",
};

describe("properties and rooms", () => {
  it("shows students the area, never the street", () => {
    expect(publicPlace(property)).toBe("Akoka, Yaba, Lagos");
  });

  it("checks the forms and refuses a room name used twice", () => {
    expect(Object.keys(propertyProblems(emptyProperty())).sort()).toEqual(["address", "categoryId", "city", "state", "title"]);
    expect(unitProblems({ ...emptyUnit(), unitName: "Room 2", unitType: "Single", bedrooms: "2.5" })).toEqual({ bedrooms: "Enter 0 to 50." });
    expect(unitNameTaken(" room 1 ", property.units)).toBe(true);
    expect(unitNameTaken("Room 1", property.units, "r1")).toBe(false);
    expect(unitSummary({ bedrooms: 0, bathrooms: 1, furnishingStatus: "SEMI_FURNISHED" })).toBe("Studio · 1 bath · Partly furnished");
  });

  it("sends only what changed, and never removes a campus", () => {
    const f = formFromProperty(property);
    expect(propertyPatch(f, property)).toEqual({});
    expect(propertyPatch({ ...f, landmark: "Opposite the gate", campusId: "" }, property)).toEqual({ landmark: "Opposite the gate" });
    expect(propertyPatch({ ...f, pin: { latitude: 6.5, longitude: 3.4 } }, property)).toEqual({ latitude: 6.5, longitude: 3.4 });
  });

  it("blocks archiving while a listing is live or in review", () => {
    const listings = [{ propertyId: "p", unitId: "r1", moderationStatus: "APPROVED" }, { propertyId: "p", unitId: "r2", moderationStatus: "DRAFT" }];
    expect(archiveBlocker(listings, "p")).toMatch(/^This property has a listing that is live/);
    expect(archiveBlocker(listings, "p", "r2")).toBeNull();
    expect(archivePropertyWarning(3)).toBe("This also archives its 3 rooms. This cannot be undone.");
  });

  it("finds a campus by name or short name", () => {
    const list = [{ name: "University of Lagos", abbreviation: "UNILAG", location: "Akoka" }, { name: "Yaba College", abbreviation: "YABATECH", location: "Yaba" }];
    expect(filterCampuses(list, "unilag").map((c) => c.abbreviation)).toEqual(["UNILAG"]);
  });
});
