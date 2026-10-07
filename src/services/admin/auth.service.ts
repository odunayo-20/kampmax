// ============================================================
// ADMIN AUTH SERVICE (Module 34)
//
// Backend surrogate for the future NestJS /admin/auth endpoints. This
// module is the AUTHORIZATION BOUNDARY for the admin console in the
// mock stack: the UI (AdminShell guard, nav) only hides things for UX,
// while every admin session — and eventually every admin read/write —
// resolves through here. Token issuance is deterministic (the adminId
// is embedded) so sessions survive hot reloads and address changes the
// same way the customer auth tokens do; in the real backend this is a
// signed session token verified by the API gateway.
// ============================================================

import type { AdminProfile } from "@/types/admin";

export type AdminAuthFailCode =
  | "INVALID_CREDENTIALS"
  | "ACCOUNT_DISABLED"
  | "FORBIDDEN";

export type AdminAuthResult =
  | { success: true; admin: AdminProfile; token: string }
  | { success: false; code: AdminAuthFailCode; message: string };

export interface AdminLoginInput {
  email: string;
  password: string;
}

export interface AdminAuthService {
  /** POST /admin/auth/login */
  login(input: AdminLoginInput): Promise<AdminAuthResult>;
  /** GET /admin/auth/session (token in cookie/header) */
  getCurrentSession(token: string): Promise<{ admin: AdminProfile } | null>;
  /** POST /admin/auth/logout */
  logout(token: string): Promise<{ success: true }>;
  /**
   * Demo-only account switch. Mirrors a support tool where a Super Admin
   * inspects the console as another operator. Enforced server-side here:
   * only a SUPER_ADMIN session may switch, and only to an active account.
   */
  switchAccount(token: string, adminId: string): Promise<AdminAuthResult>;
  /** GET /admin/auth/admins — active roster for the switcher. */
  listActiveAdmins(): Promise<AdminProfile[]>;
  getDemoCredentials(): {
    email: string;
    password: string;
    roleLabel: string;
    campus?: string;
  }[];
}