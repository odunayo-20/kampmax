// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { PostingPricing } from "@/services/jobs";
import type { Opportunity } from "@/types/opportunity";

const state = { pricing: undefined as PostingPricing | undefined };
vi.mock("@/hooks/use-posting-billing", () => ({
  usePostingPricing: () => ({ data: state.pricing }),
}));

import { OpportunityTypePicker } from "../OpportunityTypePicker";
import { canRenew } from "../EmployerJobActions";
import { anyPostingFeeSet } from "@/components/employer/billing/FreePostingsNotice";

afterEach(cleanup);
beforeEach(() => {
  state.pricing = undefined;
});

const pricing = (overrides: Partial<PostingPricing> = {}): PostingPricing => ({
  currency: "NGN",
  hiringEnabled: true,
  internshipFee: 4000,
  unpaidInternshipFee: 2000,
  partTimeFee: 8000,
  fullTimeFee: 15000,
  contractFee: 10000,
  renewalDiscountPercent: 50,
  liveDays: 30,
  freeAllowance: { total: 2, used: 0, remaining: 2 },
  ...overrides,
});

describe("OpportunityTypePicker", () => {
  const show = (props: Partial<React.ComponentProps<typeof OpportunityTypePicker>> = {}) => {
    const onChange = vi.fn();
    render(<OpportunityTypePicker value="gig" isPaid onChange={onChange} {...props} />);
    return { onChange };
  };

  it("offers every kind of posting and marks the chosen one", () => {
    show({ value: "internship" });
    expect(screen.getAllByRole("radio")).toHaveLength(5);
    expect(
      (screen.getByRole("radio", { name: /Internship/ }) as HTMLButtonElement).getAttribute("aria-checked")
    ).toBe("true");
    expect(
      (screen.getByRole("radio", { name: /^Gig/ }) as HTMLButtonElement).getAttribute("aria-checked")
    ).toBe("false");
  });

  it("reports the type that was picked", () => {
    const { onChange } = show();
    fireEvent.click(screen.getByRole("radio", { name: /Full-time/ }));
    expect(onChange).toHaveBeenCalledWith("full_time");
  });

  it("counts the free postings left into what each type costs", () => {
    state.pricing = pricing();
    show();
    expect(screen.getAllByText("Free for you · 2 free postings left").length).toBe(4);
    expect(screen.getAllByText("Free to post").length).toBe(1);
  });

  it("shows the price once the free postings are used", () => {
    state.pricing = pricing({ freeAllowance: { total: 2, used: 2, remaining: 0 } });
    show();
    expect(screen.getByText("₦15,000 to publish")).toBeTruthy();
    expect(screen.getByText("₦4,000 to publish")).toBeTruthy();
  });

  it("uses the discounted price for an unpaid internship", () => {
    state.pricing = pricing({ freeAllowance: { total: 2, used: 2, remaining: 0 } });
    show({ isPaid: false });
    expect(screen.getByText("₦2,000 to publish")).toBeTruthy();
  });

  it("says hiring types are opening soon, but keeps a gig free to post", () => {
    state.pricing = pricing({ hiringEnabled: false });
    show();
    expect(screen.getAllByText("Opening soon: you can save a draft now").length).toBe(4);
    expect(screen.getByText("Free to post")).toBeTruthy();
  });

  it("can be turned off while a save is running", () => {
    show({ disabled: true });
    for (const r of screen.getAllByRole("radio")) expect((r as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("canRenew", () => {
  const job = (overrides: object) =>
    ({
      opportunityType: "internship",
      status: "expired",
      expiresAt: "",
      ...overrides,
    }) as Opportunity;
  const now = new Date("2026-11-04T12:00:00Z").getTime();

  it("renews an expired vacancy or internship", () => {
    expect(canRenew(job({}), now)).toBe(true);
  });

  it("renews one that lapsed before the backend marked it expired", () => {
    expect(canRenew(job({ status: "open", expiresAt: "2026-11-03T00:00:00Z" }), now)).toBe(true);
  });

  it("does not renew one that is still live", () => {
    expect(canRenew(job({ status: "open", expiresAt: "2026-12-01T00:00:00Z" }), now)).toBe(false);
  });

  it("never renews a gig", () => {
    expect(canRenew(job({ opportunityType: "gig" }), now)).toBe(false);
  });

  it("does not renew a draft, closed or cancelled posting", () => {
    for (const status of ["draft", "closed", "cancelled"]) {
      expect(canRenew(job({ status, expiresAt: "2026-01-01T00:00:00Z" }), now)).toBe(false);
    }
  });
});

describe("anyPostingFeeSet", () => {
  it("is false until an admin sets a price", () => {
    expect(
      anyPostingFeeSet(pricing({ internshipFee: 0, partTimeFee: 0, fullTimeFee: 0, contractFee: 0 }))
    ).toBe(false);
  });
  it("is true once any paid type has a price", () => {
    expect(
      anyPostingFeeSet(pricing({ internshipFee: 0, partTimeFee: 0, fullTimeFee: 0, contractFee: 500 }))
    ).toBe(true);
  });
});
