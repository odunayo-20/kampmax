/**
 * Synchronous bridge between the real (async, React-state) auth session and
 * the many synchronous `getCurrentUser()` call sites across the mock data
 * services (freelancer, vendor, employer dashboards, etc).
 *
 * AuthProvider is the sole writer (kept in sync with its `user` state);
 * everything else only reads.
 */

import type { AuthUser } from "@/types";

let currentAuthUser: AuthUser | null = null;

export function setCurrentAuthUser(user: AuthUser | null): void {
  currentAuthUser = user;
}

export function getCurrentAuthUser(): AuthUser | null {
  return currentAuthUser;
}
