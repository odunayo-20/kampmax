/**
 * Where you are signed in, and closing the account.
 * Backend: POST /auth/sessions, POST /auth/sessions/revoke-others, DELETE /auth/sessions/:id, /users/me/closure.
 * The browser's own sign-in travels in the httpOnly cookie, so nothing is sent to say which session is "this one".
 */

import { apiClient, type ApiError } from "@/lib/api-client";
import type { ClosureBlocker, Session } from "@/lib/account-safety";

/** Every call here either returns its data or throws the ApiError, so the screens can use react-query as it is. */
async function orThrow<T>(call: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await call;
  if (error) throw error;
  return data;
}

export async function fetchSessions(): Promise<Session[]> {
  const body = await orThrow(apiClient.post<Record<string, never>, { sessions: Session[] }>("/auth/sessions", {}));
  return body.sessions ?? [];
}

export function signOutSession(id: string): Promise<unknown> {
  return orThrow(apiClient.delete(`/auth/sessions/${encodeURIComponent(id)}`));
}

export function signOutOtherSessions(): Promise<{ revoked: number }> {
  return orThrow(apiClient.post<Record<string, never>, { revoked: number }>("/auth/sessions/revoke-others", {}));
}

/** What still has to be finished before the account can close. Empty means it can. */
export async function fetchClosureBlockers(): Promise<ClosureBlocker[]> {
  const body = await orThrow(apiClient.get<{ blockers: ClosureBlocker[] }>("/users/me/closure"));
  return body.blockers ?? [];
}

/** Closes the account for good. The error keeps its status, so the screen can tell a wrong password from an open order. */
export function closeAccount(password: string): Promise<unknown> {
  return orThrow(apiClient.post("/users/me/closure", { password }));
}
