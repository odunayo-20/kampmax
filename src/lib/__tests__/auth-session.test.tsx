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
}));

import * as authService from "@/services/auth";
import { AuthProvider, useAuth } from "../auth-context";
import {
  ACCESS_TOKEN_KEY,
  AUTH_USER_KEY,
  REFRESH_TOKEN_KEY,
  clearAuthTokens,
  getRememberedUser,
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
  vi.mocked(authService.getCurrentSession).mockReset();
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

  it("is cleared together with the tokens", () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "a");
    setRememberedUser(ada);
    clearAuthTokens();
    expect(getRememberedUser()).toBeNull();
  });
});

describe("AuthProvider session restore", () => {
  it("is signed out straight away without a token", () => {
    expect(renderProvider().textContent).toBe("unauthenticated:-");
    expect(authService.getCurrentSession).not.toHaveBeenCalled();
  });

  it("shows the remembered user before the session check finishes, then applies the server's answer", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    setRememberedUser(ada);
    const resolve = pendingSession();

    const out = renderProvider();
    expect(out.textContent).toBe("authenticated:Ada");

    resolve({ success: true, message: null, user: { ...ada, name: "Ada L." } });
    await waitFor(() => expect(out.textContent).toBe("authenticated:Ada L."));
    expect(getRememberedUser()?.name).toBe("Ada L.");
  });

  it("waits for the session check when nobody is remembered", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    const resolve = pendingSession();

    const out = renderProvider();
    expect(out.textContent).toBe("loading:-");

    resolve({ success: true, message: null, user: ada });
    await waitFor(() => expect(out.textContent).toBe("authenticated:Ada"));
    expect(getRememberedUser()).toEqual(ada);
  });

  it("signs out and forgets everything when the server rejects the session", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    localStorage.setItem(REFRESH_TOKEN_KEY, "refresh");
    setRememberedUser(ada);
    const resolve = pendingSession();

    const out = renderProvider();
    resolve({ success: false, message: "Unauthorized" });

    await waitFor(() => expect(out.textContent).toBe("unauthenticated:-"));
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(getRememberedUser()).toBeNull();
  });

  it("keeps a remembered session when the server can't be reached", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    setRememberedUser(ada);
    const resolve = pendingSession();

    const out = renderProvider();
    // act() flushes the provider's reaction to the result before we look at it.
    await act(async () => {
      resolve({ success: false, message: "Network request failed", unreachable: true });
    });

    expect(out.textContent).toBe("authenticated:Ada");
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("token");
  });

  it("stops waiting, but keeps the token, when it can't be reached and nobody is remembered", async () => {
    localStorage.setItem(ACCESS_TOKEN_KEY, "token");
    const resolve = pendingSession();

    const out = renderProvider();
    resolve({ success: false, message: "Network request failed", unreachable: true });

    await waitFor(() => expect(out.textContent).toBe("unauthenticated:-"));
    expect(localStorage.getItem(ACCESS_TOKEN_KEY)).toBe("token");
  });
});
