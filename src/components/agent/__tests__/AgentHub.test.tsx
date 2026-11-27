// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readAgentOverview, type AgentOverview } from "@/services/accommodation-overview";

const state = vi.hoisted(() => ({ data: undefined as AgentOverview | undefined, mutate: vi.fn() }));
vi.mock("@/hooks/use-accommodation", () => ({
  useAccommodationAgentOverview: () => ({ data: state.data }),
  useConfirmAccommodationAvailability: () => ({ isPending: false, isError: false, error: null, mutate: state.mutate }),
}));

import { AccommodationAgentOverview } from "../AccommodationAgentOverview";

afterEach(() => {
  cleanup();
  state.mutate.mockReset();
});

describe("the agent's today card", () => {
  it("lets the agent answer for each room that needs confirming", () => {
    state.data = readAgentOverview({
      needsConfirming: { count: 1, hideBy: "2026-11-25T00:00:00Z", listings: [{ id: "l1", title: "Room A" }] },
    });
    render(<AccommodationAgentOverview />);

    expect(screen.getByText("1 room needs confirming")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "It is taken" }));
    expect(state.mutate).toHaveBeenCalledWith({ id: "l1", availabilityStatus: "OCCUPIED" });
  });

  it("points an expiring listing at billing to renew it", () => {
    state.data = readAgentOverview({
      nextRenewal: { listingId: "l1", title: "Room A", expiresAt: "2026-12-01T00:00:00Z", amount: 2000, autoRenew: false },
    });
    render(<AccommodationAgentOverview />);

    expect(screen.getByText(/Next expiry/)).toBeTruthy();
    expect(screen.getByText(/₦2,000/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Renew" }).getAttribute("href")).toBe("/agent/billing");
  });

  it("says so when there is nothing to do", () => {
    state.data = readAgentOverview({});
    render(<AccommodationAgentOverview />);

    expect(screen.getByText(/Nothing to confirm today/)).toBeTruthy();
  });
});
