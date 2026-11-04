import { describe, expect, it } from "vitest";
import type { Job } from "@/services/jobs";
import type { OpportunityInput } from "@/types/opportunity";
import {
  defaultHiring,
  jobToOpportunity,
  opportunityInputToJobDto,
  opportunityInputToUpdateDto,
  opportunityTypeToBackend,
} from "@/lib/job-api-mapping";
import { hiringPayText, monthsText, openingsText, payRangeText } from "@/lib/opportunity-display";
import { feeHint, listFee } from "@/lib/posting-fees";
import type { PostingPricing } from "@/services/jobs";

const backendJob: Job = {
  id: "11111111-1111-4111-8111-111111111111",
  employerId: "e1",
  employer: { id: "e1", userId: "u9", displayName: "Acme" },
  title: "Marketing intern",
  slug: "marketing-intern",
  description: "Help with campaigns",
  summary: null,
  requirements: "Keen",
  categoryKey: null,
  category: null,
  campus: null,
  budgetType: "FIXED",
  budgetMin: 30000,
  budgetMax: 50000,
  currency: "NGN",
  experienceLevel: null,
  estimatedDuration: null,
  opportunityType: "INTERNSHIP",
  isPaid: true,
  payPeriod: "MONTHLY",
  startDate: "2027-01-15",
  durationMonths: 3,
  openings: 2,
  eligibility: "300 level and above",
  offersCertificate: true,
  locationType: "ONSITE",
  country: null,
  state: null,
  city: null,
  applicationDeadline: null,
  status: "PUBLISHED",
  visibility: "PUBLIC",
  publishedAt: "2026-11-04T10:00:00.000Z",
  expiresAt: "2026-12-04T10:00:00.000Z",
  skills: [],
  screeningQuestions: [],
  attachments: [],
  proposalCount: 0,
  createdAt: "2026-11-01T00:00:00.000Z",
  updatedAt: "2026-11-01T00:00:00.000Z",
};

const baseInput: OpportunityInput = {
  title: "Marketing intern",
  categoryId: "ec1",
  summary: "Campaign help",
  description: "Help with campaigns",
  requirements: "Keen",
  skills: ["Canva"],
  workArrangement: "on_site",
  location: {},
  budget: { type: "project", min: 30000, max: 50000, currency: "NGN" },
  duration: "few_weeks",
  experienceLevel: "entry_level",
  deadline: "2026-12-31",
  screeningQuestions: [],
};

describe("jobToOpportunity (hiring fields)", () => {
  it("maps the hiring fields and the live period", () => {
    const o = jobToOpportunity(backendJob);
    expect(o.opportunityType).toBe("internship");
    expect(o.hiring).toEqual({
      isPaid: true,
      payPeriod: "monthly",
      startDate: "2027-01-15",
      durationMonths: 3,
      openings: 2,
      eligibility: "300 level and above",
      offersCertificate: true,
    });
    expect(o.expiresAt).toBe("2026-12-04T10:00:00.000Z");
  });

  it("treats a job from an older backend, with no hiring fields, as a gig", () => {
    const legacy: Job = { ...backendJob };
    delete legacy.opportunityType;
    delete legacy.isPaid;
    delete legacy.payPeriod;
    delete legacy.startDate;
    delete legacy.durationMonths;
    delete legacy.openings;
    delete legacy.eligibility;
    delete legacy.offersCertificate;
    delete legacy.expiresAt;
    const o = jobToOpportunity(legacy);
    expect(o.opportunityType).toBe("gig");
    expect(o.hiring).toMatchObject({ isPaid: true, openings: 1, eligibility: "" });
    expect(o.expiresAt).toBe("");
  });
});

describe("opportunityInputToJobDto (hiring fields)", () => {
  it("leaves a gig exactly as it was, with no hiring fields", () => {
    const dto = opportunityInputToJobDto(baseInput);
    expect(dto.opportunityType).toBeUndefined();
    expect(dto.isPaid).toBeUndefined();
    expect(dto.payPeriod).toBeUndefined();
    expect(dto.estimatedDuration).toBe("A few weeks");
  });

  it("sends a paid internship's pay range, period and hiring details", () => {
    const dto = opportunityInputToJobDto({
      ...baseInput,
      opportunityType: "internship",
      hiring: {
        isPaid: true,
        payPeriod: "monthly",
        startDate: "2027-01-15",
        durationMonths: 3,
        openings: 2,
        eligibility: " 300 level and above ",
        offersCertificate: true,
      },
    });
    expect(dto).toMatchObject({
      opportunityType: "INTERNSHIP",
      isPaid: true,
      payPeriod: "MONTHLY",
      startDate: "2027-01-15",
      durationMonths: 3,
      openings: 2,
      eligibility: "300 level and above",
      offersCertificate: true,
      budgetType: "FIXED",
      budgetMin: 30000,
      budgetMax: 50000,
    });
    // A hiring posting states its length in months, not a bucketed duration.
    expect(dto.estimatedDuration).toBeUndefined();
  });

  it("drops the pay range and period for an unpaid role", () => {
    const dto = opportunityInputToJobDto({
      ...baseInput,
      opportunityType: "internship",
      hiring: { ...defaultHiring(), isPaid: false, payPeriod: "monthly" },
    });
    expect(dto.isPaid).toBe(false);
    expect(dto.budgetMin).toBeUndefined();
    expect(dto.budgetMax).toBeUndefined();
    expect(dto.payPeriod).toBeUndefined();
  });

  it("never sends an hourly budget type for a hiring posting", () => {
    const dto = opportunityInputToJobDto({
      ...baseInput,
      opportunityType: "part_time",
      budget: { type: "hourly", min: 1000, currency: "NGN" },
      hiring: { ...defaultHiring(), payPeriod: "hourly" },
    });
    expect(dto.budgetType).toBe("FIXED");
    expect(dto.payPeriod).toBe("HOURLY");
  });

  it("sends the type explicitly when a draft is switched back to a gig, clearing hiring fields", () => {
    const dto = opportunityInputToUpdateDto({
      ...baseInput,
      opportunityType: "gig",
      hiring: { ...defaultHiring(), payPeriod: "monthly", durationMonths: 3 },
    });
    expect(dto.opportunityType).toBe("GIG");
    expect(dto.payPeriod).toBeNull();
    expect(dto.startDate).toBeNull();
    expect(dto.durationMonths).toBeNull();
    expect(dto.eligibility).toBeNull();
  });
});

describe("opportunityTypeToBackend", () => {
  it("maps a UI type tab and treats 'all' as no filter", () => {
    expect(opportunityTypeToBackend("full_time")).toBe("FULL_TIME");
    expect(opportunityTypeToBackend("all")).toBeUndefined();
    expect(opportunityTypeToBackend(undefined)).toBeUndefined();
  });
});

describe("hiring display text", () => {
  const o = (hiring: object, budget: object) =>
    ({
      hiring: { ...defaultHiring(), ...hiring },
      budget: { type: "project", currency: "NGN", ...budget },
    }) as Parameters<typeof hiringPayText>[0];

  it("quotes pay per period", () => {
    expect(hiringPayText(o({ payPeriod: "monthly" }, { min: 30000, max: 50000 }))).toBe(
      "₦30k–₦50k/month"
    );
    expect(hiringPayText(o({ payPeriod: "hourly" }, { min: 1500 }))).toBe("₦1.5k+/hr");
  });

  it("says unpaid, or that pay is not stated", () => {
    expect(hiringPayText(o({ isPaid: false }, { min: 30000 }))).toBe("Unpaid");
    expect(hiringPayText(o({}, {}))).toBe("Pay not stated");
  });

  it("formats a single value, months and openings", () => {
    expect(payRangeText(30000, 30000)).toBe("₦30k");
    expect(payRangeText(undefined, 50000)).toBe("Up to ₦50k");
    expect(monthsText(1)).toBe("1 month");
    expect(monthsText(6)).toBe("6 months");
    expect(monthsText(24)).toBe("2 years");
    expect(openingsText(1)).toBe("1 opening");
    expect(openingsText(3)).toBe("3 openings");
  });
});

describe("posting fee hints", () => {
  const pricing: PostingPricing = {
    currency: "NGN",
    internshipFee: 4000,
    unpaidInternshipFee: 2000,
    partTimeFee: 8000,
    fullTimeFee: 15000,
    contractFee: 10000,
    renewalDiscountPercent: 50,
    liveDays: 30,
    freeAllowance: { total: 2, used: 0, remaining: 2 },
  };
  const spent = { ...pricing, freeAllowance: { total: 2, used: 2, remaining: 0 } };

  it("always says a gig is free", () => {
    expect(feeHint(spent, "gig")).toBe("Free to post");
    expect(feeHint(undefined, "gig")).toBe("Free to post");
  });

  it("counts the free postings left in", () => {
    expect(feeHint(pricing, "internship")).toBe("Free for you · 2 free postings left");
    expect(feeHint({ ...pricing, freeAllowance: { total: 2, used: 1, remaining: 1 } }, "full_time")).toBe(
      "Free for you · 1 free posting left"
    );
  });

  it("shows the price once the free postings are used", () => {
    expect(feeHint(spent, "full_time")).toBe("₦15,000 to publish");
    expect(feeHint(spent, "internship", false)).toBe("₦2,000 to publish");
  });

  it("says free to post when no price is set, and shows nothing while the price loads", () => {
    expect(feeHint({ ...spent, fullTimeFee: 0 }, "full_time")).toBe("Free to post");
    expect(feeHint(undefined, "full_time")).toBe("");
  });

  it("lists the fee for each type", () => {
    expect(listFee(pricing, "part_time", true)).toBe(8000);
    expect(listFee(pricing, "contract", true)).toBe(10000);
    expect(listFee(pricing, "gig", true)).toBe(0);
  });
});
