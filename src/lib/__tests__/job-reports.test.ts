import { describe, expect, it } from "vitest";
import { opportunityTypeOf } from "@/config/job-reports";
import type { AdminJobReport, ResolveReportResult } from "@/types/job-moderation";
import { resolvedNotice } from "../job-reports";

const result = (over: Partial<ResolveReportResult> = {}, report: Partial<AdminJobReport> = {}): ResolveReportResult => ({
  report: { targetType: "POSTING", outcome: "ACTION_TAKEN", ...report } as AdminJobReport,
  refundedAmount: 0,
  alsoResolved: 0,
  ...over,
});

describe("resolvedNotice", () => {
  it("says a dismissed report was dismissed", () => {
    expect(resolvedNotice(result({}, { outcome: "NO_ACTION" }))).toBe("Report dismissed.");
  });

  it("says what was done to a posting or an application", () => {
    expect(resolvedNotice(result())).toBe("Posting taken down.");
    expect(resolvedNotice(result({}, { targetType: "APPLICANT" }))).toBe("Application removed.");
  });

  it("adds the refund and the reports it closed too", () => {
    expect(resolvedNotice(result({ refundedAmount: 5000, alsoResolved: 2 }))).toBe(
      "Posting taken down. ₦5,000 refunded to the employer's wallet. 2 other reports on this posting closed too."
    );
    expect(resolvedNotice(result({ alsoResolved: 1 }))).toBe(
      "Posting taken down. 1 other report on this posting closed too."
    );
  });
});

describe("opportunityTypeOf", () => {
  it("turns the backend's upper-case type into the one the badges use", () => {
    expect(opportunityTypeOf("FULL_TIME")).toBe("full_time");
    expect(opportunityTypeOf("INTERNSHIP")).toBe("internship");
  });

  it("falls back to a gig for a type it does not know", () => {
    expect(opportunityTypeOf("")).toBe("gig");
    expect(opportunityTypeOf("VOLUNTEER")).toBe("gig");
  });
});
