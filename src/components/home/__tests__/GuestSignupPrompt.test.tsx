// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const auth = vi.hoisted(() => ({ status: "unauthenticated" }));
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ status: auth.status }) }));

import { GuestSignupPrompt } from "../GuestSignupPrompt";

afterEach(cleanup);

describe("GuestSignupPrompt", () => {
  it("invites signed-out visitors to create an account or sign in", () => {
    auth.status = "unauthenticated";
    render(<GuestSignupPrompt />);

    expect(screen.getByRole("link", { name: "Create free account" }).getAttribute("href")).toBe("/register");
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/login");
  });

  it.each(["loading", "authenticated"])("stays hidden while the session is %s", (status) => {
    auth.status = status;
    const { container } = render(<GuestSignupPrompt />);

    expect(container.innerHTML).toBe("");
  });
});
