import { describe, expect, it } from "vitest";
import { ADMIN_NAV_GROUPS, breadcrumbLabel, getNavForRole, isDetailSegment } from "../navigation";
import { canSeeSection } from "../permissions";

const UUID = "5205c7a4-d1c7-4fb4-ad2e-285fe6bab6d8";

describe("accommodation in the admin navigation", () => {
  const group = ADMIN_NAV_GROUPS.find((g) => g.id === "accommodation");

  it("has its own group with agents first, because applications gate everything else", () => {
    expect(group?.label).toBe("Accommodation");
    expect(group?.items.map((i) => i.href)).toEqual([
      "/admin/accommodation/agents",
      "/admin/accommodation/listings",
      "/admin/accommodation/payments",
    ]);
  });

  it("gives every nav item in the whole sidebar a unique key", () => {
    const keys = ADMIN_NAV_GROUPS.flatMap((g) => g.items.map((i) => i.key));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("shows the group to Super Admins and Admins", () => {
    for (const role of ["SUPER_ADMIN", "ADMIN"] as const) {
      const ids = getNavForRole(role).map((g) => g.id);
      expect(ids).toContain("accommodation");
    }
  });

  it("keeps campus admins out: they are scoped to their own campus data", () => {
    expect(getNavForRole("CAMPUS_ADMIN").map((g) => g.id)).not.toContain("accommodation");
    expect(canSeeSection("CAMPUS_ADMIN", "accommodationAgents")).toBe(false);
    expect(canSeeSection("CAMPUS_ADMIN", "accommodationListings")).toBe(false);
  });
});

describe("breadcrumbs on the accommodation detail pages", () => {
  it("names the section and the list", () => {
    expect(breadcrumbLabel("accommodation", 1)).toBe("Accommodation");
    expect(breadcrumbLabel("agents", 2)).toBe("Agents");
    expect(breadcrumbLabel("listings", 2)).toBe("Listings");
  });

  it("shortens an id to its first block instead of printing a 36-character UUID", () => {
    expect(breadcrumbLabel(UUID, 3)).toBe("5205C7A4");
  });

  it("treats a UUID as a record id, and ordinary words as not", () => {
    expect(isDetailSegment(UUID)).toBe(true);
    expect(isDetailSegment("agents")).toBe(false);
    expect(isDetailSegment("campus-places")).toBe(false);
  });

  it("still handles the older id formats", () => {
    expect(breadcrumbLabel("KMP-2437", 2)).toBe("KMP-2437");
    expect(isDetailSegment("KMP-2437")).toBe(true);
  });
});
