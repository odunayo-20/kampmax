import { PlatformSettingsConfig, PlatformSettingsState, SettingsSectionKey } from "@/types/admin";

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
