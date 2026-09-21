import {
  AuthUser,
  RegisterData,
  LoginData,
  ForgotPasswordData,
  ResetPasswordData,
  VerifyOtpData,
} from "@/types";
import { apiClient } from "@/lib/api-client";
import {
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
  getAccessToken,
  setAccessToken,
  getRefreshToken,
  setRefreshToken,
  clearAuthTokens,
  persistAuthTokens,
} from "@/lib/auth-storage";

// ============================================================
// MOCK DELAY — simulates network latency
// ============================================================

function delay(ms: number = 800): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================
// AUTH RESULT — enhanced with token fields
// ============================================================

export interface AuthResult {
  success: boolean;
  message: string | null;
  user?: AuthUser;
  token?: string; // access token (alias for backward compat)
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Maps a raw backend auth payload into AuthResult.
 * Handles multiple possible response shapes from the NestJS backend.
 */
function mapAuthResult(raw: unknown): AuthResult {
  const base: AuthResult = {
    success: false,
    message: "An error occurred.",
  };

  if (!raw || typeof raw !== "object") {
    return base;
  }

  const payload = raw as {
    success?: boolean;
    message?: string;
    user?: {
      id: string;
      email: string;
      phone: string;
      firstName: string;
      lastName: string;
      avatar: string;
      status: string;
      emailVerifiedAt: string | null;
      phoneVerifiedAt: string | null;
      lastLoginAt: string | null;
      createdAt: string;
      updatedAt: string;
    };
    data?: {
      tokens?: {
        accessToken: string;
        refreshToken: string;
      };
    };
    accessToken?: string;
    refreshToken?: string;
  };

  const success = payload.success === true;

  // Extract message — handle null from backend
  const extractedMessage = payload.message !== undefined ? payload.message : (success ? null : "Operation failed.");

  // Extract user — use the confirmed backend user shape
  let extractedUser: AuthUser | undefined;
  if (payload.user) {
    extractedUser = {
      id: payload.user.id,
      name: payload.user.firstName + " " + payload.user.lastName,
      email: payload.user.email,
      phone: payload.user.phone,
      campusId: "", // not in confirmed backend user shape; keep empty
      role: "student", // default; role determined by RBAC later
      avatar: payload.user.avatar ? "/api/avatar/" + payload.user.avatar : "",
      isVerified: payload.user.emailVerifiedAt !== null,
    };
  }

  // Extract tokens — handle BOTH structures:
  // LOGIN/REGISTER: { data: { tokens: { accessToken, refreshToken } } }
  // REFRESH: { data: { accessToken, refreshToken } }
  let extractedAccessToken: string | undefined;
  let extractedRefreshToken: string | undefined;

  const rawData = payload.data;
  if (rawData && typeof rawData === "object") {
    // Check for login/register structure: data.tokens.accessToken
    if (rawData.tokens && typeof rawData.tokens === "object") {
      const tokens = rawData.tokens as
        | { accessToken: string; refreshToken: string }
        | undefined;
      extractedAccessToken = tokens?.accessToken;
      extractedRefreshToken = tokens?.refreshToken;
    }
    // Check for refresh structure: data.accessToken
    else if ("accessToken" in rawData && rawData.accessToken !== null) {
      extractedAccessToken = String(rawData.accessToken);
      const rawRefresh = (rawData as { refreshToken?: unknown }).refreshToken;
      extractedRefreshToken = rawRefresh !== null ? String(rawRefresh) : undefined;
    }
  }

  return {
    success,
    message: extractedMessage as string | null,
    user: extractedUser,
    accessToken: extractedAccessToken,
    refreshToken: extractedRefreshToken,
    // Also keep token as alias for backward compat (legacy mock compatibility)
    token: extractedAccessToken ?? (("token" in payload && payload.token != null ? String(payload.token) : undefined)),
  };
}

/**
 * Extracts user from a /auth/me response.
 * If the backend returns user data, map it; otherwise return null.
 */
function extractUserFromMeResponse(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== "object") return null;

  const payload = raw as {
    user?: {
      id: string;
      name: string;
      email: string;
      phone: string;
      campusId: string;
      role: string;
      avatar: string;
      isVerified: boolean;
    };
  };

  if (!payload.user) return null;

  return {
    id: payload.user.id,
    name: payload.user.name,
    email: payload.user.email,
    phone: payload.user.phone,
    campusId: payload.user.campusId,
    role: payload.user.role as "student" | "vendor" | "admin",
    avatar: payload.user.avatar || "",
    isVerified: payload.user.isVerified === true,
  };
}

// ============================================================
// PUBLIC API — matches future NestJS endpoints
// ============================================================

/**
 * Register a new user.
 * POST /api/v1/auth/register
 * 
 * The backend RegisterDto accepts: email, username, firstName, lastName, password, phone (optional).
 * DO NOT send: campusId, role, department, level — the backend uses its own RBAC system
 * and will reject requests with unsupported properties (whitelist: true, forbidNonWhitelisted: true).
 */
export async function register(data: { email: string; username: string; firstName: string; lastName: string; password: string; phone?: string }): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<{ email: string; username: string; firstName: string; lastName: string; password: string; phone?: string }, AuthResult>("/auth/register", data);
  return mapAuthResult(result.error ?? result.data);
}

/**
 * Login with email and password.
 * POST /api/v1/auth/login
 */
export async function login(data: LoginData): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<LoginData, AuthResult>("/auth/login", data);
  let mapped = mapAuthResult(result.error ?? result.data);

  // If login succeeded but no user was returned, fetch /auth/me to hydrate
  if (mapped.success && !mapped.accessToken) {
    try {
      const meResult = await apiClient.get<AuthResult>("/auth/me");
      const meMapped = mapAuthResult(meResult.error ?? meResult.data);
      if (meMapped.success && meMapped.accessToken) {
        mapped = {
          ...mapped,
          accessToken: meMapped.accessToken,
          refreshToken: meMapped.refreshToken,
        };
      }
    } catch {
      // /auth/me failed — login succeeded without token data;
      // the UI can call getCurrentSession later if needed
    }
  }

  // Persist tokens if the backend returned them
  if (mapped.success && mapped.accessToken) {
    persistAuthTokens(mapped.accessToken, mapped.refreshToken ?? getRefreshToken());
    setAccessToken(mapped.accessToken);
    setRefreshToken(mapped.refreshToken ?? getRefreshToken());
  }

  return mapped;
}

/**
 * Send a password reset OTP.
 * POST /api/v1/auth/forgot-password
 */
export async function forgotPassword(
  data: ForgotPasswordData
): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<ForgotPasswordData, AuthResult>("/auth/forgot-password", data);
  return mapAuthResult(result.error ?? result.data);
}

/**
 * Verify OTP code.
 * NOTE: The backend does not expose a verify-otp endpoint.
 * This function accepts a single object argument matching the
 * useCallback signature in AuthProvider: { email, code }.
 */
export async function verifyOtp(_data: { email: string; code: string }): Promise<AuthResult> {
  return {
    success: false,
    message:
      "This verification flow is not supported by the backend. " +
      "Use the password reset link sent to your email instead.",
  };
}

/**
 * Resend OTP code.
 * NOTE: The backend does not expose a resend-otp endpoint.
 */
export async function resendOtp(_email: string): Promise<AuthResult> {
  return {
    success: false,
    message:
      "This resend flow is not supported by the backend. " +
      "Use the password reset link sent to your email instead.",
  };
}

/**
 * Reset password with token.
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(
  data: ResetPasswordData
): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<ResetPasswordData, AuthResult>("/auth/reset-password", data);
  return mapAuthResult(result.error ?? result.data);
}

/**
 * Change the authenticated user's password.
 * POST /api/v1/auth/change-password
 */
export async function changePassword(
  data: { email: string; currentPassword: string; newPassword: string }
): Promise<{ success: boolean; message: string }> {
  await delay();

  const result = await apiClient.post<
    { email: string; currentPassword: string; newPassword: string },
    { success: boolean; message: string }
  >("/auth/change-password", data);
  return result.data;
}

/**
 * Get current session — hydrates user from the backend.
 * GET /api/v1/auth/me
 *
 * The token parameter is kept for signature compatibility,
 * but the API client reads the access token from AuthProvider
 * localStorage internally.
 */
export async function getCurrentSession(
  token: string
): Promise<AuthResult> {
  // The apiClient reads the token from storage automatically;
  // the passed token param is ignored for that purpose.
  const result = await apiClient.get<AuthResult>("/auth/me");
  return mapAuthResult(result.error ?? result.data);
}

/**
 * Logout the current user.
 * POST /api/v1/auth/logout
 * 
 * The backend revokes the supplied refresh token.
 */
export async function logout(token: string): Promise<void> {
  await delay();

  // Read the current refresh token from storage to send to backend
  const currentRefreshToken = getRefreshToken();
  const refreshTokenForBackend = currentRefreshToken ?? undefined;
  
  // Call the backend logout endpoint with refresh token in body
  try {
    await apiClient.post<{ refreshToken?: string }, { success: boolean }>("/auth/logout", { refreshToken: refreshTokenForBackend });
  } catch {
    // Network error — continue with local cleanup
  }

  // Always clear local authentication state (resilient to network failure)
  clearAuthTokens();
  setAccessToken(null);
  setRefreshToken(null);
}

// ============================================================
// ACCOUNT MANAGEMENT (Module 30)
// ============================================================

export interface ChangePasswordData {
  email: string;
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResult {
  success: boolean;
  message: string;
}

/**
 * Validates a new password against the platform policy. Returns a
 * user-facing error message, or null when the password is acceptable.
 */
export function validatePasswordPolicy(password: string): string | null {
  if (password.length < 8) {
    return "Password must be at least 8 characters long.";
  }
  if (!/[a-z]/.test(password)) {
    return "Password must include a lowercase letter.";
  }
  if (!/[A-Z]/.test(password)) {
    return "Password must include an uppercase letter.";
  }
  if (!/\d/.test(password)) {
    return "Password must include a number.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "Password must include a symbol (e.g. !, @, #).";
  }
  return null;
}

/**
 * Deactivate the current user's account.
 * NOTE: The backend does not expose a deactivate endpoint.
 * This returns an honest error documenting the mismatch.
 */
export async function deactivateAccount(_token: string): Promise<AuthResult> {
  return {
    success: false,
    message:
      "Account deactivation is not yet supported by the backend. " +
      "Contact support to have your account deactivated.",
  };
}

/**
 * Permanently delete the current user's account.
 * NOTE: The backend does not expose a delete account endpoint.
 * This returns an honest error documenting the mismatch.
 */
export async function deleteAccount(
  _token: string,
  _verifiedEmail: string
): Promise<AuthResult> {
  return {
    success: false,
    message:
      "Account deletion is not yet supported by the backend. " +
      "Contact support to have your account permanently deleted.",
  };
}