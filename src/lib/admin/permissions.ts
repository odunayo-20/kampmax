// ============================================================
// ADMIN PERMISSIONS SCAFFOLDING
//
// Deliberately minimal today: only coarse nav-level visibility per
// role. The structure below is where fine-grained RBAC plugs in
// later - e.g. a resource/action matrix returned by the API and
// enforced in `canPerform()` guards.
// ============================================================

import { AdminRole } from "@/types/admin";

export type AdminNavItemKey =
  | "dashboard"
  | "users"
  | "campuses"
  | "vendors"
  | "products"
  | "marketplace"
  | "categories"
  | "orders"
  | "transactions"
  | "payouts"
  | "finance"
  | "wallet"
  | "withdrawals"
  | "promotions"
  | "campusFeed"
  | "reports"
  | "reviews"
  | "safety"
  | "disputes"
  | "notifications"
  | "settings"
  | "permissions"
  | "auditLogs"
  | "freelancers"
  | "serviceProviders"
  | "employers"
  | "jobs"
  | "verifications"
  | "security"
  | "support"
  | "eventOrganizers"
  | "blog";

/**
 * Which sections each role can see. CAMPUS_ADMIN is scoped to their
 * campus data (enforced server-side later; the UI already passes
 * their campusId into service calls).
 */
export const ROLE_NAV_ACCESS: Record<AdminRole, AdminNavItemKey[] | "*"> = {
  SUPER_ADMIN: "*",
  ADMIN: "*",
  CAMPUS_ADMIN: [
    "dashboard",
    "users",
    "vendors",
    "marketplace",
    "freelancers",
    "employers",
    "jobs",
    "verifications",
    "products",
    "orders",
    "reviews",
    "safety",
    "disputes",
    "support",
    "reports",
    "campusFeed",
  ],
};

export function canSeeSection(
  role: AdminRole,
  key: AdminNavItemKey
): boolean {
  const access = ROLE_NAV_ACCESS[role];
  return access === "*" || access.includes(key);
}

/**
 * Resource/action checks the UI can already mirror from the backend RBAC
 * catalog. The backend stays the authority (it returns 403); this only keeps
 * controls out of sight for roles that would be rejected.
 */
const ACTION_ROLES: Record<string, AdminRole[]> = {
  // backend permission `taxonomy.manage` (SUPER_ADMIN, ADMIN)
  "categories:manage": ["SUPER_ADMIN", "ADMIN"],
  // backend blog.* permissions (see common/rbac/permissions.ts)
  "blog:create": ["SUPER_ADMIN", "ADMIN"],
  "blog:update": ["SUPER_ADMIN", "ADMIN"],
  "blog:publish": ["SUPER_ADMIN", "ADMIN"],
  "blog:delete": ["SUPER_ADMIN", "ADMIN"],
  "blog:manageCategories": ["SUPER_ADMIN", "ADMIN"],
  "blog:manageTags": ["SUPER_ADMIN", "ADMIN"],
};

/** UI action -> backend permission slug (see backend common/rbac/permissions.ts). */
const ACTION_SLUGS: Record<string, string> = {
  "categories:manage": "taxonomy.manage",
  "blog:create": "blog.create",
  "blog:update": "blog.update",
  "blog:publish": "blog.publish",
  "blog:delete": "blog.delete",
  "blog:manageCategories": "blog.manage_categories",
  "blog:manageTags": "blog.manage_tags",
};

/**
 * Preferred check for a signed-in operator: a live session carries the exact
 * permission slugs the API enforces, so use those; mock profiles (no
 * `permissions`) fall back to the role table.
 */
export function canAdminPerform(
  admin: { role: AdminRole; permissions?: string[] },
  resource: string,
  action: string
): boolean {
  const slug = ACTION_SLUGS[`${resource}:${action}`];
  if (admin.permissions && slug) return admin.permissions.includes(slug);
  return canPerform(admin.role, resource, action);
}

export function canPerform(
  role: AdminRole,
  resource: string,
  action: string
): boolean {
  const allowed = ACTION_ROLES[`${resource}:${action}`];
  // Anything not listed above keeps the mock-phase behaviour: every
  // signed-in operator may act, until the API exposes permission sets.
  return allowed ? allowed.includes(role) : true;
}
