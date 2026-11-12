// ============================================================
// ADMIN AUTH SERVICE, LIVE (NestJS /admin/auth)
//
// Operators sign in with their normal platform credentials; the backend
// only lets SUPER_ADMIN / ADMIN accounts through and returns their profile
// plus the permission slugs the API will enforce. The access token is kept in
// memory by the shared auth storage (the refresh token is an httpOnly cookie),
// so every API call the console makes is authenticated as that operator and
// the API client's silent token refresh keeps working.
//
// No impersonation: the backend has no account switching, so those parts of
// the interface report "unavailable".
// ============================================================

import { apiClient, type ApiError } from "@/lib/api-client";
import { clearAuthTokens, setAccessToken } from "@/lib/auth-storage";
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
  // The refresh token is an httpOnly cookie; the body only carries the access token.
  tokens: { accessToken: string };
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
      let response;
      try {
        response = await apiClient.post<Record<string, unknown>, LoginResponse>(
          "/admin/auth/login",
          { email, password }
        );
      } catch {
        // fetch itself failed (API down, wrong URL, CORS): there is no HTTP status.
        return {
          success: false,
          code: "INVALID_CREDENTIALS",
          message: "Can't reach the server. Check that the API is running and try again.",
        };
      }
      const { data, error } = response;
      if (error || !data?.admin || !data.tokens) return failure(error);

      setAccessToken(data.tokens.accessToken);
      return { success: true, admin: toProfile(data.admin), token: data.tokens.accessToken };
    },

    // The token argument is the console's marker; the API client sends the
    // stored access token itself (and refreshes it when it expires).
    async getCurrentSession() {
      const { data, error } = await apiClient.get<{ admin: BackendOperator }>("/admin/auth/session");
      if (error) {
        // Only a definite "no valid session" answer ends the session. A network
        // failure, throttle (429) or server error says nothing about it, so
        // throw and let the caller keep the sign-in for the next attempt.
        if (error.status === 401 || error.status === 403) return null;
        throw error;
      }
      if (!data?.admin) return null;
      return { admin: toProfile(data.admin) };
    },

    async logout() {
      try {
        // Revokes the session behind the httpOnly refresh cookie and clears it.
        await apiClient.post<Record<string, unknown>, unknown>("/auth/logout", {});
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
