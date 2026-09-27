// ============================================================
// ADMIN SETTINGS PERMISSION GATING (Module 50)
// ============================================================
//
// Derives per-section edit capability from the LIVE RBAC matrix
// (Module 49). The `settings` resource exposes three actions that
// are mapped onto the sections shipped by the settings store:
//
//   settings.view    — may open the console / inspect values
//   settings.edit    — may change operational settings
//   settings.manage  — may change high-risk settings
//
// The MITIGATION-RISK mapping below is explicit and conservative:
// sections that change money movement or security controls require
// the elevated `manage` action even from an operator who holds
// `edit`. The matrix is backend-authoritative — the future NestJS
// guards map these same actions onto `@RequirePermissions(...)`;
// this module only reflects that contract in the UI.
// ============================================================

import type {
  ResourcePermission,
  SettingsAccessState,
  RolePermissionMatrix,
  SettingsSectionKey,
} from "@/types/admin";

/** Settings sections whose changes can cause financial/security harm. */
export const HIGH_RISK_SETTINGS_SECTIONS: ReadonlySet<SettingsSectionKey> =
  new Set<SettingsSectionKey>(["financial", "security"]);

export function isHighRiskSettingsSection(
  section: SettingsSectionKey
): boolean {
  return HIGH_RISK_SETTINGS_SECTIONS.has(section);
}

export interface SettingsAccess {
  canView: boolean;
  /** Every section via `settings.edit` — operational settings only. */
  canEditOperational: boolean;
  /** High-risk sections (financial/security) via `settings.manage`. */
  canEditHighRisk: boolean;
}

export interface SectionAccess {
  canView: boolean;
  /** Whether THIS section can be edited by the acting operator. */
  canEdit: boolean;
  /** True when the section is high-risk and gated behind `manage`. */
  requiresManage: boolean;
}

function settingsRow(
  matrix: RolePermissionMatrix | undefined
): ResourcePermission | undefined {
  return matrix?.settings;
}

/**
 * Overall settings posture for an acting operator.
 */
export function getSettingsAccess(
  matrix: RolePermissionMatrix | undefined
): SettingsAccess {
  const row = settingsRow(matrix);
  return {
    canView: !!row?.view,
    canEditOperational: !!row?.edit,
    canEditHighRisk: !!row?.manage,
  };
}

/**
 * Per-section access for an acting operator. A section is editable
 * only when the operator holds the action the section requires:
 * `edit` for operational sections, `manage` for high-risk ones.
 */
export function getSectionAccess(
  matrix: RolePermissionMatrix | undefined,
  section: SettingsSectionKey
): SectionAccess {
  const row = settingsRow(matrix);
  const requiresManage = isHighRiskSettingsSection(section);
  const granted = requiresManage ? row?.manage : row?.edit;
  return {
    canView: !!row?.view,
    canEdit: !!granted,
    requiresManage,
  };
}

/**
 * Per-section access from the server-decided flags returned with the
 * settings state (the live API enforces the same rule on every write).
 */
export function sectionAccessFromServer(
  access: SettingsAccessState,
  section: SettingsSectionKey
): SectionAccess {
  const requiresManage = isHighRiskSettingsSection(section);
  return {
    canView: true,
    canEdit: requiresManage ? access.canManage : access.canEdit,
    requiresManage,
  };
}
