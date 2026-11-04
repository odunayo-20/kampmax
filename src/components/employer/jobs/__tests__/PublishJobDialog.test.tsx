// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PostingPricing, PostingQuote } from "@/services/jobs";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const state = {
  quote: undefined as PostingQuote | undefined,
  quoteError: false,
  pricing: { hiringEnabled: true } as Partial<PostingPricing>,
};
const mutate = vi.fn();

vi.mock("@/hooks/use-posting-billing", () => ({
  usePublishQuote: () => ({
    data: state.quote,
    isPending: !state.quote && !state.quoteError,
    isError: state.quoteError,
  }),
  usePostingPricing: () => ({ data: state.pricing }),
}));
vi.mock("@/hooks/use-jobs", () => ({
  usePublishJob: () => ({ mutate, isPending: false }),
}));

import { PublishJobDialog, quoteLines } from "../PublishJobDialog";

afterEach(cleanup);
beforeEach(() => {
  mutate.mockReset();
  state.quote = undefined;
  state.quoteError = false;
  state.pricing = { hiringEnabled: true };
});

const quote = (overrides: Partial<PostingQuote> = {}): PostingQuote => ({
  opportunityType: "FULL_TIME",
  isPaid: true,
  fee: 15000,
  chargeKind: "PAID",
  amountDue: 15000,
  currency: "NGN",
  liveDays: 30,
  freeAllowance: { total: 2, used: 2, remaining: 0 },
  wallet: { availableBalance: 20000, canAfford: true },
  needsVerification: false,
  ...overrides,
});

function open(props: { onClose?: () => void; onPublished?: () => void } = {}) {
  const onClose = props.onClose ?? vi.fn();
  render(<PublishJobDialog jobId="job-1" open onClose={onClose} onPublished={props.onPublished} />);
  return { onClose };
}

const confirm = (name: RegExp | string) => screen.getByRole("button", { name }) as HTMLButtonElement;

describe("quoteLines", () => {
  it("says a free posting is used and how many are left after it", () => {
    const lines = quoteLines(
      quote({ chargeKind: "FREE_ALLOWANCE", amountDue: 0, freeAllowance: { total: 2, used: 0, remaining: 2 } })
    );
    expect(lines[0]).toBe("This uses 1 of your free postings. You will have 1 free posting left after it.");
    expect(lines[1]).toBe("It stays live for 30 days. After that you can renew it.");
  });

  it("says when it was the last free posting", () => {
    const [line] = quoteLines(
      quote({ chargeKind: "FREE_ALLOWANCE", amountDue: 0, freeAllowance: { total: 2, used: 1, remaining: 1 } })
    );
    expect(line).toContain("You will have 0 free postings left after it.");
  });

  it("says what leaves the wallet, and when nothing is due", () => {
    expect(quoteLines(quote())[0]).toBe(
      "₦15,000 will be taken from your wallet. You have ₦20,000 available."
    );
    expect(quoteLines(quote({ chargeKind: "NONE", amountDue: 0 }))[0]).toBe(
      "There is nothing to pay to publish this right now."
    );
  });
});

describe("PublishJobDialog", () => {
  it("waits for the cost before it can be confirmed", () => {
    open();
    expect(screen.getByText("Loading…")).toBeTruthy();
    expect(confirm("Publish").disabled).toBe(true);
  });

  it("shows a free posting being used and publishes on confirm", () => {
    state.quote = quote({
      chargeKind: "FREE_ALLOWANCE",
      amountDue: 0,
      freeAllowance: { total: 2, used: 0, remaining: 2 },
    });
    open();
    expect(screen.getByText(/uses 1 of your free postings/)).toBeTruthy();
    fireEvent.click(confirm("Publish"));
    expect(mutate).toHaveBeenCalledWith("job-1", expect.any(Object));
  });

  it("puts the amount on the confirm button when the wallet will be charged", () => {
    state.quote = quote();
    open();
    expect(screen.getByText(/₦15,000 will be taken from your wallet/)).toBeTruthy();
    expect(confirm("Pay ₦15,000 & publish").disabled).toBe(false);
  });

  it("blocks a wallet that is short and links to top up, with the shortfall", () => {
    state.quote = quote({ wallet: { availableBalance: 4000, canAfford: false } });
    open();
    expect(screen.getByText(/Your wallet is ₦11,000 short/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Top up your wallet" }).getAttribute("href")).toBe(
      "/employer/billing"
    );
    expect(confirm(/Pay ₦15,000/).disabled).toBe(true);
  });

  it("blocks an unverified employer and points to the profile", () => {
    state.quote = quote({ needsVerification: true });
    open();
    expect(screen.getByText(/Verify your employer profile/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Go to your profile" }).getAttribute("href")).toBe(
      "/employer/profile"
    );
    expect(confirm(/Pay|Publish/).disabled).toBe(true);
    // The cost is not shown for something that cannot be published yet.
    expect(screen.queryByText(/will be taken from your wallet/)).toBeNull();
  });

  it("blocks publishing while vacancies and internships are not open yet", () => {
    state.pricing = { hiringEnabled: false };
    state.quote = quote({ chargeKind: "FREE_ALLOWANCE", amountDue: 0 });
    open();
    expect(screen.getByText(/not open for posting yet/)).toBeTruthy();
    expect(screen.getByText(/Your draft is saved/)).toBeTruthy();
    expect(confirm("Publish").disabled).toBe(true);
  });

  it("offers a retry message when the cost cannot be checked", () => {
    state.quoteError = true;
    open();
    expect(screen.getByRole("alert").textContent).toMatch(/could not check the cost/);
    expect(confirm("Publish").disabled).toBe(true);
  });

  it("shows the backend's own reason when publishing is refused", () => {
    state.quote = quote();
    mutate.mockImplementation((_id, opts) =>
      opts.onError(Object.assign(new Error("Your wallet needs ₦15,000 to publish."), { status: 402 }))
    );
    open();
    fireEvent.click(confirm(/Pay ₦15,000/));
    expect(screen.getByText("Your wallet needs ₦15,000 to publish.")).toBeTruthy();
  });

  it("closes and tells the page once published", () => {
    state.quote = quote();
    mutate.mockImplementation((_id, opts) => opts.onSuccess());
    const onPublished = vi.fn();
    const { onClose } = open({ onPublished });
    fireEvent.click(confirm(/Pay ₦15,000/));
    expect(onClose).toHaveBeenCalled();
    expect(onPublished).toHaveBeenCalled();
  });
});
