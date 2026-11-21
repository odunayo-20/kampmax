// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AGENT_DASHBOARD_GATE, type AgentAccess } from "@/services/agent-dashboard";

const nav = vi.hoisted(() => ({ pathname: "/agent" }));
vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/hooks/use-accommodation", () => ({
  useAccommodationAgentProfile: () => ({
    isPending: false,
    data: { documents: [{ id: "d1", documentType: "IDENTITY", status: "PENDING" }] },
  }),
}));

import { AgentAccessGate } from "../AgentAccessGate";

afterEach(cleanup);
beforeEach(() => {
  nav.pathname = "/agent";
});

const pending: AgentAccess = {
  kind: AGENT_DASHBOARD_GATE.PENDING_REVIEW,
  status: "PENDING",
  canUseDashboard: true,
  message: null,
};

const show = (access: AgentAccess) =>
  render(
    <AgentAccessGate access={access}>
      <p>Page content</p>
    </AgentAccessGate>
  );

describe("a pending agent's workspace", () => {
  it("shows where the application stands on the overview, not the dashboard", () => {
    show(pending);

    expect(screen.getByText("Application under review")).toBeTruthy();
    expect(screen.getByText("Where your application is")).toBeTruthy();
    expect(screen.getByText(/1 document on file/)).toBeTruthy();
    expect(screen.getByText(/Still needed: proof of ownership/)).toBeTruthy();
    expect(screen.queryByText("Page content")).toBeNull();
  });

  it("says a listings page opens after approval instead of showing one that would fail", () => {
    nav.pathname = "/agent/listings";
    show(pending);

    expect(screen.getByText(/This page opens once Kampmax approves you/)).toBeTruthy();
    expect(screen.queryByText("Page content")).toBeNull();
  });

  it("keeps the profile page usable, under one notice", () => {
    nav.pathname = "/agent/profile";
    show(pending);

    expect(screen.getByText("Page content")).toBeTruthy();
    expect(screen.getAllByText("Application under review")).toHaveLength(1);
  });

  it("puts the review team's question first, with a way to answer it", () => {
    show({ ...pending, kind: AGENT_DASHBOARD_GATE.MORE_INFORMATION, infoRequest: "Add your CAC certificate." });

    expect(screen.getByRole("alert").textContent).toContain("Add your CAC certificate.");
    expect(screen.getByRole("link", { name: /Add documents/ }).getAttribute("href")).toBe("/agent/verification");
  });

  it("leaves an approved agent's pages alone", () => {
    show({ ...pending, kind: AGENT_DASHBOARD_GATE.APPROVED, status: "APPROVED" });

    expect(screen.getByText("Page content")).toBeTruthy();
    expect(screen.queryByText(/application/i)).toBeNull();
  });
});
