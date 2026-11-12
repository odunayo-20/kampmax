"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  ReactNode,
} from "react";
import { AuthUser, AuthStatus } from "@/types";
import * as authService from "@/services/auth";
import { onAuthFailure, refreshAuth } from "@/lib/api-client";
import {
  clearAuthTokens,
  getAccessToken,
  getRememberedUser,
  setAccessToken as storeAccessToken,
  setRememberedUser,
} from "@/lib/auth-storage";
import { setCurrentAuthUser } from "@/lib/current-user-store";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  login: (email: string, password: string) => Promise<authService.AuthResult>;
  register: (data: {
    email: string;
    username: string;
    firstName: string;
    lastName: string;
    password: string;
    phone?: string;
  }) => Promise<authService.AuthResult>;
  logout: () => Promise<void>;
  forgotPassword: (email: string) => Promise<authService.AuthResult>;
  verifyOtp: (
    email: string,
    code: string
  ) => Promise<authService.AuthResult>;
  resetPassword: (
    token: string,
    password: string,
    confirmPassword: string
  ) => Promise<authService.AuthResult>;
  resendOtp: (email: string) => Promise<authService.AuthResult>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always starts as "loading", so the server render and the first client render
  // match. The session is restored in a layout effect below, before first paint.
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Keep the synchronous current-user bridge (read by mock data services
  // outside React) in lockstep with the real authenticated user. A layout effect
  // runs before the children's effects, so their first requests see the user.
  useLayoutEffect(() => {
    setCurrentAuthUser(user);
  }, [user]);

  /** Marks the user as signed in and remembers them for the next page load. */
  const applySession = useCallback(
    (nextUser: AuthUser | null, access: string | null) => {
      setUser(nextUser);
      setAccessToken(access);
      setRememberedUser(nextUser);
      setStatus("authenticated");
    },
    []
  );

  /** Signs the user out locally: tokens and the remembered user are all cleared. */
  const endSession = useCallback(() => {
    clearAuthTokens();
    setAccessToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, []);

  // Restore the session on mount.
  //
  // The access token only lives in memory, so after a page load it is gone. If a
  // user was remembered here (a display hint, not a credential), ask the API to
  // trade the httpOnly refresh cookie for a new access token, then confirm the
  // session with /auth/me. Nobody remembered means nobody to restore: no request
  // is made. When the server says the session is invalid, the user is signed out;
  // when it can't be reached, the remembered user is kept (a network blip must
  // not sign anyone out).
  // NOTE: /auth/me returns the user object only — no new tokens.
  useLayoutEffect(() => {
    const remembered = getRememberedUser();
    if (!remembered && !getAccessToken()) {
      setStatus("unauthenticated");
      return;
    }

    let cancelled = false;
    (async () => {
      let token: string | null;
      try {
        token = getAccessToken() ?? (await refreshAuth());
      } catch {
        // Server unreachable: not a verdict on the session. Keep who we know.
        if (cancelled) return;
        if (remembered) applySession(remembered, null);
        else setStatus("unauthenticated");
        return;
      }
      if (cancelled) return;
      if (!token) {
        endSession(); // no valid session cookie
        return;
      }
      const result = await authService.getCurrentSession(token);
      if (cancelled) return;
      if (result.success && result.user) {
        applySession(result.user, getAccessToken() ?? token);
      } else if (result.unreachable) {
        if (remembered) applySession(remembered, getAccessToken() ?? token);
        else setStatus("unauthenticated");
      } else {
        endSession();
      }
    })().catch(() => {
      if (!cancelled) endSession();
    });

    return () => {
      cancelled = true;
    };
  }, [applySession, endSession]);

  // Subscribe to auth failure notifications from the API client
  useEffect(() => onAuthFailure(endSession), [endSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authService.login({ email, password });
      if (result.success && result.user && result.accessToken) {
        storeAccessToken(result.accessToken);
        applySession(result.user, result.accessToken);
      }
      return result;
    },
    [applySession]
  );

  const register = useCallback(
    async (data: {
      email: string;
      username: string;
      firstName: string;
      lastName: string;
      password: string;
      phone?: string;
    }) => {
      const result = await authService.register(data);
      if (result.success && result.accessToken) {
        storeAccessToken(result.accessToken);
        applySession(result.user ?? null, result.accessToken);
      }
      return result;
    },
    [applySession]
  );

  const logout = useCallback(async () => {
    await authService.logout(accessToken ?? "");
    endSession();
  }, [accessToken, endSession]);

  const forgotPassword = useCallback(async (email: string) => {
    return authService.forgotPassword({ email });
  }, []);

  const verifyOtp = useCallback(async (email: string, code: string) => {
    return authService.verifyOtp({ email, code });
  }, []);

  const resetPassword = useCallback(
    async (resetToken: string, password: string, confirmPassword: string) => {
      return authService.resetPassword({
        token: resetToken,
        password,
        confirmPassword,
      });
    },
    []
  );

  const resendOtp = useCallback(async (email: string) => {
    return authService.resendOtp(email);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        status,
        user,
        accessToken,
        login,
        register,
        logout,
        forgotPassword,
        verifyOtp,
        resetPassword,
        resendOtp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
