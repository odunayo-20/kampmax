// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

const authState: { status: "loading" | "authenticated" | "unauthenticated" } = {
  status: "unauthenticated",
};
vi.mock("@/lib/auth-context", () => ({ useAuth: () => authState }));

const track = vi.fn();
vi.mock("@/lib/analytics", () => ({ track: (...args: unknown[]) => track(...args) }));

import { StartApplicationCta } from "../StartApplicationCta";

afterEach(() => {
  cleanup();
  track.mockReset();
});

describe("StartApplicationCta", () => {
  it("asks a guest to create an account, which leads back into the application", () => {
    authState.status = "unauthenticated";
    render(<StartApplicationCta placement="hero" />);

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
    render(<StartApplicationCta placement="hero" />);

    expect(
      screen.getByRole("link", { name: /start your application/i }).getAttribute("href")
    ).toBe("/onboarding/service-provider/1");
    expect(screen.queryByText(/already have an account/i)).toBeNull();
  });

  it("offers the signed-in link while the session is still being checked", () => {
    authState.status = "loading";
    render(<StartApplicationCta placement="hero" />);

    expect(
      screen.getByRole("link", { name: /start your application/i }).getAttribute("href")
    ).toBe("/onboarding/service-provider/1");
  });

  it("records which button was clicked, and whether the visitor was a guest", () => {
    authState.status = "unauthenticated";
    const { rerender } = render(<StartApplicationCta placement="hero" />);
    fireEvent.click(screen.getByRole("link", { name: /create a free account to start/i }));
    expect(track).toHaveBeenLastCalledWith("sp_intro_cta_clicked", {
      placement: "hero",
      audience: "guest",
    });

    authState.status = "authenticated";
    rerender(<StartApplicationCta placement="bottom" />);
    fireEvent.click(screen.getByRole("link", { name: /start your application/i }));
    expect(track).toHaveBeenLastCalledWith("sp_intro_cta_clicked", {
      placement: "bottom",
      audience: "member",
    });
  });

  it("leaves out the sign-in line when compact", () => {
    authState.status = "unauthenticated";
    render(<StartApplicationCta placement="sticky" compact />);

    expect(screen.getByRole("link", { name: /create a free account to start/i })).toBeTruthy();
    expect(screen.queryByText(/already have an account/i)).toBeNull();
  });
});
