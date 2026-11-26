import { describe, expect, it } from "vitest";
import { menuSections } from "../more-menu";

const items = (...args: Parameters<typeof menuSections>) => menuSections(...args).flatMap((s) => s.items);

describe("menuSections", () => {
  it("shows a guest discovery and help only", () => {
    const sections = menuSections(false, undefined);
    expect(sections.map((s) => s.id)).toEqual(["discover", "account"]);
    expect(sections[1].items.map((i) => i.id)).toEqual(["support"]);
  });

  it("turns a held profile into its dashboard and keeps setup for a missing one", () => {
    const list = items(true, { vendor: { status: "active", sub: "Ada Stores" }, service: { status: "none" } });
    expect(list.find((i) => i.id === "become-vendor")).toMatchObject({ label: "Store dashboard", href: "/vendor", description: "Ada Stores" });
    expect(list.find((i) => i.id === "become-provider")?.href).toBe("/onboarding/service-provider");
  });

  it("shows no earn row it couldn't check", () => {
    const list = items(true, { freelancer: { status: "error" } });
    expect(list.some((i) => i.id === "become-freelancer")).toBe(false);
    expect(list.some((i) => i.id === "profiles")).toBe(true);
  });

  it("no longer lists the courses placeholder", () => {
    expect(items(true, undefined).some((i) => i.id === "courses")).toBe(false);
  });
});
