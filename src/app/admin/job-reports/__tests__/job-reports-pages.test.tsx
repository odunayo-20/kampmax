// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { AdminJobReport, ResolveReportResult } from "@/types/job-moderation";
import type { JobReportsPage } from "@/services/admin/job-moderation.service";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const nav = { jobId: null as string | null, id: "rep-1" };
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(nav.jobId ? { jobId: nav.jobId } : {}),
  useParams: () => ({ id: nav.id }),
}));

const list = {
  loading: false,
  error: false,
  data: undefined as JobReportsPage | undefined,
};
const detail = {
  loading: false,
  error: false,
  data: undefined as AdminJobReport | null | undefined,
};
const listArgs = vi.fn();
const refetch = vi.fn();

vi.mock("@/hooks/admin/use-admin-job-reports", () => ({
  useAdminJobReports: (...args: unknown[]) => {
    listArgs(...args);
    return {
      data: list.loading || list.error ? undefined : list.data,
      isPending: list.loading,
      isError: list.error,
      refetch,
    };
  },
  useAdminJobReport: () => ({
    data: detail.loading || detail.error ? undefined : detail.data,
    isPending: detail.loading,
    isError: detail.error,
    refetch,
  }),
}));

// The dialogs have their own tests; here only that the page opens them for the right thing.
vi.mock("@/components/admin/jobs/ResolveReportDialog", () => ({
  ResolveReportDialog: ({
    report,
    onResolved,
  }: {
    report: AdminJobReport | null;
    onResolved: (r: ResolveReportResult) => void;
  }) =>
    report ? (
      <div role="dialog" aria-label="Resolve report">
        Resolving {report.id}
        <button onClick={() => onResolved({ report, refundedAmount: 5000, alsoResolved: 1 })}>finish</button>
      </div>
    ) : null,
}));
vi.mock("@/components/admin/jobs/ApplicationReviewDialog", () => ({
  ApplicationReviewDialog: ({ applicationId }: { applicationId: string | null }) =>
    applicationId ? <div role="dialog" aria-label="Review application">Reviewing {applicationId}</div> : null,
}));

import AdminJobReportsPage from "../page";
import AdminJobReportPage from "../[id]/page";

afterEach(cleanup);
beforeEach(() => {
  nav.jobId = null;
  nav.id = "rep-1";
  list.loading = false;
  list.error = false;
  list.data = page([report()]);
  detail.loading = false;
  detail.error = false;
  detail.data = report();
  listArgs.mockReset();
  refetch.mockReset();
});

function report(over: Partial<AdminJobReport> = {}): AdminJobReport {
  return {
    id: "rep-1",
    targetType: "POSTING",
    reason: "ASKS_FOR_PAYMENT",
    details: "Wants ₦5,000 before the interview",
    status: "OPEN",
    outcome: null,
    resolutionNote: null,
    resolvedAt: null,
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
    reporter: { id: "u2", name: "Ife Ade", username: "ife" },
    job: {
      id: "job-1",
      title: "Marketing intern",
      opportunityType: "INTERNSHIP",
      status: "PUBLISHED",
      employerName: "Acme Ltd",
    },
    applicant: null,
    openOnPosting: 1,
    ...over,
  };
}

function page(items: AdminJobReport[], over: Partial<JobReportsPage> = {}): JobReportsPage {
  return {
    items,
    page: 1,
    pageSize: 20,
    total: items.length,
    totalPages: 1,
    counts: { open: items.length, resolved: 3 },
    ...over,
  };
}

describe("job reports queue", () => {
  it("asks for the open reports first", () => {
    render(<AdminJobReportsPage />);
    expect(listArgs).toHaveBeenLastCalledWith({
      status: "OPEN",
      targetType: undefined,
      jobId: undefined,
      page: 1,
      pageSize: 20,
    });
  });

  it("lists what was reported, why, by whom and when, with a way in", () => {
    render(<AdminJobReportsPage />);
    const row = screen.getAllByRole("row")[1];
    expect(row.textContent).toContain("Marketing intern");
    expect(row.textContent).toContain("Internship");
    expect(row.textContent).toContain("Posting");
    expect(row.textContent).toContain("Acme Ltd");
    expect(row.textContent).toContain("Asks for money");
    expect(row.textContent).toContain("Ife Ade");
    expect(row.textContent).toContain("2h ago");
    expect(within(row).getByRole("link", { name: /Open the report on Marketing intern/ }).getAttribute("href")).toBe(
      "/admin/job-reports/rep-1"
    );
  });

  it("names the applicant on an applicant report and flags a posting reported more than once", () => {
    list.data = page([
      report({
        targetType: "APPLICANT",
        reason: "ABUSIVE",
        openOnPosting: 3,
        applicant: { id: "u1", name: "Tolu Bello", username: "tolu", applicationId: "app-1", applicationStatus: "SUBMITTED" },
      }),
    ]);
    render(<AdminJobReportsPage />);
    const row = screen.getAllByRole("row")[1];
    expect(row.textContent).toContain("Applicant: Tolu Bello");
    expect(row.textContent).toContain("3 open on this posting");
  });

  it("shows how many are open and resolved on the tabs, and switches to resolved ones", () => {
    list.data = page([report()], { counts: { open: 4, resolved: 9 } });
    render(<AdminJobReportsPage />);
    expect(screen.getByRole("tab", { name: /Open/ }).textContent).toContain("4");
    expect(screen.getByRole("tab", { name: /Resolved/ }).textContent).toContain("9");

    list.data = page([report({ status: "RESOLVED", outcome: "ACTION_TAKEN", resolvedAt: new Date().toISOString() })]);
    fireEvent.click(screen.getByRole("tab", { name: /Resolved/ }));

    expect(listArgs).toHaveBeenLastCalledWith(expect.objectContaining({ status: "RESOLVED", page: 1 }));
    const row = screen.getAllByRole("row")[1];
    expect(row.textContent).toContain("Action taken");
    expect(within(row).getByRole("link").textContent).toBe("View");
  });

  it("filters to postings or applicants", () => {
    render(<AdminJobReportsPage />);
    fireEvent.change(screen.getByLabelText("Filter by what was reported"), { target: { value: "APPLICANT" } });
    expect(listArgs).toHaveBeenLastCalledWith(expect.objectContaining({ targetType: "APPLICANT" }));
  });

  it("narrows to one posting from a link on its job page, and lets you clear it", () => {
    nav.jobId = "job-1";
    render(<AdminJobReportsPage />);
    expect(listArgs).toHaveBeenLastCalledWith(expect.objectContaining({ jobId: "job-1" }));
    expect(screen.getByText("Showing reports about one posting")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Show every report" }).getAttribute("href")).toBe("/admin/job-reports");
  });

  it("says when nothing is waiting", () => {
    list.data = page([]);
    render(<AdminJobReportsPage />);
    expect(screen.getByText("Nothing waiting")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("shows a loading state and a retry", () => {
    list.loading = true;
    const { unmount } = render(<AdminJobReportsPage />);
    expect(screen.queryByRole("table")).toBeNull();
    unmount();

    list.loading = false;
    list.error = true;
    render(<AdminJobReportsPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});

describe("job report page", () => {
  it("shows the report, the posting and who sent it", () => {
    render(<AdminJobReportPage />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Posting report: Asks for money");
    expect(screen.getByText("Wants ₦5,000 before the interview")).toBeTruthy();
    expect(screen.getByText("Ife Ade (@ife)")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Open the job/ }).getAttribute("href")).toBe("/admin/jobs/job-1");
    expect(screen.queryByRole("region", { name: "Applicant" })).toBeNull();
  });

  it("says when the reporter gave no details", () => {
    detail.data = report({ details: null });
    render(<AdminJobReportPage />);
    expect(screen.getByText("They gave no details.")).toBeTruthy();
  });

  it("resolves an open report and says what happened", () => {
    detail.data = report({ openOnPosting: 2 });
    render(<AdminJobReportPage />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Resolve" }));
    expect(screen.getByRole("dialog", { name: "Resolve report" }).textContent).toContain("Resolving rep-1");

    fireEvent.click(screen.getByRole("button", { name: "finish" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByRole("status").textContent).toBe(
      "Posting taken down. ₦5,000 refunded to the employer's wallet. 1 other report on this posting closed too."
    );
  });

  it("opens the reported application for review, and says it is logged", () => {
    detail.data = report({
      targetType: "APPLICANT",
      reason: "ABUSIVE",
      applicant: { id: "u1", name: "Tolu Bello", username: "tolu", applicationId: "app-1", applicationStatus: "SUBMITTED" },
    });
    render(<AdminJobReportPage />);
    const card = screen.getByRole("region", { name: "Applicant" });
    expect(card.textContent).toContain("Tolu Bello");
    expect(card.textContent).toContain("Recorded in the audit log");

    fireEvent.click(within(card).getByRole("button", { name: "Review application" }));
    expect(screen.getByRole("dialog", { name: "Review application" }).textContent).toBe("Reviewing app-1");
  });

  it("says when the reported application has been cleaned up", () => {
    detail.data = report({ targetType: "APPLICANT", applicant: null });
    render(<AdminJobReportPage />);
    expect(screen.getByText(/application has since been cleaned up/)).toBeTruthy();
  });

  it("shows how a resolved report was settled, and offers no Resolve button", () => {
    detail.data = report({
      status: "RESOLVED",
      outcome: "NO_ACTION",
      resolutionNote: "Checked with the employer",
      resolvedAt: new Date().toISOString(),
    });
    render(<AdminJobReportPage />);
    expect(screen.getByRole("region", { name: "Resolution" }).textContent).toContain("Dismissed");
    expect(screen.getByText("Checked with the employer")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Resolve" })).toBeNull();
  });

  it("handles a report that is not there, and a failed load", () => {
    detail.data = null;
    const { unmount } = render(<AdminJobReportPage />);
    expect(screen.getByText("Report not found")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to reports/ }).getAttribute("href")).toBe("/admin/job-reports");
    unmount();

    detail.error = true;
    render(<AdminJobReportPage />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });
});
