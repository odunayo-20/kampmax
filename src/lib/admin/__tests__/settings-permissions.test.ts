import { describe, expect, it } from "vitest";
import {
  getSectionAccess,
  getSettingsAccess,
  isHighRiskSettingsSection,
  HIGH_RISK_SETTINGS_SECTIONS,
} from "../settings-permissions";
import { buildRbacRoles } from "@/data/admin/rbac";
import type {
  AdminRoleKey,
  RolePermissionMatrix,
  SettingsSectionKey,
} from "@/types/admin";

const ALL_SECTIONS: SettingsSectionKey[] = [
  "general",
  "marketplace",
  "orders",
  "financial",
  "loyalty",
  "notifications",
  "security",
];

function matrixFor(role: AdminRoleKey): RolePermissionMatrix {
  const r = buildRbacRoles().find((x) => x.key === role);
  if (!r) throw new Error(`no seeded role ${role}`);
  return r.permissions;
}

describe("settings permission helpers (Module 50)", () => {
  it("marks exactly financial, posting fees and security as high-risk sections", () => {
    expect([...HIGH_RISK_SETTINGS_SECTIONS].sort()).toEqual([
      "financial",
      "postings",
      "security",
    ]);
    expect(isHighRiskSettingsSection("financial")).toBe(true);
    expect(isHighRiskSettingsSection("postings")).toBe(true);
    expect(isHighRiskSettingsSection("security")).toBe(true);
    expect(isHighRiskSettingsSection("general")).toBe(false);
    expect(isHighRiskSettingsSection("orders")).toBe(false);
  });

  it("grants SUPER_ADMIN view+edit+manage on the settings resource", () => {
    const access = getSettingsAccess(matrixFor("SUPER_ADMIN"));
    expect(access.canView).toBe(true);
    expect(access.canEditOperational).toBe(true);
    expect(access.canEditHighRisk).toBe(true);
  });

  it("grants ADMIN operational editing but NOT the elevated manage tier", () => {
    const access = getSettingsAccess(matrixFor("ADMIN"));
    expect(access.canView).toBe(true);
    expect(access.canEditOperational).toBe(true);
    expect(access.canEditHighRisk).toBe(false);
  });

  it("grants CAMPUS_ADMIN no settings access at all (nav-excluded too)", () => {
    const access = getSettingsAccess(matrixFor("CAMPUS_ADMIN"));
    expect(access.canView).toBe(false);
    expect(access.canEditOperational).toBe(false);
    expect(access.canEditHighRisk).toBe(false);
  });

  it("treats a missing matrix as full denial - never a default-grant", () => {
    const access = getSettingsAccess(undefined);
    expect(access.canView).toBe(false);
    expect(access.canEditOperational).toBe(false);
    expect(access.canEditHighRisk).toBe(false);
  });

  it("lets ADMIN edit operational sections but keeps financial/security read-only", () => {
    const matrix = matrixFor("ADMIN");
    for (const section of ALL_SECTIONS) {
      const access = getSectionAccess(matrix, section);
      expect(access.canView).toBe(true);
      const isHighRisk = isHighRiskSettingsSection(section);
      expect(access.requiresManage).toBe(isHighRisk);
      expect(access.canEdit).toBe(!isHighRisk);
    }
  });

  it("lets SUPER_ADMIN edit every section including high-risk ones", () => {
    const matrix = matrixFor("SUPER_ADMIN");
    for (const section of ALL_SECTIONS) {
      const access = getSectionAccess(matrix, section);
      expect(access.canView).toBe(true);
      expect(access.canEdit).toBe(true);
    }
  });

  it("keeps CAMPUS_ADMIN read-only on every section", () => {
    const matrix = matrixFor("CAMPUS_ADMIN");
    for (const section of ALL_SECTIONS) {
      const access = getSectionAccess(matrix, section);
      expect(access.canView).toBe(false);
      expect(access.canEdit).toBe(false);
    }
  });

  it("flags the elevated action requirement correctly for high-risk sections", () => {
    const matrix = matrixFor("ADMIN");
    const financial = getSectionAccess(matrix, "financial");
    expect(financial.requiresManage).toBe(true);
    const general = getSectionAccess(matrix, "general");
    expect(general.requiresManage).toBe(false);
  });
});