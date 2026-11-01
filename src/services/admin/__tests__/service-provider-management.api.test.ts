import { beforeEach, describe, expect, it, vi } from "vitest";

const patchMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api-client", () => ({ apiClient: { patch: patchMock } }));

import { serviceProviderManagementService as svc } from "../service-provider-management.api";

beforeEach(() => patchMock.mockReset());

describe("removeServiceImages", () => {
  it("sends the trimmed reason to the service's remove-images endpoint", async () => {
    patchMock.mockResolvedValue({ data: {}, error: null });

    await svc.removeServiceImages("p1", "s1", "  Not allowed  ");

    expect(patchMock).toHaveBeenCalledWith("/admin/service-providers/p1/services/s1/remove-images", {
      reason: "Not allowed",
    });
  });

  it("asks for a reason and sends nothing without one", async () => {
    await expect(svc.removeServiceImages("p1", "s1", "   ")).rejects.toThrow("reason is required");
    expect(patchMock).not.toHaveBeenCalled();
  });

  it("explains a refusal in plain words", async () => {
    patchMock.mockResolvedValue({ data: null, error: { status: 403, message: "Forbidden" } });
    await expect(svc.removeServiceImages("p1", "s1", "x")).rejects.toThrow("don't have permission");

    patchMock.mockResolvedValue({ data: null, error: { status: 400, message: "This service has no photos" } });
    await expect(svc.removeServiceImages("p1", "s1", "x")).rejects.toThrow("no photos");
  });
});
