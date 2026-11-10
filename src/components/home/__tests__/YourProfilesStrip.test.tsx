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

  it("lists held profiles first, linking to their dashboards, then the ones to set up", () => {
    show(states({ freelancer: { status: "active", sub: undefined }, vendor: { status: "active", sub: "Ada's Books" } }));

    const items = within(screen.getByRole("list")).getAllByRole("link");

    // Held (in their usual order), then not held.
    expect(items.map((a) => a.getAttribute("href"))).toEqual([
      "/vendor",
      "/freelancer/dashboard",
      "/onboarding/service-provider",
      "/onboarding/employer",
      "/onboarding/agent",
    ]);
    expect(screen.getByText("Ada's Books")).toBeTruthy();
    expect(screen.getByText("Become an Employer")).toBeTruthy();
  });

  it("leaves out a profile it couldn't check instead of guessing", () => {
    show(states({ freelancer: { status: "error" } }));

    expect(screen.queryByText(/freelancer/i)).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(5); // 4 profiles + the "Manage" link
  });

  it("links to the profiles page to manage them", () => {
    show(states());

    expect(screen.getByRole("link", { name: /manage/i }).getAttribute("href")).toBe("/account/profiles");
  });
});
