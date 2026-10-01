import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState: { user: { id: string; name: string; email: string } | null; status: "loading" | "authenticated" | "unauthenticated" } = {
  user: null,
  status: "unauthenticated",
};

const cartState: { itemCount: number } = {
  itemCount: 0,
};

const appState = {
  selectedCampus: {
    id: "camp_1",
    name: "University of Lagos",
    abbreviation: "UNILAG",
    location: "Akoka, Lagos",
  },
};

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => authState,
}));

vi.mock("@/lib/cart-context", () => ({
  useCart: () => ({
    itemCount: cartState.itemCount,
  }),
}));

vi.mock("@/lib/app-context", () => ({
  useApp: () => appState,
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => "/home",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/notifications", () => ({
  NotificationBell: () => createElement("div", { "data-testid": "notification-bell" }, "Bell"),
}));

vi.mock("@/components/ui/Logo", () => ({
  Logo: () => createElement("div", { "data-testid": "logo" }, "Kampmax"),
}));

vi.mock("@/components/chat/UnreadMessageBadge", () => ({
  UnreadMessageBadge: () => null,
}));

vi.mock("@/hooks/use-messages", () => ({
  useUnreadMessageCount: () => ({ data: 0 }),
}));

import { MobileHeader } from "../MobileHeader";
import { DesktopNavigation } from "../DesktopNavigation";

describe("Guest Exploration Mode in Navigation", () => {
  beforeEach(() => {
    authState.user = null;
    authState.status = "unauthenticated";
    cartState.itemCount = 0;
  });

  it("renders 'Sign In' CTA and guest cart on MobileHeader when unauthenticated", () => {
    cartState.itemCount = 2;
    const markup = renderToStaticMarkup(createElement(MobileHeader));

    // Guests should have access to search, campus context, and cart
    expect(markup).toContain('href="/search"');
    expect(markup).toContain("UNILAG");
    expect(markup).toContain('href="/cart"');
    expect(markup).toContain("2"); // Cart badge count

    // Guests should see 'Sign In' rather than private notifications or profile
    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Sign In");
    expect(markup).not.toContain('href="/profile"');
    expect(markup).not.toContain("data-testid=\"notification-bell\"");
  });

  it("renders profile avatar and notifications for authenticated user on MobileHeader", () => {
    authState.user = { id: "u123", name: "Amara Okonkwo", email: "amara@unilag.edu.ng" };
    authState.status = "authenticated";

    const markup = renderToStaticMarkup(createElement(MobileHeader));

    expect(markup).toContain('href="/profile"');
    expect(markup).toContain("data-testid=\"notification-bell\"");
    expect(markup).not.toContain("Sign In");
  });

  it("renders 'Sign In' and 'Join' buttons on DesktopNavigation for guests", () => {
    const markup = renderToStaticMarkup(createElement(DesktopNavigation));

    expect(markup).toContain('href="/cart"');
    expect(markup).toContain('href="/login"');
    expect(markup).toContain("Sign In");
    expect(markup).toContain('href="/register"');
    expect(markup).toContain("Join");

    // Profile link and private messages should NOT be shown for guest
    expect(markup).not.toContain('href="/profile"');
    expect(markup).not.toContain('href="/chat"');
  });

  it("renders user avatar and name on DesktopNavigation for authenticated member", () => {
    authState.user = { id: "u456", name: "Tunde Bakare", email: "tunde@kampmax.ng" };
    authState.status = "authenticated";

    const markup = renderToStaticMarkup(createElement(DesktopNavigation));

    expect(markup).toContain('href="/profile"');
    expect(markup).toContain("Tunde Bakare");
    expect(markup).toContain('href="/chat"');
    expect(markup).not.toContain("Sign In");
    expect(markup).not.toContain("Join");
  });
});

import { isProtectedPath } from "@/app/(main)/layout";
import { safeReturnTo } from "@/app/(auth)/login/page";

describe("Guest Route Permissions (isProtectedPath)", () => {
  it("allows public exploration of browse routes", () => {
    expect(isProtectedPath("/home")).toBe(false);
    expect(isProtectedPath("/marketplace")).toBe(false);
    expect(isProtectedPath("/marketplace/prod-123")).toBe(false);
    expect(isProtectedPath("/events")).toBe(false);
    expect(isProtectedPath("/events/ev-999")).toBe(false);
    expect(isProtectedPath("/community")).toBe(false);
    expect(isProtectedPath("/community/thread-1")).toBe(false);
    expect(isProtectedPath("/jobs")).toBe(false);
    expect(isProtectedPath("/jobs/job-456")).toBe(false);
    expect(isProtectedPath("/nearby")).toBe(false);
    expect(isProtectedPath("/categories")).toBe(false);
    expect(isProtectedPath("/search")).toBe(false);
    expect(isProtectedPath("/more")).toBe(false);
    expect(isProtectedPath("/cart")).toBe(false);
    expect(isProtectedPath("/support")).toBe(false);
  });

  it("strictly protects transactional and personal account routes", () => {
    expect(isProtectedPath("/checkout")).toBe(true);
    expect(isProtectedPath("/pay")).toBe(true);
    expect(isProtectedPath("/orders")).toBe(true);
    expect(isProtectedPath("/orders/ord-123")).toBe(true);
    expect(isProtectedPath("/tickets")).toBe(true);
    expect(isProtectedPath("/chat")).toBe(true);
    expect(isProtectedPath("/profile")).toBe(true);
    expect(isProtectedPath("/profile/edit")).toBe(true);
    expect(isProtectedPath("/notifications")).toBe(true);
    expect(isProtectedPath("/community/create")).toBe(true);
    expect(isProtectedPath("/events/ev-123/checkout")).toBe(true);
    expect(isProtectedPath("/vendor")).toBe(true);
    expect(isProtectedPath("/vendor/products")).toBe(true);
    expect(isProtectedPath("/organizer")).toBe(true);
    expect(isProtectedPath("/employer")).toBe(true);
    expect(isProtectedPath("/freelancer")).toBe(true);
    expect(isProtectedPath("/service-provider")).toBe(true);
  });
});

describe("Login Redirection Protection (safeReturnTo)", () => {
  it("allows valid relative local paths", () => {
    expect(safeReturnTo("/marketplace/p-1")).toBe("/marketplace/p-1");
    expect(safeReturnTo("/checkout")).toBe("/checkout");
    expect(safeReturnTo("/events/ev-123/checkout")).toBe("/events/ev-123/checkout");
    expect(safeReturnTo("/profile")).toBe("/profile");
  });

  it("safely falls back to /home for invalid, empty, or open-redirect attempts", () => {
    expect(safeReturnTo(null)).toBe("/home");
    expect(safeReturnTo("")).toBe("/home");
    expect(safeReturnTo("//malicious.com")).toBe("/home");
    expect(safeReturnTo("https://evil.com")).toBe("/home");
    expect(safeReturnTo("http://attacker.com/login")).toBe("/home");
    expect(safeReturnTo("/\\evil.com")).toBe("/home");
    expect(safeReturnTo("/api/internal")).toBe("/home");
  });
});
