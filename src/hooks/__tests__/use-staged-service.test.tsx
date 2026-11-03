// @vitest-environment jsdom
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { FreelancerService } from "@/types/freelancer-services";

const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/chat/c1" }));

const fetchPublicServiceById = vi.fn();
vi.mock("@/services/freelancer-services", () => ({
  fetchPublicServiceById: (id: string) => fetchPublicServiceById(id),
}));
const getPublicFreelancerById = vi.fn();
vi.mock("@/services/freelancer", () => ({
  getPublicFreelancerById: (id: string) => getPublicFreelancerById(id),
}));

import { useStagedService } from "../use-staged-service";

const ID = "4e65979b-5e0e-444c-b477-249269bfc8b6";
const service = (overrides: Partial<FreelancerService> = {}) =>
  ({ id: ID, userId: "profile-1", status: "published", title: "Backend development", ...overrides }) as FreelancerService;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("useStagedService", () => {
  afterEach(cleanup);
  beforeEach(() => {
    replace.mockReset();
    fetchPublicServiceById.mockReset().mockResolvedValue(service());
    getPublicFreelancerById.mockReset().mockResolvedValue({ profile: { userId: "freelancer-user" }, error: null });
  });

  it("stages a live service whose owner is in the chat", async () => {
    const { result } = renderHook(() => useStagedService(["buyer", "freelancer-user"], ID), { wrapper });
    await waitFor(() => expect(result.current.service?.id).toBe(ID));
    expect(getPublicFreelancerById).toHaveBeenCalledWith("profile-1");
  });

  it("ignores a service whose owner is NOT in this chat (a crafted link)", async () => {
    const { result } = renderHook(() => useStagedService(["buyer", "someone-else"], ID), { wrapper });
    await waitFor(() => expect(getPublicFreelancerById).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(result.current.service).toBeNull();
  });

  it("never even requests a service for a malformed or repeated parameter", async () => {
    renderHook(() => useStagedService(["freelancer-user"], "not-a-uuid"), { wrapper });
    renderHook(() => useStagedService(["freelancer-user"], [ID, ID]), { wrapper });
    renderHook(() => useStagedService(["freelancer-user"], undefined), { wrapper });
    await new Promise((r) => setTimeout(r, 20));
    expect(fetchPublicServiceById).not.toHaveBeenCalled();
  });

  it("ignores a service that is paused or gone", async () => {
    fetchPublicServiceById.mockResolvedValue(service({ status: "paused" }));
    const paused = renderHook(() => useStagedService(["freelancer-user"], ID), { wrapper });
    await waitFor(() => expect(fetchPublicServiceById).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(paused.result.current.service).toBeNull();
    expect(getPublicFreelancerById).not.toHaveBeenCalled();
  });

  it("clears the parameter by replacing the address with the bare path", async () => {
    const { result } = renderHook(() => useStagedService(["freelancer-user"], ID), { wrapper });
    result.current.clear();
    expect(replace).toHaveBeenCalledWith("/chat/c1");
  });
});
