"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { AuthUser, AuthStatus, UserRole } from "@/types";
import * as authService from "@/services/auth";
import { onAuthFailure } from "@/lib/api-client";
import { clearAuthTokens } from "@/lib/auth-storage";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
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

const TOKEN_KEY = "kampmax_auth_token";
const REFRESH_TOKEN_KEY = "kampmax_refresh_token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    return null;
  }
}

function setStoredToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // private browsing or quota exceeded
  }
}

function setStoredRefreshToken(token: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (token) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {
    // private browsing or quota exceeded
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);

  // Restore session on mount
  useEffect(() => {
    const stored = getStoredToken();
    const storedRefresh = getStoredRefreshToken();

    if (!stored) {
      setStatus("unauthenticated");
      return;
    }

    // Try to hydrate the user from the backend.
    // NOTE: /auth/me returns the user object only — no new tokens.
    // If we get a valid user back, the session is alive; keep the already-stored token.
    authService
      .getCurrentSession(stored)
      .then((result) => {
        if (result.success && result.user) {
          setUser(result.user);
          // Keep the stored access token as state (the API client already uses it from localStorage)
          setAccessToken(stored);
          setRefreshToken(storedRefresh);
          setStatus("authenticated");
        } else {
          // Session invalid — clear tokens and fall to login
          clearAuthTokens();
          setAccessToken(null);
          setRefreshToken(null);
          setStoredToken(null);
          setStoredRefreshToken(null);
          setStatus("unauthenticated");
        }
      })
      .catch(() => {
        // Session validation failed — clear tokens
        clearAuthTokens();
        setAccessToken(null);
        setRefreshToken(null);
        setStoredToken(null);
        setStoredRefreshToken(null);
        setStatus("unauthenticated");
      });
  }, []);

  // Subscribe to auth failure notifications from the API client
  useEffect(() => {
    const unsubscribe = onAuthFailure(() => {
      clearAuthTokens();
      setAccessToken(null);
      setRefreshToken(null);
      setStoredToken(null);
      setStoredRefreshToken(null);
      setUser(null);
      setStatus("unauthenticated");
    });
    return unsubscribe;
  }, []);

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await authService.login({ email, password });
      if (result.success && result.user && result.accessToken) {
        setUser(result.user);
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken ?? getStoredRefreshToken() ?? "");
        setStoredToken(result.accessToken);
        setStoredRefreshToken(result.refreshToken ?? getStoredRefreshToken() ?? "");
        setStatus("authenticated");
      }
      return result;
    },
    []
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
        setUser(result.user ?? null);
        setAccessToken(result.accessToken);
        setRefreshToken(result.refreshToken ?? getStoredRefreshToken() ?? "");
        setStoredToken(result.accessToken);
        setStoredRefreshToken(result.refreshToken ?? getStoredRefreshToken() ?? "");
        setStatus("authenticated");
      }
      return result;
    },
    []
  );

  const logout = useCallback(async () => {
    const current = accessToken;
    await authService.logout(current ?? "");
    clearAuthTokens();
    setAccessToken(null);
    setRefreshToken(null);
    setStoredToken(null);
    setStoredRefreshToken(null);
    setUser(null);
    setStatus("unauthenticated");
  }, [accessToken]);

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
        refreshToken,
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