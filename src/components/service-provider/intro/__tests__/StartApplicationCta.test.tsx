// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const authState: { status: "loading" | "authenticated" | "unauthenticated" } = {
  status: "unauthenticated",
};
vi.mock("@/lib/auth-context", () => ({ useAuth: () => authState }));

import { StartApplicationCta } from "../StartApplicationCta";

afterEach(cleanup);

describe("StartApplicationCta", () => {
  it("asks a guest to create an account, which leads back into the application", () => {
    authState.status = "unauthenticated";
    render(<StartApplicationCta />);

    expect(
      screen.getByRole("link", { name: /create a free account to start/i }).getAttribute("href")
    ).toBe("/register?role=service_provider");
    // Existing accounts come back to step 1 after signing in.
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe(
      `/login?returnTo=${encodeURIComponent("/onboarding/service-provider/1")}`
    );
  });

  it("starts the application for a signed-in user", () => {
    authState.status = "authenticated";
    render(<StartApplicationCta />);

    expect(
      screen.getByRole("link", { name: /start your application/i }).getAttribute("href")
    ).toBe("/onboarding/service-provider/1");
    expect(screen.queryByText(/already have an account/i)).toBeNull();
  });

  it("offers the signed-in link while the session is still being checked", () => {
    authState.status = "loading";
    render(<StartApplicationCta />);

    expect(
      screen.getByRole("link", { name: /start your application/i }).getAttribute("href")
    ).toBe("/onboarding/service-provider/1");
  });

  it("leaves out the sign-in line when compact", () => {
    authState.status = "unauthenticated";
    render(<StartApplicationCta compact />);

    expect(screen.getByRole("link", { name: /create a free account to start/i })).toBeTruthy();
    expect(screen.queryByText(/already have an account/i)).toBeNull();
  });
});
