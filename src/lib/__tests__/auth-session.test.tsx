// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import type { AuthUser } from "@/types";
import type { AuthResult } from "@/services/auth";

vi.mock("@/services/auth", () => ({
  getCurrentSession: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  forgotPassword: vi.fn(),
  verifyOtp: vi.fn(),
  resetPassword: vi.fn(),
  resendOtp: vi.fn(),
}));
vi.mock("@/lib/api-client", () => ({
  onAuthFailure: vi.fn(() => () => {}),
  refreshAuth: vi.fn(),
}));

import * as authService from "@/services/auth";
import { refreshAuth } from "@/lib/api-client";
import { AuthProvider, useAuth } from "../auth-context";
import {
  AUTH_USER_KEY,
  LEGACY_TOKEN_KEYS,
  clearAuthTokens,
  getAccessToken,
  getRememberedUser,
  purgeLegacyTokens,
  setAccessToken,
  setRememberedUser,
} from "../auth-storage";

const ada: AuthUser = {
  id: "u1",
  name: "Ada",
  email: "ada@example.com",
  phone: "",
  campusId: "c1",
  role: "student",
  avatar: "",
  isVerified: true,
};

function Probe() {
  const { status, user } = useAuth();
  return <p data-testid="out">{`${status}:${user?.name ?? "-"}`}</p>;
}

function renderProvider() {
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>
  );
  return screen.getByTestId("out");
}

/** A session check the test resolves by hand, to look at the state in between. */
function pendingSession() {
  let resolve!: (result: AuthResult) => void;
  const promise = new Promise<AuthResult>((r) => {
    resolve = r;
  });
  vi.mocked(authService.getCurrentSession).mockReturnValue(promise);
  return resolve;
}

beforeEach(() => {
  localStorage.clear();
  setAccessToken(null);
  vi.mocked(authService.getCurrentSession).mockReset();
  vi.mocked(refreshAuth).mockReset();
});

afterEach(cleanup);

describe("remembered user storage", () => {
  it("round-trips the user", () => {
    setRememberedUser(ada);
    expect(getRememberedUser()).toEqual(ada);
  });

  it("ignores a corrupted or incomplete entry", () => {
    localStorage.setItem(AUTH_USER_KEY, "{not json");
    expect(getRememberedUser()).toBeNull();
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify({ name: "no id" }));
    expect(getRememberedUser()).toBeNull();
  });

  it("is cleared together with the access token", () => {
    setAccessToken("a");
    setRememberedUser(ada);
    clearAuthTokens();
    expect(getRememberedUser()).toBeNull();
    expect(getAccessToken()).toBeNull();
  });
});

describe("token storage security", () => {
  it("keeps the access token in memory only, never in localStorage", () => {
    setAccessToken("secret-access-token");
    expect(getAccessToken()).toBe("secret-access-token");
    const everything = JSON.stringify({ ...localStorage });
    expect(everything).not.toContain("secret-access-token");
    expect(localStorage.length).toBe(0);
  });

  it("deletes tokens that older builds left in localStorage", () => {
    for (const key of LEGACY_TOKEN_KEYS) localStorage.setItem(key, "old-token");
    purgeLegacyTokens();
    for (const key of LEGACY_TOKEN_KEYS) expect(localStorage.getItem(key)).toBeNull();
  });
});

describe("AuthProvider session restore", () => {
  it("is signed out straight away when nobody is remembered, with no network call", () => {
    expect(renderProvider().textContent).toBe("unauthenticated:-");
    expect(refreshAuth).not.toHaveBeenCalled();
    expect(authService.getCurrentSession).not.toHaveBeenCalled();
  });

  it("restores a remembered user by trading the refresh cookie, then applies the server's answer", async () => {
    setRememberedUser(ada);
    vi.mocked(refreshAuth).mockImplementation(async () => {
      setAccessToken("fresh");
      return "fresh";
    });
    const resolve = pendingSession();

    const out = renderProvider();
    expect(out.textContent).toBe("loading:-");

    await waitFor(() => expect(authService.getCurrentSession).toHaveBeenCalledWith("fresh"));
    resolve({ success: true, message: null, user: { ...ada, name: "Ada L." } });
    await waitFor(() => expect(out.textContent).toBe("authenticated:Ada L."));
    expect(getRememberedUser()?.name).toBe("Ada L.");
  });

  it("does not refresh again when an access token is already in memory", async () => {
    setAccessToken("in-memory");
    setRememberedUser(ada);
    const resolve = pendingSession();

    const out = renderProvider();
    resolve({ success: true, message: null, user: ada });
    await waitFor(() => expect(out.textContent).toBe("authenticated:Ada"));
    expect(refreshAuth).not.toHaveBeenCalled();
  });

  it("signs out and forgets everything when there is no valid session cookie", async () => {
    setRememberedUser(ada);
    vi.mocked(refreshAuth).mockResolvedValue(null);

    const out = renderProvider();

    await waitFor(() => expect(out.textContent).toBe("unauthenticated:-"));
    expect(getAccessToken()).toBeNull();
    expect(getRememberedUser()).toBeNull();
    expect(authService.getCurrentSession).not.toHaveBeenCalled();
  });

  it("signs out when the server rejects the session", async () => {
    setRememberedUser(ada);
    vi.mocked(refreshAuth).mockResolvedValue("fresh");
    const resolve = pendingSession();

    const out = renderProvider();
    await waitFor(() => expect(authService.getCurrentSession).toHaveBeenCalled());
    resolve({ success: false, message: "Unauthorized" });

    await waitFor(() => expect(out.textContent).toBe("unauthenticated:-"));
    expect(getRememberedUser()).toBeNull();
  });

  it("keeps the remembered user when the server can't be reached during the refresh", async () => {
    setRememberedUser(ada);
    vi.mocked(refreshAuth).mockRejectedValue(new TypeError("Failed to fetch"));

    const out = renderProvider();

    await waitFor(() => expect(out.textContent).toBe("authenticated:Ada"));
    expect(getRememberedUser()).toEqual(ada);
  });

  it("keeps a remembered session when the session check can't reach the server", async () => {
    setRememberedUser(ada);
    vi.mocked(refreshAuth).mockResolvedValue("fresh");
    const resolve = pendingSession();

    const out = renderProvider();
    await waitFor(() => expect(authService.getCurrentSession).toHaveBeenCalled());
    await act(async () => {
      resolve({ success: false, message: "Network request failed", unreachable: true });
    });

    expect(out.textContent).toBe("authenticated:Ada");
  });
});
