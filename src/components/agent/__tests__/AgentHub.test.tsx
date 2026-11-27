// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { readAgentOverview, type AgentOverview } from "@/services/accommodation-overview";

const state = vi.hoisted(() => ({ data: undefined as AgentOverview | undefined, mutate: vi.fn() }));
vi.mock("@/hooks/use-accommodation", () => ({
  useAccommodationAgentOverview: () => ({ data: state.data, isError: false }),
  useConfirmAccommodationAvailability: () => ({ isPending: false, isError: false, error: null, mutate: state.mutate }),
  useAccommodationEnquiries: () => ({ data: { items: [] }, isPending: false, isError: false, error: null }),
}));

import { AgentHub } from "../AgentHub";

afterEach(() => {
  cleanup();
  state.mutate.mockReset();
});

describe("the agent hub", () => {
  it("lets the agent answer for each room that needs confirming", () => {
    state.data = readAgentOverview({
      needsConfirming: { count: 1, hideBy: "2026-11-25T00:00:00Z", listings: [{ id: "l1", title: "Room A" }] },
    });
    render(<AgentHub />);

    expect(screen.getByText("1 room to confirm")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "It is taken" }));
    expect(state.mutate).toHaveBeenCalledWith({ id: "l1", availabilityStatus: "OCCUPIED" });
  });

  it("shows what the next payment is under Spent, linked to billing", () => {
    state.data = readAgentOverview({
      spending: { total: 4000 },
      nextRenewal: { listingId: "l1", title: "Room A", expiresAt: "2026-12-01T00:00:00Z", amount: 2000, autoRenew: false },
    });
    render(<AgentHub />);

    const spent = screen.getByText(/^Ends .*₦2,000$/);
    expect(spent.closest("a")?.getAttribute("href")).toBe("/agent/billing");
  });

  it("points at visits waiting for an answer before new enquiries", () => {
    state.data = readAgentOverview({ inspections: { awaitingAnswer: 1 }, enquiries: { new: 2 } });
    render(<AgentHub />);

    expect(screen.getByText("1 visit request waiting").closest("a")?.getAttribute("href")).toBe("/agent/visits");
  });

  it("walks a new agent to their first property", () => {
    state.data = readAgentOverview({});
    render(<AgentHub />);

    expect(screen.getByText("Add your first property").closest("a")?.getAttribute("href")).toBe("/agent/properties");
  });
});
