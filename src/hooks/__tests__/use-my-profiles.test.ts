import { beforeEach, describe, expect, it, vi } from "vitest";

const access = vi.hoisted(() => ({
  vendor: vi.fn(),
  freelancer: vi.fn(),
  service: vi.fn(),
  employer: vi.fn(),
  agent: vi.fn(),
}));
vi.mock("@/services/vendor-dashboard", () => ({ getVendorDashboardAccessApi: access.vendor }));
vi.mock("@/services/freelancer-dashboard", () => ({ getFreelancerDashboardAccessApi: access.freelancer }));
vi.mock("@/services/service-provider-dashboard", () => ({ getServiceProviderDashboardAccessApi: access.service }));
vi.mock("@/services/employer", () => ({ getEmployerDashboardAccessApi: access.employer }));
vi.mock("@/services/agent-dashboard", () => ({ getAgentDashboardAccessApi: access.agent }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ status: "authenticated" }) }));

import { hasProfile, loadMyProfiles } from "../use-my-profiles";

beforeEach(() => {
  access.vendor.mockResolvedValue({ kind: "no_vendor" });
  access.freelancer.mockResolvedValue({ kind: "no_freelancer" });
  access.service.mockResolvedValue({ kind: "no_service_provider" });
  access.employer.mockResolvedValue({ kind: "no_employer" });
  access.agent.mockResolvedValue({ kind: "no_agent" });
});

describe("hasProfile", () => {
  it("treats a no_<vertical> kind, or no answer, as not held", () => {
    expect(hasProfile({ kind: "no_vendor" })).toBe(false);
    expect(hasProfile(null)).toBe(false);
    expect(hasProfile({})).toBe(false);
  });

  it("treats any other kind as held", () => {
    expect(hasProfile({ kind: "approved" })).toBe(true);
  });
});

describe("loadMyProfiles", () => {
  it("reports which profiles are held, with a display name where there is one", async () => {
    access.vendor.mockResolvedValue({ kind: "approved", storeName: "Ada's Books" });
    access.service.mockResolvedValue({ kind: "approved", displayName: "Ada Cuts" });

    expect(await loadMyProfiles()).toEqual({
      vendor: { status: "active", sub: "Ada's Books" },
      freelancer: { status: "none" },
      service: { status: "active", sub: "Ada Cuts" },
      employer: { status: "none" },
      agent: { status: "none" },
    });
  });

  it("marks only the profile whose check failed, and still answers for the rest", async () => {
    access.freelancer.mockRejectedValue(new Error("down"));
    access.employer.mockResolvedValue({ kind: "approved" });

    const states = await loadMyProfiles();

    expect(states.freelancer).toEqual({ status: "error" });
    expect(states.employer).toEqual({ status: "active", sub: undefined });
    expect(states.vendor).toEqual({ status: "none" });
    expect(states.agent).toEqual({ status: "none" });
  });
});
