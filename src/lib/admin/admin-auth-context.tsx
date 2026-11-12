"use client";

// ============================================================
// ADMIN SESSION (Module 34)
//
// Session layer for the operations console. Unlike the previous
// auto-signed-in mock, an operator must authenticate through the
// admin auth service (the authorization boundary); the session token
// persists in localStorage and is revalidated on every app load.
// Frontend status is UX only — the backend (service layer) remains the
// security boundary. Consumers keep reading `useAdminSession()`, but
// `admin` may be `null` while status is "loading" or "unauthenticated".
// Route rendering is gated by the AuthBoundary in AdminShell; components
// should treat `admin === null` as "definitely not signed in".
// ============================================================

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { AdminProfile } from "@/types/admin";
import { adminAuthService } from "@/services/admin";
import { getAccessToken, hasAdminSessionHint, setAdminSessionHint } from "@/lib/auth-storage";
import { adminKeys } from "@/lib/query-keys";

/** Stand-in "token" for a session restored from the httpOnly refresh cookie.
 * The real access token lives in memory inside the API client; the console
 * only needs to know a session exists. */
const COOKIE_SESSION = "cookie-session";

export type AdminAuthStatus = "loading" | "authenticated" | "unauthenticated";

export type AdminSessionActionResult =
  | { success: true }
  | { success: false; message: string };

export interface AdminSessionValue {
  admin: AdminProfile | null;
  admins: AdminProfile[];
  status: AdminAuthStatus;
  token: string | null;
  /** The identity the operator originally signed in as (session scope). */
  baseAdmin: AdminProfile | null;
  /** True while the current `admin` differs from the original sign-in. */
  isSwitchedAccount: boolean;
  login: (
    email: string,
    password: string
  ) => Promise<AdminSessionActionResult>;
  logout: () => Promise<void>;
  switchAccount: (
    adminId: string
  ) => Promise<AdminSessionActionResult>;
  /** Switch back to the original sign-in identity (impersonation exit). */
  switchBackToBase: () => Promise<AdminSessionActionResult>;
}

const AdminSessionContext = createContext<AdminSessionValue | null>(null);

// Only a non-secret "an operator signed in here" hint is persisted (never a
// token), so a reload knows to ask the API for the session via the cookie.
function hasStoredSession(): boolean {
  return hasAdminSessionHint();
}

function persistToken(_token: string) {
  setAdminSessionHint(true);
}

function clearStoredToken() {
  setAdminSessionHint(false);
}

export function AdminSessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const [token, setToken] = useState<string | null>(null);
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [status, setStatus] = useState<AdminAuthStatus>("loading");
  const [baseAdminId, setBaseAdminId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      if (!hasStoredSession()) {
        setStatus("unauthenticated");
        return;
      }
      // No token in storage: the API client trades the refresh cookie for a
      // fresh access token on the first 401.
      const result = await adminAuthService.getCurrentSession(COOKIE_SESSION);
      if (cancelled) return;
      if (result) {
        setToken(getAccessToken() ?? COOKIE_SESSION);
        setAdmin(result.admin);
        setBaseAdminId(result.admin.id);
        setAdmins(await adminAuthService.listActiveAdmins());
        setStatus("authenticated");
      } else {
        clearStoredToken();
        setStatus("unauthenticated");
      }
    }

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<AdminSessionActionResult> => {
      const result = await adminAuthService.login({ email, password });
      if (!result.success) {
        return { success: false, message: result.message };
      }
      persistToken(result.token);
      setToken(result.token);
      setAdmin(result.admin);
      setBaseAdminId(result.admin.id);
      setAdmins(await adminAuthService.listActiveAdmins());
      setStatus("authenticated");
      return { success: true };
    },
    []
  );

  const logout = useCallback(async () => {
    const current = token;
    setStatus("loading");
    if (current) {
      await adminAuthService.logout(current);
    }
    clearStoredToken();
    setToken(null);
    setAdmin(null);
    setBaseAdminId(null);
    setStatus("unauthenticated");
    queryClient.removeQueries({ queryKey: adminKeys.all });
  }, [token, queryClient]);

  const switchAccount = useCallback(
    async (adminId: string): Promise<AdminSessionActionResult> => {
      if (!token) {
        return { success: false, message: "No active session." };
      }
      const result = await adminAuthService.switchAccount(token, adminId);
      if (!result.success) {
        return { success: false, message: result.message };
      }
      persistToken(result.token);
      setToken(result.token);
      setAdmin(result.admin);
      setStatus("authenticated");
      // Role/campus scope changed - drop any cached admin data.
      queryClient.removeQueries({ queryKey: adminKeys.all });
      return { success: true };
    },
    [token, queryClient]
  );

  const switchBackToBase = useCallback(async () => {
    if (!baseAdminId || !admin || baseAdminId === admin.id) {
      return { success: false, message: "No switched account to return from." };
    }
    return switchAccount(baseAdminId);
  }, [baseAdminId, admin, switchAccount]);

  const baseAdmin = useMemo(
    () => admins.find((a) => a.id === baseAdminId) ?? null,
    [admins, baseAdminId]
  );
  const isSwitchedAccount =
    baseAdminId !== null && admin !== null && baseAdminId !== admin.id;

  const value = useMemo(
    () => ({
      admin,
      admins,
      status,
      token,
      baseAdmin,
      isSwitchedAccount,
      login,
      logout,
      switchAccount,
      switchBackToBase,
    }),
    [
      admin,
      admins,
      status,
      token,
      baseAdmin,
      isSwitchedAccount,
      login,
      logout,
      switchAccount,
      switchBackToBase,
    ]
  );

  return (
    <AdminSessionContext.Provider value={value}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) {
    throw new Error(
      "useAdminSession must be used within AdminSessionProvider"
    );
  }
  return ctx;
}