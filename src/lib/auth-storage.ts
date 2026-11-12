/**
 * Shared session storage used by both the API client and AuthProvider.
 *
 * SECURITY MODEL
 *  - The ACCESS token lives only in memory (a module variable). It is never
 *    written to localStorage/sessionStorage, so a script injected into the page
 *    cannot lift it from storage, and it disappears when the tab closes. It is
 *    short-lived (15 minutes) anyway.
 *  - The REFRESH token is never visible to JavaScript at all. The backend keeps
 *    it in an httpOnly cookie (see kampmax-backend auth/refresh-cookie.ts); the
 *    API client sends `credentials: "include"` and `X-Kampmax-Client: web`, and
 *    a page load restores the session by asking /auth/refresh for a new access
 *    token.
 *  - What localStorage still holds is non-secret display data: the remembered
 *    user (so a refresh can paint the signed-in app) and the query cache. Both
 *    are cleared on sign-out.
 *
 * Tokens left in localStorage by older builds are deleted on first load.
 */

import type { AuthUser } from "@/types";

/** Keys used by builds that stored tokens in localStorage. Only ever removed. */
export const LEGACY_TOKEN_KEYS = [
  "kampmax_auth_token",
  "kampmax_refresh_token",
  "kampmax_admin_token",
] as const;
/** Where the dashboard query cache is saved (see lib/query-persistence.ts). */
export const QUERY_CACHE_KEY = "kampmax_query_cache";
export const AUTH_USER_KEY = "kampmax_auth_user";
/** Non-secret marker: "an operator signed in on this browser". Not a token. */
export const ADMIN_SESSION_HINT_KEY = "kampmax_admin_session";

let accessTokenInMemory: string | null = null;

function store(): Storage | null {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null; // storage blocked (privacy mode, sandboxed frame)
  }
}

/** Reads a key, returning null on the server, if storage throws, or for junk values. */
function readKey(key: string): string | null {
  try {
    const val = store()?.getItem(key) ?? null;
    if (!val || val === "null" || val === "undefined" || val.trim() === "") return null;
    return val;
  } catch {
    return null;
  }
}

/** Deletes tokens persisted by older builds. Safe to call any time. */
export function purgeLegacyTokens(): void {
  try {
    const s = store();
    if (!s) return;
    for (const key of LEGACY_TOKEN_KEYS) s.removeItem(key);
  } catch {
    // storage unavailable
  }
}

// Run once when the module loads in a browser, before any session logic.
purgeLegacyTokens();

export function getAccessToken(): string | null {
  return accessTokenInMemory;
}

export function setAccessToken(token: string | null): void {
  accessTokenInMemory = token || null;
}

/** Forgets the session on this device (the server clears the refresh cookie). */
export function clearAuthTokens(): void {
  accessTokenInMemory = null;
  try {
    const s = store();
    // The remembered user and the saved dashboard data belong to the session,
    // so neither outlives it.
    s?.removeItem(AUTH_USER_KEY);
    s?.removeItem(QUERY_CACHE_KEY);
    s?.removeItem(ADMIN_SESSION_HINT_KEY);
    purgeLegacyTokens();
  } catch {
    // storage unavailable
  }
}

// ── Remembered user ────────────────────────────────────────
//
// The last signed-in user, saved so a page refresh can show who is signed in
// while the session is confirmed in the background. It is only a display hint:
// the access token authorises requests, and the session check replaces it with
// the server's answer.

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
    if (!s) return;
    if (user) s.setItem(AUTH_USER_KEY, JSON.stringify(user));
    else s.removeItem(AUTH_USER_KEY);
  } catch {
    // storage unavailable / quota exceeded
  }
}

// ── Operator session hint ──────────────────────────────────

export function hasAdminSessionHint(): boolean {
  return readKey(ADMIN_SESSION_HINT_KEY) === "1";
}

export function setAdminSessionHint(on: boolean): void {
  try {
    const s = store();
    if (!s) return;
    if (on) s.setItem(ADMIN_SESSION_HINT_KEY, "1");
    else s.removeItem(ADMIN_SESSION_HINT_KEY);
  } catch {
    // storage unavailable
  }
}
