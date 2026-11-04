// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ManagedJobApplicantRow, Paginated } from "@/types/admin";

const state = {
  loading: false,
  error: false,
  data: undefined as Paginated<ManagedJobApplicantRow> | undefined,
};
const hookArgs = vi.fn();
const refetch = vi.fn();

vi.mock("@/hooks/admin/use-admin-jobs", () => ({
  useAdminJobApplicants: (...args: unknown[]) => {
    hookArgs(...args);
    return {
      data: state.loading || state.error ? undefined : state.data,
      isPending: state.loading,
      isError: state.error,
      refetch,
    };
  },
}));

// The dialog fetches through React Query; here only that it opens for the right application matters.
vi.mock("@/components/admin/jobs/ApplicationReviewDialog", () => ({
  ApplicationReviewDialog: ({ applicationId }: { applicationId: string | null }) =>
    applicationId ? <div role="dialog">Reviewing {applicationId}</div> : null,
}));

import { JobApplicantsTable, applicantStatusLabel, appliedWith } from "../JobApplicantsTable";

afterEach(cleanup);
beforeEach(() => {
  state.loading = false;
  state.error = false;
  state.data = page([]);
  hookArgs.mockReset();
  refetch.mockReset();
});

function page(
  items: ManagedJobApplicantRow[],
  over: Partial<Paginated<ManagedJobApplicantRow>> = {}
): Paginated<ManagedJobApplicantRow> {
  return { items, page: 1, pageSize: 10, total: items.length, totalPages: 1, ...over };
}

const row = (over: Partial<ManagedJobApplicantRow> = {}): ManagedJobApplicantRow => ({
  id: "a1",
  kind: "application",
  status: "submitted",
  name: "Tolu Bello",
  username: "tolu",
  userId: "u1",
  appliedAt: new Date(Date.now() - 3 * 3600_000).toISOString(),
  amount: null,
  cvLabel: "Design CV",
  ...over,
});

describe("applicantStatusLabel", () => {
  it("uses the console's words", () => {
    expect(applicantStatusLabel("under_review")).toBe("Under review");
    expect(applicantStatusLabel("accepted")).toBe("Accepted");
    expect(applicantStatusLabel("withdrawn")).toBe("Withdrawn");
  });
  it("tidies a status it has no word for", () => {
    expect(applicantStatusLabel("expired")).toBe("Expired");
    expect(applicantStatusLabel("on_hold")).toBe("On hold");
  });
});

describe("appliedWith", () => {
  it("names the CV a person applied with", () => {
    expect(appliedWith({ kind: "application", amount: null, cvLabel: "Design CV" })).toBe("CV: Design CV");
    expect(appliedWith({ kind: "application", amount: null, cvLabel: null })).toBe("CV application");
  });
  it("shows the amount a proposal asked for", () => {
    expect(appliedWith({ kind: "proposal", amount: 150000, cvLabel: null })).toBe("Proposal: ₦150,000");
    expect(appliedWith({ kind: "proposal", amount: null, cvLabel: null })).toBe("Proposal");
  });
});

describe("JobApplicantsTable", () => {
  it("asks for the first page of this posting's applicants", () => {
    render(<JobApplicantsTable jobId="job-1" />);
    expect(hookArgs).toHaveBeenLastCalledWith("job-1", 1, 10);
  });

  it("says plainly that opening an application is private and logged", () => {
    render(<JobApplicantsTable jobId="job-1" />);
    expect(screen.getByText(/Opening a CV application is private and recorded in the audit log/)).toBeTruthy();
  });

  it("offers a Review button for a CV application only, and opens that one", () => {
    state.data = page([
      row({ id: "a1", name: "Tolu Bello" }),
      row({ id: "p1", kind: "proposal", name: "Ada Obi", cvLabel: null, amount: 150000 }),
    ]);
    render(<JobApplicantsTable jobId="job-1" />);

    expect(screen.getAllByRole("button", { name: /^Review / })).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Review Ada Obi's application" })).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Review Tolu Bello's application" }));
    expect(screen.getByRole("dialog").textContent).toBe("Reviewing a1");
  });

  it("shows a loading state", () => {
    state.loading = true;
    render(<JobApplicantsTable jobId="job-1" />);
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("offers a retry when it cannot load", () => {
    state.error = true;
    render(<JobApplicantsTable jobId="job-1" />);
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("says when nobody has applied", () => {
    render(<JobApplicantsTable jobId="job-1" />);
    expect(screen.getByText("No applicants yet")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
  });

  it("lists each applicant with how they applied, when, and where it stands", () => {
    state.data = page([
      row(),
      row({
        id: "p1",
        kind: "proposal",
        name: "Ada Obi",
        username: null,
        status: "under_review",
        amount: 150000,
        cvLabel: null,
      }),
    ]);
    render(<JobApplicantsTable jobId="job-1" />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("Tolu Bello");
    expect(rows[0].textContent).toContain("@tolu");
    expect(rows[0].textContent).toContain("CV: Design CV");
    expect(rows[0].textContent).toContain("3h ago");
    expect(rows[0].textContent).toContain("Submitted");
    expect(rows[1].textContent).toContain("Ada Obi");
    expect(rows[1].textContent).not.toContain("@");
    expect(rows[1].textContent).toContain("Proposal: ₦150,000");
    expect(rows[1].textContent).toContain("Under review");
  });

  it("copes with a missing date", () => {
    state.data = page([row({ appliedAt: null })]);
    render(<JobApplicantsTable jobId="job-1" />);
    expect(screen.getAllByRole("row")[1].textContent).toContain("—");
  });

  it("pages through a long list", () => {
    state.data = page([row()], { total: 25, totalPages: 3 });
    render(<JobApplicantsTable jobId="job-1" />);
    expect(document.body.textContent).toMatch(/Showing\s*1–10\s*of\s*25\s*applicants/);

    fireEvent.click(screen.getByRole("button", { name: "Next page" }));
    expect(hookArgs).toHaveBeenLastCalledWith("job-1", 2, 10);
  });
});
