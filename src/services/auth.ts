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

  // After apiClient unwraps the NestJS envelope, the payload we receive is the
  // inner `data` object directly. Shapes by endpoint:
  //   LOGIN / REGISTER: { user: {...}, tokens: { accessToken, refreshToken } }
  //   TOKEN REFRESH:    { accessToken, refreshToken }
  // We also handle an unlikely passthrough where the full envelope arrives.
  const payload = raw as {
    // Inner `data` shape — login / register
    user?: {
      id: string;
      email: string;
      phone?: string | null;
      firstName?: string;
      lastName?: string;
      username?: string;
      avatar?: string | null;
      status?: string;
      emailVerifiedAt?: string | null;
      phoneVerifiedAt?: string | null;
      lastLoginAt?: string | null;
      createdAt?: string;
      updatedAt?: string;
    };
    tokens?: {
      accessToken?: string;
      refreshToken?: string;
    };
    // Token refresh shape
    accessToken?: string;
    refreshToken?: string;
    // Passthrough envelope fields (should already be unwrapped by apiClient,
    // but kept here for defensive coding)
    success?: boolean;
    message?: string | null;
  };

  // After apiClient unwrapping, the payload itself IS the data — it won't
  // have an explicit `success` field (that's the envelope wrapper). Treat it
  // as successful unless the function was called with an error object.
  const success = payload.success !== false;

  // Extract message — handle null from backend
  const extractedMessage = payload.message !== undefined
    ? (payload.message as string | null)
    : (success ? null : "Operation failed.");

  // Extract user — use the confirmed backend user shape
  let extractedUser: AuthUser | undefined;
  if (payload.user && payload.user.id) {
    const u = payload.user;
    extractedUser = {
      id: u.id,
      name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email,
      email: u.email,
      phone: u.phone ?? "",
      campusId: "", // not in confirmed backend user shape; keep empty
      role: "student", // default; role determined by RBAC later
      avatar: u.avatar ? "/api/avatar/" + u.avatar : "",
      isVerified: u.emailVerifiedAt != null,
    };
  }

  // Extract tokens — handle both possible unwrapped shapes:
  // LOGIN/REGISTER: { tokens: { accessToken, refreshToken } }
  // REFRESH:        { accessToken, refreshToken }
  let extractedAccessToken: string | undefined;
  let extractedRefreshToken: string | undefined;

  if (payload.tokens && typeof payload.tokens === "object") {
    // Login / register structure (already unwrapped by apiClient)
    extractedAccessToken = payload.tokens.accessToken;
    extractedRefreshToken = payload.tokens.refreshToken;
  } else if (payload.accessToken) {
    // Refresh token response structure
    extractedAccessToken = payload.accessToken;
    extractedRefreshToken = payload.refreshToken;
  }

  return {
    success,
    message: extractedMessage,
    user: extractedUser,
    accessToken: extractedAccessToken,
    refreshToken: extractedRefreshToken,
    token: extractedAccessToken,
  };
}

/**
 * Extracts user from a /auth/me response.
 *
 * The backend SafeUser shape (from GET /auth/me) is a FLAT object:
 *   { id, email, phone, firstName, lastName, username, avatar, status,
 *     emailVerifiedAt, phoneVerifiedAt, lastLoginAt, createdAt, updatedAt }
 *
 * There is NO nested `user` key and NO tokens — just the user fields directly.
 */
function extractUserFromMeResponse(raw: unknown): AuthUser | null {
  if (!raw || typeof raw !== "object") return null;

  const u = raw as {
    id?: string;
    email?: string;
    phone?: string | null;
    firstName?: string;
    lastName?: string;
    username?: string;
    avatar?: string | null;
    status?: string;
    emailVerifiedAt?: string | null;
  };

  // id and email are the minimum required fields
  if (!u.id || !u.email) return null;

  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || u.email,
    email: u.email,
    phone: u.phone ?? "",
    campusId: "", // not in backend SafeUser; will be added when campus module is connected
    role: "student" as "student" | "vendor" | "admin", // default; RBAC handled separately
    avatar: u.avatar ? `/api/avatar/${u.avatar}` : "",
    isVerified: u.emailVerifiedAt != null,
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

  const result = await apiClient.post<{ email: string; username: string; firstName: string; lastName: string; password: string; phone?: string }, unknown>("/auth/register", data);

  // If the API client reports an error, return a failure immediately
  if (result.error) {
    return { success: false, message: result.error.message ?? "Registration failed." };
  }

  return mapAuthResult(result.data);
}


/**
 * Login with email and password.
 * POST /api/v1/auth/login
 */
export async function login(data: LoginData): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<LoginData, unknown>("/auth/login", data);

  // If the API client reports an error, return a failure immediately
  if (result.error) {
    return { success: false, message: result.error.message ?? "Login failed." };
  }

  const mapped = mapAuthResult(result.data);

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
 * Verify a password reset OTP code.
 * POST /api/v1/auth/verify-reset-otp
 *
 * On success the backend returns a short-lived reset token ({ token }),
 * which the caller forwards to /reset-password.
 */
export async function verifyOtp(data: { email: string; code: string }): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<{ email: string; code: string }, { token?: string }>(
    "/auth/verify-reset-otp",
    data
  );

  if (result.error) {
    return { success: false, message: result.error.message ?? "Verification failed." };
  }

  const token = result.data?.token;
  if (!token) {
    return { success: false, message: "Verification failed." };
  }

  return { success: true, message: null, token };
}

/**
 * Resend a password reset OTP code.
 * POST /api/v1/auth/resend-otp
 */
export async function resendOtp(email: string): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<{ email: string }, { message?: string }>(
    "/auth/resend-otp",
    { email }
  );

  if (result.error) {
    return { success: false, message: result.error.message ?? "Failed to resend code." };
  }

  return { success: true, message: result.data?.message ?? null };
}

/**
 * Reset password with token.
 * POST /api/v1/auth/reset-password
 *
 * The backend's ResetPasswordDto only accepts { token, password } (validated
 * with whitelist: true, forbidNonWhitelisted: true) — confirmPassword is a
 * client-side-only field and must not be sent, or the request is rejected.
 */
export async function resetPassword(
  data: ResetPasswordData
): Promise<AuthResult> {
  await delay();

  const result = await apiClient.post<{ token: string; password: string }, AuthResult>(
    "/auth/reset-password",
    { token: data.token, password: data.password }
  );
  return mapAuthResult(result.error ?? result.data);
}

/**
 * Change the authenticated user's password.
 * POST /api/v1/auth/change-password
 *
 * The backend's ChangePasswordDto only accepts { currentPassword, newPassword }
 * (validated with whitelist: true, forbidNonWhitelisted: true) — the caller's
 * email is not sent; the user is identified via the bearer token.
 */
export async function changePassword(
  data: { email: string; currentPassword: string; newPassword: string }
): Promise<{ success: boolean; message: string }> {
  await delay();

  const result = await apiClient.post<
    { currentPassword: string; newPassword: string },
    { message?: string }
  >("/auth/change-password", {
    currentPassword: data.currentPassword,
    newPassword: data.newPassword,
  });

  if (result.error) {
    return { success: false, message: result.error.message ?? "Failed to change password." };
  }

  return { success: true, message: result.data?.message ?? "Password changed successfully." };
}

/**
 * Get current session — hydrates user from the backend.
 * GET /api/v1/auth/me
 *
 * The backend returns a flat SafeUser object (no tokens, no nested `user` key).
 * The `token` parameter is kept for signature compatibility but the API client
 * reads the access token from localStorage automatically.
 */
export async function getCurrentSession(
  token: string
): Promise<AuthResult> {
  const result = await apiClient.get<unknown>("/auth/me");

  if (result.error) {
    return { success: false, message: result.error.message };
  }

  const user = extractUserFromMeResponse(result.data);
  if (!user) {
    return { success: false, message: "Unable to restore session." };
  }

  return {
    success: true,
    message: null,
    user,
    // /auth/me does NOT return tokens — the caller already has the stored token
    accessToken: undefined,
    refreshToken: undefined,
  };
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