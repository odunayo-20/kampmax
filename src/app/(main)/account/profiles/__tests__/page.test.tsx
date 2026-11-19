// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { ProfileId, ProfileState } from "@/hooks/use-my-profiles";

const auth = vi.hoisted(() => ({ status: "authenticated" }));
const query = vi.hoisted(() => ({
  data: undefined as Record<string, unknown> | undefined,
  isPending: false,
  isFetching: false,
  refetch: vi.fn(),
}));

vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ status: auth.status }) }));
vi.mock("@/hooks/use-my-profiles", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/hooks/use-my-profiles")>()),
  useMyProfiles: () => query,
}));

import AccountProfilesPage from "../page";

const states = (overrides: Partial<Record<ProfileId, ProfileState>> = {}) => ({
  vendor: { status: "none" },
  freelancer: { status: "none" },
  service: { status: "none" },
  employer: { status: "none" },
  agent: { status: "none" },
  ...overrides,
});

const renderPage = (data: ReturnType<typeof states> | undefined, flags: Partial<typeof query> = {}) => {
  auth.status = "authenticated";
  Object.assign(query, { data, isPending: false, isFetching: false, ...flags });
  return render(<AccountProfilesPage />);
};

afterEach(cleanup);

describe("AccountProfilesPage", () => {
  it("renders sign-in prompt when user is not authenticated", () => {
    auth.status = "unauthenticated";
    render(<AccountProfilesPage />);
    expect(screen.getByText("Sign in to view your profiles")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" })).toBeTruthy();
  });

  it("shows loading skeleton while pending", () => {
    renderPage(undefined, { isPending: true });
    expect(screen.getByRole("status", { name: "Loading profiles" })).toBeTruthy();
  });

  it("groups active profiles under Your Active Profiles", () => {
    renderPage(
      states({
        vendor: { status: "active", sub: "Mecbill Store" },
        freelancer: { status: "active", sub: "Full-Stack Dev" },
      })
    );

    expect(screen.getByText("2 active profiles")).toBeTruthy();
    expect(screen.getByText("Your Active Profiles")).toBeTruthy();
    expect(screen.getByText("Mecbill Store")).toBeTruthy();
    expect(screen.getByText("Full-Stack Dev")).toBeTruthy();
    expect(screen.getAllByRole("link", { name: /open dashboard/i })).toHaveLength(2);
  });

  it("shows error alert and retry button when profiles fail check", () => {
    renderPage(states({ service: { status: "error" } }));
    expect(screen.getByRole("alert")).toBeTruthy();
    expect(screen.getByRole("button", { name: /check again/i })).toBeTruthy();
  });

  it("shows available profiles under Start Something New when active exist", () => {
    renderPage(states({ vendor: { status: "active", sub: "Mecbill Store" } }));
    expect(screen.getByText("Start Something New")).toBeTruthy();
    expect(screen.getByRole("link", { name: /become a freelancer/i })).toBeTruthy();
  });
});

