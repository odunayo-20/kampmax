// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, fireEvent } from "@testing-library/react";
import type { Offer } from "@/services/offers-api";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>,
}));

const mutate = vi.fn();
let offer: Offer;
vi.mock("@/hooks/use-offers", () => ({
  useOffer: () => ({ isPending: false, isError: false, data: offer }),
  useOfferAction: () => ({ mutate, isPending: false }),
}));

import { OfferCard } from "../OfferCard";

const baseOffer = (overrides: Partial<Offer> = {}): Offer => ({
  id: "o1",
  conversationId: "c1",
  title: "Landing page design",
  description: "Three sections, mobile-ready.",
  amount: 50000,
  currency: "NGN",
  deliveryDays: 7,
  milestones: [],
  status: "PENDING",
  expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  respondedAt: null,
  engagementId: null,
  viewerRole: "RECIPIENT",
  createdAt: new Date().toISOString(),
  ...overrides,
});

describe("OfferCard", () => {
  afterEach(cleanup);

  beforeEach(() => {
    mutate.mockReset();
    push.mockReset();
    offer = baseOffer();
  });

  it("lets the recipient accept and then opens their contracts", () => {
    mutate.mockImplementation((_id, options) => options.onSuccess?.());
    render(<OfferCard offerId="o1" />);

    expect(screen.getByText("Landing page design")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Accept offer" }));

    expect(mutate).toHaveBeenCalledWith("o1", expect.any(Object));
    expect(push).toHaveBeenCalledWith("/employer/contracts");
  });

  it("points the recipient to employer setup when accepting is forbidden", () => {
    mutate.mockImplementation((_id, options) => options.onError?.({ status: 403 }));
    render(<OfferCard offerId="o1" />);

    fireEvent.click(screen.getByRole("button", { name: "Accept offer" }));

    expect(screen.getByRole("alert").textContent).toContain("employer profile");
    expect(screen.getByRole("link", { name: "Set it up" }).getAttribute("href")).toBe("/onboarding/employer");
    expect(push).not.toHaveBeenCalled();
  });

  it("shows the payment plan, with dates, so the recipient sees it before accepting", () => {
    offer = baseOffer({
      milestones: [
        { title: "Design", description: null, amount: 20000, dueDate: "2099-01-10" },
        { title: "Build", description: null, amount: 30000, dueDate: null },
      ],
    });
    render(<OfferCard offerId="o1" />);

    expect(screen.getByText("2 milestones · paid one at a time")).toBeTruthy();
    expect(screen.getByText(/1\. Design/)).toBeTruthy();
    expect(screen.getByText(/Due .*2099/)).toBeTruthy();
    expect(screen.getByText("₦30,000")).toBeTruthy();
    // The one-click action is still right there.
    expect(screen.getByRole("button", { name: "Accept offer" })).toBeTruthy();
  });

  it("shows no plan for an offer that is one payment", () => {
    render(<OfferCard offerId="o1" />);
    expect(screen.queryByText(/milestones/)).toBeNull();
  });

  it("gives the freelancer only a withdraw action", () => {
    offer = baseOffer({ viewerRole: "FREELANCER" });
    render(<OfferCard offerId="o1" />);

    expect(screen.queryByRole("button", { name: "Accept offer" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Withdraw offer" }));
    expect(mutate).toHaveBeenCalledTimes(1);
  });

  it("shows no actions once the offer is answered, and links an accepted one to its contract", () => {
    offer = baseOffer({ status: "DECLINED" });
    const { unmount } = render(<OfferCard offerId="o1" />);
    expect(screen.queryByRole("button")).toBeNull();
    unmount();

    offer = baseOffer({ status: "ACCEPTED", engagementId: "e1", viewerRole: "FREELANCER" });
    render(<OfferCard offerId="o1" />);
    expect(screen.getByRole("link", { name: "View contract" }).getAttribute("href")).toBe(
      "/freelancer/contracts/e1"
    );
  });
});
