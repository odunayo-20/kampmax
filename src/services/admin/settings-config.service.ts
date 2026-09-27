import {
  PlatformSettingsConfig,
  PlatformSettingsState,
  SettingsSectionKey,
  SettingsSectionMeta,
} from "@/types/admin";
import { apiDelay } from "@/lib/admin/api";
import { createSettingsConfigSeed } from "@/data/admin/settings-config";

// ------------------------------------------------------------
// CONTRACT (NestJS resource: /admin/settings)
//
// `settingsConfigService` in the container is the live HTTP
// implementation. The in-memory mock below is kept for tests and
// offline prototyping only: it mutates a runtime copy and nothing
// survives a reload.
// ------------------------------------------------------------

export interface AdminSettingsConfigService {
  get(): Promise<PlatformSettingsConfig>;
  /** Config plus per-section versions and the operator's edit access. */
  getState(): Promise<PlatformSettingsState>;
  /**
   * Persists one section. `expectedVersion` is the version the editor
   * loaded; a stale save is rejected instead of overwriting.
   */
  save<S extends SettingsSectionKey>(
    section: S,
    value: PlatformSettingsConfig[S],
    expectedVersion?: number
  ): Promise<PlatformSettingsConfig>;
  /** Restores one section's built-in defaults. */
  resetSection(
    section: SettingsSectionKey,
    expectedVersion?: number
  ): Promise<PlatformSettingsConfig>;
  resetToDefaults(): Promise<PlatformSettingsConfig>;
}

/** Thrown when the operator lacks permission to view or change settings. */
export class SettingsForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsForbiddenError";
  }
}

/** Thrown when the section changed since the editor loaded it (HTTP 409). */
export class SettingsConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SettingsConflictError";
  }
}

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function createMockSettingsConfigService(): AdminSettingsConfigService {
  let config = createSettingsConfigSeed();
  const versions = new Map<SettingsSectionKey, number>();

  const meta = (): Record<SettingsSectionKey, SettingsSectionMeta> =>
    Object.fromEntries(
      (Object.keys(config) as SettingsSectionKey[]).map((key) => [
        key,
        {
          version: versions.get(key) ?? 0,
          updatedAt: null,
          updatedBy: null,
          isDefault: !versions.has(key),
        },
      ])
    ) as Record<SettingsSectionKey, SettingsSectionMeta>;

  return {
    async get() {
      await apiDelay(180);
      return clone(config);
    },

    async getState() {
      await apiDelay(180);
      return {
        config: clone(config),
        meta: meta(),
        access: { canEdit: true, canManage: true },
      };
    },

    async save(section, value) {
      await apiDelay(300);
      config = { ...config, [section]: clone(value) };
      versions.set(section, (versions.get(section) ?? 0) + 1);
      return clone(config);
    },

    async resetSection(section) {
      await apiDelay(300);
      config = { ...config, [section]: createSettingsConfigSeed()[section] };
      versions.set(section, (versions.get(section) ?? 0) + 1);
      return clone(config);
    },

    async resetToDefaults() {
      await apiDelay(300);
      config = createSettingsConfigSeed();
      versions.clear();
      return clone(config);
    },
  };
}
