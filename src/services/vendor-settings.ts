import { apiClient } from "@/lib/api-client";

// ============================================================
// STORE SETTINGS (live)
// ============================================================
//
// Only settings the platform actually acts on are exposed here:
//   - storefrontVisible: hides the store from browsing, search and its page
//   - minOrderAmount:    checkout refuses an order below it
//   - store / message notifications: the account's real per-type preferences.
//     Store alerts (new orders, payments, cancellations) are their own
//     notification type, so they never affect the owner's own purchase alerts.
//
// Whether the store is open or paused for new orders is the store status on
// the Store Management page, not a setting here.

export interface VendorStoreSettings {
  storefrontVisible: boolean;
  /** Smallest order total checkout accepts; 0 = no minimum. */
  minOrderAmount: number;
  notifyOnOrder: boolean;
  notifyOnMessage: boolean;
}

interface BackendVendorSettings {
  storefrontVisible: boolean;
  minOrderAmount: number | string;
}

interface BackendPreferences {
  typeSettings: Record<string, { inApp?: boolean; email?: boolean; push?: boolean }> | null;
}

function fail(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

/** On unless the user switched that notification type's in-app channel off. */
const typeEnabled = (prefs: BackendPreferences, type: string) =>
  prefs.typeSettings?.[type]?.inApp !== false;

/** The store's real settings; failures throw, never fall back to demo values. */
export async function fetchVendorSettings(): Promise<VendorStoreSettings> {
  const [settings, prefs] = await Promise.all([
    apiClient.get<BackendVendorSettings>("/vendors/me/settings"),
    apiClient.get<BackendPreferences>("/notification-preferences"),
  ]);
  if (settings.error || !settings.data) throw fail(settings.error, "Could not load your store settings.");
  if (prefs.error || !prefs.data) throw fail(prefs.error, "Could not load your notification settings.");
  return {
    storefrontVisible: settings.data.storefrontVisible,
    minOrderAmount: Number(settings.data.minOrderAmount ?? 0),
    notifyOnOrder: typeEnabled(prefs.data, "VENDOR"),
    notifyOnMessage: typeEnabled(prefs.data, "MESSAGE"),
  };
}

const allChannels = (on: boolean) => ({ inApp: on, email: on, push: on });

/** Saves every setting; resolves only once the server has accepted all of it. */
export async function saveVendorSettings(next: VendorStoreSettings): Promise<VendorStoreSettings> {
  const settings = await apiClient.patch<
    { storefrontVisible: boolean; minOrderAmount: number },
    BackendVendorSettings
  >("/vendors/me/settings", {
    storefrontVisible: next.storefrontVisible,
    minOrderAmount: Math.max(0, Math.round(next.minOrderAmount * 100) / 100),
  });
  if (settings.error) throw fail(settings.error, "Could not save your store settings.");

  const prefs = await apiClient.patch<
    { typeSettings: Record<string, ReturnType<typeof allChannels>> },
    BackendPreferences
  >("/notification-preferences", {
    typeSettings: {
      VENDOR: allChannels(next.notifyOnOrder),
      MESSAGE: allChannels(next.notifyOnMessage),
    },
  });
  if (prefs.error) throw fail(prefs.error, "Could not save your notification settings.");

  return fetchVendorSettings();
}
