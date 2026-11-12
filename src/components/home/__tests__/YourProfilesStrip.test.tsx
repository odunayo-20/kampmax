// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import type { ProfileId, ProfileState } from "@/hooks/use-my-profiles";

const auth = vi.hoisted(() => ({ status: "authenticated" }));
const query = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isPending: false,
  isError: false,
}));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ status: auth.status }) }));
vi.mock("@/hooks/use-my-profiles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-my-profiles")>()),
  useMyProfiles: () => query,
}));

import { YourProfilesStrip } from "../YourProfilesStrip";

const states = (overrides: Partial<Record<ProfileId, ProfileState>> = {}) => ({
  vendor: { status: "none" },
  freelancer: { status: "none" },
  service: { status: "none" },
  employer: { status: "none" },
  agent: { status: "none" },
  ...overrides,
});

const show = (data: ReturnType<typeof states> | undefined, flags: Partial<typeof query> = {}) => {
  auth.status = "authenticated";
  Object.assign(query, { data, isPending: false, isError: false, ...flags });
  return render(<YourProfilesStrip />);
};

afterEach(cleanup);

describe("YourProfilesStrip", () => {
  it("shows nothing to a guest, and no endless loading placeholder either", () => {
    auth.status = "unauthenticated";
    Object.assign(query, { data: undefined, isPending: true, isError: false });

    const { container } = render(<YourProfilesStrip />);

    expect(container.innerHTML).toBe("");
  });

  it("shows a placeholder while a signed-in user's profiles load", () => {
    show(undefined, { isPending: true });

    expect(screen.getByRole("status", { name: "Loading your profiles" })).toBeTruthy();
  });

  it("lists held profiles, then ONE entry for everything not set up yet", () => {
    show(states({ freelancer: { status: "active", sub: undefined }, vendor: { status: "active", sub: "Ada's Books" } }));

    const items = within(screen.getByRole("list")).getAllByRole("link");

    expect(items.map((a) => a.getAttribute("href"))).toEqual([
      "/vendor",
      "/freelancer/dashboard",
      "/account/earn", // one door, not three onboarding links
    ]);
    expect(screen.getByText("Ada's Books")).toBeTruthy();
    expect(screen.getByText("Earn or hire")).toBeTruthy();
    expect(screen.queryByText("Become an Employer")).toBeNull();
  });

  it("offers only the single earn entry to someone with no profiles", () => {
    show(states());

    const items = within(screen.getByRole("list")).getAllByRole("link");
    expect(items.map((a) => a.getAttribute("href"))).toEqual(["/account/earn"]);
  });

  it("drops the earn entry once every profile is held", () => {
    const all = { status: "active" } as const;
    show(states({ vendor: all, freelancer: all, service: all, employer: all, agent: all }));

    const hrefs = within(screen.getByRole("list")).getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(hrefs).not.toContain("/account/earn");
    expect(hrefs).toHaveLength(5);
  });

  it("leaves out a profile it couldn't check instead of guessing", () => {
    show(states({ freelancer: { status: "error" } }));

    expect(screen.queryByText(/freelancer/i)).toBeNull();
  });

  it("links to the profiles page to manage them", () => {
    show(states());

    expect(screen.getByRole("link", { name: /manage/i }).getAttribute("href")).toBe("/account/profiles");
  });
});
