import { apiClient, type ApiError } from "@/lib/api-client";
import type { PlatformSettingsState } from "@/types/admin";
import {
  SettingsConflictError,
  SettingsForbiddenError,
  type AdminSettingsConfigService,
} from "./settings-config.service";

/**
 * Live /admin/settings service backed by AdminSettingsController
 * (GET /admin/settings, PUT /admin/settings/:section,
 * DELETE /admin/settings/:section to restore defaults).
 *
 * Every write is validated, versioned and audit-logged by the server;
 * financial and security sections additionally need `settings.manage`.
 */

function fail(error: ApiError, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new SettingsForbiddenError(
      error.message || "You don't have permission to do that."
    );
  }
  if (error.status === 409) {
    throw new SettingsConflictError(
      error.message ||
        "These settings were changed by someone else. Reload to see the latest values."
    );
  }
  throw new Error(error.message || fallback);
}

async function loadState(): Promise<PlatformSettingsState> {
  const { data, error } = await apiClient.get<PlatformSettingsState>("/admin/settings");
  if (error) fail(error, "Couldn't load platform settings.");
  return data;
}

function versionQuery(expectedVersion: number | undefined): string {
  return expectedVersion === undefined ? "" : `?expectedVersion=${expectedVersion}`;
}

export function createApiSettingsConfigService(): AdminSettingsConfigService {
  return {
    async get() {
      return (await loadState()).config;
    },

    getState: loadState,

    async save(section, value, expectedVersion) {
      const { data, error } = await apiClient.put<
        { value: unknown; expectedVersion?: number },
        PlatformSettingsState
      >(`/admin/settings/${section}`, { value, expectedVersion });
      if (error) fail(error, "Couldn't save this section.");
      return data.config;
    },

    async resetSection(section, expectedVersion) {
      const { data, error } = await apiClient.delete<PlatformSettingsState>(
        `/admin/settings/${section}${versionQuery(expectedVersion)}`
      );
      if (error) fail(error, "Couldn't reset this section.");
      return data.config;
    },

    async resetToDefaults() {
      throw new Error("Resetting every section at once isn't supported; reset sections individually.");
    },
  };
}
