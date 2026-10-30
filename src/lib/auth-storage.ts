/**
 * Shared token storage abstraction used by both the API client and AuthProvider.
 *
 * Preserves the existing localStorage key "kampmax_auth_token" for the access token
 * and adds a new key "kampmax_refresh_token" for the refresh token. Both live in
 * localStorage and are scoped to the same origin as the running application.
 *
 * Design rationale:
 *  - Access token key unchanged (module spec requirement to preserve "kampmax_auth_token").
 *  - Refresh token stored separately so the API client can read it on 401 without
 *    depending on AuthProvider internals.
 *  - All reads/writes are guarded for SSR (window check) and private-browsing quotas.
 *  - Console.log of tokens is intentionally omitted for security.
 */

import type { AuthUser } from "@/types";

export const ACCESS_TOKEN_KEY = "kampmax_auth_token";
export const REFRESH_TOKEN_KEY = "kampmax_refresh_token";

function store(): Storage {
  // Safe for SSR / window-less environments
  // @ts-expectError - window.localStorage may not be typed as Storage in all TS configs
  return typeof window !== "undefined" ? window.localStorage as Storage : {} as Storage;
}

/** Reads a key, returning null on the server (no localStorage) or if storage throws. */
function readKey(key: string): string | null {
  try {
    const s = store();
    const val = typeof s.getItem === "function" ? s.getItem(key) : null;
    if (!val || val === "null" || val === "undefined" || val.trim() === "") return null;
    return val;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return readKey(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  try {
    const s = store();
    if (token) {
      s.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      s.removeItem(ACCESS_TOKEN_KEY);
    }
  } catch {
    // private browsing / quota exceeded
  }
}

export function getRefreshToken(): string | null {
  return readKey(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string | null): void {
  try {
    const s = store();
    if (token) {
      s.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      s.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // private browsing / quota exceeded
  }
}

export function clearAuthTokens(): void {
  try {
    const s = store();
    s.removeItem(ACCESS_TOKEN_KEY);
    s.removeItem(REFRESH_TOKEN_KEY);
    // The remembered user belongs to the tokens, so it never outlives them.
    s.removeItem(AUTH_USER_KEY);
  } catch {
    // private browsing / quota exceeded
  }
}

// ── Remembered user ────────────────────────────────────────
//
// The last signed-in user, saved so a page refresh can show the signed-in app
// straight away while the session is confirmed in the background. It is only a
// display hint: the access token is still what authorises requests, and the
// session check replaces it with the server's answer.

export const AUTH_USER_KEY = "kampmax_auth_user";

/** The remembered user, or null if there is none or it isn't a usable record. */
export function getRememberedUser(): AuthUser | null {
  const raw = readKey(AUTH_USER_KEY);
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === "object" &&
      typeof (parsed as AuthUser).id === "string" &&
      typeof (parsed as AuthUser).role === "string"
    ) {
      return parsed as AuthUser;
    }
  } catch {
    // corrupted entry — treat as absent
  }
  return null;
}

export function setRememberedUser(user: AuthUser | null): void {
  try {
    const s = store();
    if (user) {
      s.setItem(AUTH_USER_KEY, JSON.stringify(user));
    } else {
      s.removeItem(AUTH_USER_KEY);
    }
  } catch {
    // private browsing / quota exceeded
  }
}

export function persistAuthTokens(
  access: string | null,
  refresh: string | null
): void {
  setAccessToken(access);
  setRefreshToken(refresh);
}