// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { a11yViolations } from "@/test/axe";
import { MoneyTimeline } from "../MoneyTimeline";
import { HelpAndDisputeCard } from "../HelpAndDisputeCard";
import { contractMoneyTimeline, orderMoneyTimeline } from "../money-steps";
import { RouteError } from "@/components/feedback/RouteError";
import { OpenDisputeModal } from "@/components/orders/OpenDisputeModal";
import NotFound from "@/app/not-found";
import type { Order } from "@/types";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const expectClean = async (el: Element) => expect(await a11yViolations(el)).toEqual([]);
const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {});

const order = { id: "KMX-1001", total: 5000, status: "confirmed" } as unknown as Order;

describe("money and trust screens pass automated accessibility checks", () => {
  it("money timeline, in every state an order can be in", async () => {
    for (const status of ["placed", "preparing", "out_for_delivery", "delivered", "cancelled"] as const) {
      const { container, unmount } = render(
        <MoneyTimeline model={orderMoneyTimeline({ status, total: 5000, settled: false, dispute: undefined })} />
      );
      await expectClean(container);
      unmount();
    }
  });

  it("money timeline with an open dispute (blocked step)", async () => {
    const { container } = render(
      <MoneyTimeline
        model={orderMoneyTimeline({
          status: "delivered",
          total: 5000,
          settled: false,
          dispute: { openedAt: "2026-11-01T00:00:00Z", reason: "Broken" },
        })}
      />
    );
    await expectClean(container);
  });

  it("contract money timeline for both parties", async () => {
    const eng = {
      status: "SUBMITTED",
      agreedAmount: 90000,
      paymentType: "FIXED",
      feeRate: 5,
      autoReleaseAt: "2026-12-01T00:00:00Z",
      milestones: [],
      currentMilestonePosition: 1,
    } as never;
    for (const party of ["employer", "freelancer"] as const) {
      const { container, unmount } = render(<MoneyTimeline model={contractMoneyTimeline(eng, party)} />);
      await expectClean(container);
      unmount();
    }
  });

  it("marks the current step for assistive tech, and spells out state in text (not colour alone)", () => {
    render(<MoneyTimeline model={orderMoneyTimeline({ status: "preparing", total: 5000, settled: false })} />);
    const current = screen.getAllByRole("listitem").filter((li) => li.getAttribute("aria-current") === "step");
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toMatch(/now/i);
  });

  it("help and dispute card", async () => {
    const { container } = render(<HelpAndDisputeCard context="order" reference="KMX-1001" />);
    await expectClean(container);
    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/orders/KMX-1001/dispute");
    expect(links.some((h) => h?.startsWith("/support/new?order=KMX-1001"))).toBe(true);
  });

  it("hides the dispute link when a dispute is no longer possible", () => {
    render(<HelpAndDisputeCard context="order" reference="KMX-1001" showDispute={false} />);
    expect(screen.queryByText(/report a problem/i)).toBeNull();
    expect(screen.getByText(/ask kampmax support/i)).toBeTruthy();
  });

  it.each(["generic", "checkout", "payment", "wallet", "contract", "order", "booking"] as const)(
    "error screen: %s",
    async (variant) => {
      quiet();
      const { container } = render(
        <RouteError error={Object.assign(new Error("boom"), { digest: "abc123" })} retry={() => {}} variant={variant} />
      );
      await expectClean(container);
    }
  );

  it("not-found page", async () => {
    const { container } = render(<NotFound />);
    await expectClean(container);
  });
});

describe("error screens recover without leaking", () => {
  it("never shows the raw error message, but shows a support reference", () => {
    quiet();
    render(
      <RouteError
        error={Object.assign(new Error("SECRET sql: relation orders"), { digest: "d-77" })}
        retry={() => {}}
        variant="checkout"
      />
    );
    expect(document.body.textContent).not.toMatch(/SECRET|relation orders/);
    expect(document.body.textContent).toContain("d-77");
  });

  it("checkout and payment errors answer 'was I charged?' and warn against paying twice", () => {
    quiet();
    for (const variant of ["checkout", "payment"] as const) {
      const { unmount } = render(<RouteError error={new Error("x")} retry={() => {}} variant={variant} />);
      expect(document.body.textContent).toMatch(/charged twice|pay again/i);
      expect(screen.getByRole("link", { name: /check my orders/i }).getAttribute("href")).toBe("/orders");
      unmount();
    }
  });

  it("calls retry (Next 16) and falls back to reset", () => {
    quiet();
    const retry = vi.fn();
    const { unmount } = render(<RouteError error={new Error("x")} retry={retry} reset={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(retry).toHaveBeenCalledTimes(1);
    unmount();

    const reset = vi.fn();
    render(<RouteError error={new Error("x")} reset={reset} />);
    fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("moves focus to the heading so screen readers announce the problem", () => {
    quiet();
    render(<RouteError error={new Error("x")} retry={() => {}} />);
    expect(document.activeElement?.tagName).toBe("H1");
  });
});

describe("OpenDisputeModal tells the truth", () => {
  const open = (onSubmitDispute: (r: string, s: string) => Promise<{ ok: boolean; message?: string }>) =>
    render(<OpenDisputeModal order={order} isOpen onClose={() => {}} onSubmitDispute={onSubmitDispute} />);
  const fill = () => {
    fireEvent.change(screen.getByPlaceholderText(/explain what happened/i), { target: { value: "It arrived broken" } });
    fireEvent.click(screen.getByRole("button", { name: /submit claim/i }));
  };

  it("is an accessible dialog", async () => {
    const { container } = open(async () => ({ ok: true }));
    expect(screen.getByRole("dialog", { name: /report issue/i })).toBeTruthy();
    await expectClean(container);
  });

  it("says 'filed' only after the server accepts it", async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true });
    open(submit);
    expect(document.body.textContent).not.toMatch(/dispute filed/i);
    fill();
    await waitFor(() => expect(document.body.textContent).toMatch(/dispute filed/i));
    expect(submit).toHaveBeenCalledWith(expect.any(String), "It arrived broken");
  });

  it("shows the server's refusal and does NOT claim the payout is on hold", async () => {
    open(vi.fn().mockResolvedValue({ ok: false, message: "A dispute is already open for this order" }));
    fill();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/already open/i);
    expect(document.body.textContent).not.toMatch(/dispute filed/i);
  });

  it("handles a network failure without claiming anything", async () => {
    open(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    fill();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/nothing was changed/i);
    expect(document.body.textContent).not.toMatch(/dispute filed/i);
  });

  it("closes on Escape, so keyboard users are not trapped", () => {
    const onClose = vi.fn();
    render(<OpenDisputeModal order={order} isOpen onClose={onClose} onSubmitDispute={async () => ({ ok: true })} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("does not offer fake photo upload", () => {
    open(async () => ({ ok: true }));
    expect(document.body.textContent).not.toMatch(/Attach Photo/i);
  });
});
