import { describe, expect, it } from "vitest";
import { canPerform } from "../permissions";

describe("canPerform(categories:manage)", () => {
  it("allows SUPER_ADMIN and ADMIN, mirroring the backend taxonomy.manage grant", () => {
    expect(canPerform("SUPER_ADMIN", "categories", "manage")).toBe(true);
    expect(canPerform("ADMIN", "categories", "manage")).toBe(true);
  });

  it("denies campus-scoped admins", () => {
    expect(canPerform("CAMPUS_ADMIN", "categories", "manage")).toBe(false);
  });

  it("keeps the permissive default for actions it does not know about", () => {
    expect(canPerform("CAMPUS_ADMIN", "orders", "view")).toBe(true);
  });
});
