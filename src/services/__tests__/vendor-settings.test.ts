import { beforeEach, describe, expect, it, vi } from "vitest";

const get = vi.fn();
const patch = vi.fn();
vi.mock("@/lib/api-client", () => ({
  apiClient: { get: (...a: unknown[]) => get(...a), patch: (...a: unknown[]) => patch(...a) },
}));

import { fetchVendorSettings, saveVendorSettings } from "../vendor-settings";

const ok = <T>(data: T) => Promise.resolve({ data, error: null });

beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation((path: string) =>
    path === "/vendors/me/settings"
      ? ok({ storefrontVisible: false, minOrderAmount: "2500.00" })
      : ok({ typeSettings: { VENDOR: { inApp: true }, ORDER: { inApp: false }, MESSAGE: { inApp: false } } })
  );
  patch.mockImplementation(() => ok({}));
});

describe("vendor settings", () => {
  it("reads the store's real settings and notification choices", async () => {
    await expect(fetchVendorSettings()).resolves.toEqual({
      storefrontVisible: false,
      minOrderAmount: 2500,
      notifyOnOrder: true,
      notifyOnMessage: false,
    });
  });

  it("does not tie store alerts to the owner's own purchase alerts", async () => {
    get.mockImplementation((path: string) =>
      path === "/vendors/me/settings"
        ? ok({ storefrontVisible: true, minOrderAmount: 0 })
        : ok({ typeSettings: { ORDER: { inApp: false } } })
    );
    const settings = await fetchVendorSettings();
    expect(settings.notifyOnOrder).toBe(true); // ORDER (purchases) is off; store alerts are not
  });

  it("treats a notification type with no saved choice as on", async () => {
    get.mockImplementation((path: string) =>
      path === "/vendors/me/settings"
        ? ok({ storefrontVisible: true, minOrderAmount: 0 })
        : ok({ typeSettings: null })
    );
    const settings = await fetchVendorSettings();
    expect(settings.notifyOnOrder).toBe(true);
    expect(settings.notifyOnMessage).toBe(true);
  });

  it("does not invent values when the server fails", async () => {
    get.mockImplementation(() => Promise.resolve({ data: null, error: { message: "down" } }));
    await expect(fetchVendorSettings()).rejects.toThrow("down");
  });

  it("saves store settings and the per-type notification choices, then reloads", async () => {
    await saveVendorSettings({
      storefrontVisible: true,
      minOrderAmount: 1500.499,
      notifyOnOrder: false,
      notifyOnMessage: true,
    });

    expect(patch).toHaveBeenCalledWith("/vendors/me/settings", {
      storefrontVisible: true,
      minOrderAmount: 1500.5,
    });
    expect(patch).toHaveBeenCalledWith("/notification-preferences", {
      typeSettings: {
        VENDOR: { inApp: false, email: false, push: false },
        MESSAGE: { inApp: true, email: true, push: true },
      },
    });
  });

  it("fails loudly if a save is rejected, instead of pretending it worked", async () => {
    patch.mockImplementationOnce(() => Promise.resolve({ data: null, error: { message: "Invalid amount" } }));
    await expect(
      saveVendorSettings({ storefrontVisible: true, minOrderAmount: 1, notifyOnOrder: true, notifyOnMessage: true })
    ).rejects.toThrow("Invalid amount");
  });
});
