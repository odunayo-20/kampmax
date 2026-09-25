// ============================================================
// ADMIN AUTH SERVICE, LIVE (NestJS /admin/auth)
//
// Operators sign in with their normal platform credentials; the backend
// only lets SUPER_ADMIN / ADMIN accounts through and returns their profile
// plus the permission slugs the API will enforce. The access/refresh tokens
// go into the shared auth storage, so every API call the console makes (for
// example the taxonomy admin endpoints) is authenticated as that operator
// and the API client's silent token refresh keeps working.
//
// No impersonation: the backend has no account switching, so those parts of
// the interface report "unavailable".
// ============================================================

import { apiClient, type ApiError } from "@/lib/api-client";
import { clearAuthTokens, getRefreshToken, persistAuthTokens } from "@/lib/auth-storage";
import type { AdminProfile, AdminRole } from "@/types/admin";
import type { AdminAuthResult, AdminAuthService } from "./auth.service";

interface BackendOperator {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  title: string;
  avatar: string;
  lastLoginAt: string | null;
  permissions: string[];
}

interface LoginResponse {
  admin: BackendOperator;
  tokens: { accessToken: string; refreshToken: string };
}

function toProfile(op: BackendOperator): AdminProfile {
  return {
    id: op.id,
    name: op.name,
    email: op.email,
    role: op.role,
    campusId: null, // SUPER_ADMIN / ADMIN are platform-wide
    avatar: op.avatar,
    title: op.title,
    lastLoginAt: op.lastLoginAt ?? "",
    permissions: op.permissions,
  };
}

function failure(error: ApiError | null): AdminAuthResult {
  if (error?.status === 401) {
    return { success: false, code: "INVALID_CREDENTIALS", message: "Invalid email or password." };
  }
  if (error?.status === 403) {
    return {
      success: false,
      code: "FORBIDDEN",
      message: "This account doesn't have operator access.",
    };
  }
  return {
    success: false,
    code: "INVALID_CREDENTIALS",
    message: error?.message || "Unable to reach the auth service. Please try again.",
  };
}

export function createApiAdminAuthService(): AdminAuthService {
  return {
    async login({ email, password }) {
      // Never carry a previous (possibly non-operator) session into a login.
      clearAuthTokens();
      const { data, error } = await apiClient.post<Record<string, unknown>, LoginResponse>(
        "/admin/auth/login",
        { email, password }
      );
      if (error || !data?.admin || !data.tokens) return failure(error);

      persistAuthTokens(data.tokens.accessToken, data.tokens.refreshToken);
      return { success: true, admin: toProfile(data.admin), token: data.tokens.accessToken };
    },

    // The token argument is the console's marker; the API client sends the
    // stored access token itself (and refreshes it when it expires).
    async getCurrentSession() {
      const { data, error } = await apiClient.get<{ admin: BackendOperator }>("/admin/auth/session");
      if (error || !data?.admin) return null;
      return { admin: toProfile(data.admin) };
    },

    async logout() {
      const refreshToken = getRefreshToken();
      try {
        if (refreshToken) {
          await apiClient.post<Record<string, unknown>, unknown>("/auth/logout", { refreshToken });
        }
      } catch {
        // Revoking server-side is best effort; the operator is signed out locally regardless.
      } finally {
        clearAuthTokens();
      }
      return { success: true };
    },

    async switchAccount() {
      return {
        success: false,
        code: "FORBIDDEN",
        message: "Switching operator accounts isn't available.",
      };
    },

    async listActiveAdmins() {
      return [];
    },

    getDemoCredentials() {
      return [];
    },
  };
}
