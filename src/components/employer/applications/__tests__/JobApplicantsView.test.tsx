// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Applicant, JobApplicants } from "@/services/job-applications";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const state = {
  loading: false,
  error: false,
  data: undefined as JobApplicants | undefined,
};
const queryArgs = vi.fn();
const setStatus = vi.fn();
const downloadCv = vi.fn();
const getApplicationCvLink = vi.fn();

vi.mock("@/hooks/use-job-applications", () => ({
  useJobApplicants: (...args: unknown[]) => {
    queryArgs(...args);
    return {
      data: state.loading || state.error ? undefined : state.data,
      isPending: state.loading,
      isError: state.error,
      error: new Error("down"),
      refetch: vi.fn(),
    };
  },
  useSetApplicationStatus: () => ({ mutate: setStatus, isPending: false }),
}));
vi.mock("@/services/job-applications", () => ({
  downloadCv: (...a: unknown[]) => downloadCv(...a),
  getApplicationCvLink: (...a: unknown[]) => getApplicationCvLink(...a),
}));

import { JobApplicantsView, availableDecisions } from "../JobApplicantsView";

afterEach(cleanup);
beforeEach(() => {
  state.loading = false;
  state.error = false;
  state.data = result([applicant()]);
  queryArgs.mockReset();
  setStatus.mockReset();
  downloadCv.mockReset().mockResolvedValue({ error: null });
  getApplicationCvLink.mockReset();
});

function applicant(overrides: Partial<Applicant> = {}): Applicant {
  return {
    id: "app-1",
    status: "SUBMITTED",
    cvLabel: "Design CV",
    cvAvailable: true,
    coverNote: null,
    answers: [],
    employerNote: null,
    createdAt: "2026-11-04T10:00:00.000Z",
    viewedAt: null,
    decidedAt: null,
    applicant: { id: "u1", name: "Tolu Bello", username: "tolu", avatar: null },
    ...overrides,
  };
}

function result(items: Applicant[], over: Partial<JobApplicants> = {}): JobApplicants {
  return {
    job: { id: "job-1", title: "Marketing intern", openings: 2, hired: 0 },
    items,
    meta: { total: items.length, page: 1, limit: 20, totalPages: 1 },
    counts: { ALL: items.length, SUBMITTED: items.length, VIEWED: 0, SHORTLISTED: 0, REJECTED: 0, HIRED: 0, WITHDRAWN: 0 },
    ...over,
  };
}

const show = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JobApplicantsView jobId="job-1" />
    </QueryClientProvider>
  );

describe("availableDecisions", () => {
  it("offers every decision on a new or seen application", () => {
    expect(availableDecisions("SUBMITTED")).toEqual(["SHORTLISTED", "REJECTED", "HIRED"]);
    expect(availableDecisions("VIEWED")).toEqual(["SHORTLISTED", "REJECTED", "HIRED"]);
  });
  it("does not offer to shortlist someone who is already shortlisted", () => {
    expect(availableDecisions("SHORTLISTED")).toEqual(["REJECTED", "HIRED"]);
  });
  it("offers nothing once the decision is final", () => {
    for (const s of ["REJECTED", "HIRED", "WITHDRAWN"] as const) expect(availableDecisions(s)).toEqual([]);
  });
});

describe("JobApplicantsView", () => {
  it("shows the posting and how many openings are filled", () => {
    state.data = result([applicant()], { job: { id: "job-1", title: "Marketing intern", openings: 2, hired: 1 } });
    show();
    expect(screen.getByText("Marketing intern · 1 of 2 openings filled")).toBeTruthy();
    expect(screen.getByRole("link", { name: /Back to the posting/ }).getAttribute("href")).toBe(
      "/employer/jobs/job-1"
    );
  });

  it("says 'opening' for a single opening", () => {
    state.data = result([], { job: { id: "job-1", title: "Intern", openings: 1, hired: 0 } });
    show();
    expect(screen.getByText("Intern · 0 of 1 opening filled")).toBeTruthy();
  });

  it("shows a loading state and a retry", () => {
    state.loading = true;
    const { unmount } = show();
    expect(screen.getByRole("status", { name: "Loading applicants" })).toBeTruthy();
    unmount();

    state.loading = false;
    state.error = true;
    show();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });

  it("explains an empty list, and an empty tab", () => {
    state.data = result([]);
    show();
    expect(screen.getByText("No applications yet")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Shortlisted/ }));
    expect(screen.getByText("Nobody here")).toBeTruthy();
  });

  it("shows each applicant with their note and answers matched to the questions", () => {
    state.data = result([
      applicant({
        coverNote: "Keen to learn",
        answers: [{ questionId: "q1", question: "Why us?", answer: "I admire the brand" }],
      }),
    ]);
    show();

    expect(screen.getByText("Tolu Bello")).toBeTruthy();
    expect(screen.getByText(/@tolu · applied/)).toBeTruthy();
    expect(screen.getByText("Keen to learn")).toBeTruthy();
    expect(screen.getByText("Why us?")).toBeTruthy();
    expect(screen.getByText("I admire the brand")).toBeTruthy();
    // The status badge (there is also a "New" tab).
    expect(screen.getByText("New", { selector: "span" })).toBeTruthy();
  });

  it("shows how many applicants are in each tab and asks the server for the chosen one", () => {
    state.data = result([applicant()], {
      counts: { ALL: 5, SUBMITTED: 2, VIEWED: 1, SHORTLISTED: 1, REJECTED: 0, HIRED: 1, WITHDRAWN: 0 },
    });
    show();

    expect(screen.getByRole("tab", { name: /All\s*5/ })).toBeTruthy();
    expect(screen.getByRole("tab", { name: /Hired\s*1/ })).toBeTruthy();
    expect(queryArgs).toHaveBeenLastCalledWith("job-1", { status: undefined, page: 1 });

    fireEvent.click(screen.getByRole("tab", { name: /Shortlisted/ }));
    expect(queryArgs).toHaveBeenLastCalledWith("job-1", { status: "SHORTLISTED", page: 1 });
  });

  it("downloads the CV through a fresh link and refreshes the list (opening it marks it seen)", async () => {
    show();
    fireEvent.click(screen.getByRole("button", { name: /Download CV/ }));

    await waitFor(() => expect(downloadCv).toHaveBeenCalledTimes(1));
    (downloadCv.mock.calls[0][0] as () => unknown)();
    expect(getApplicationCvLink).toHaveBeenCalledWith("app-1");
  });

  it("says so when a CV cannot be opened", async () => {
    downloadCv.mockResolvedValue({ error: { message: "x", status: 500 } });
    show();
    fireEvent.click(screen.getByRole("button", { name: /Download CV/ }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/went wrong/i);
  });

  it("disables the download for a CV whose file has been removed", () => {
    state.data = result([applicant({ cvAvailable: false })]);
    show();
    const button = screen.getByRole("button", { name: "CV no longer available" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("shortlists after asking, sending the optional message", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));
    expect(screen.getByText(/They are told they made your shortlist/)).toBeTruthy();
    expect(setStatus).not.toHaveBeenCalled();

    fireEvent.change(screen.getByLabelText(/Message to Tolu Bello/), { target: { value: "Loved your CV" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Shortlist" }).at(-1)!);

    expect(setStatus).toHaveBeenCalledWith(
      { id: "app-1", status: "SHORTLISTED", note: "Loved your CV" },
      expect.any(Object)
    );
  });

  it("warns that a rejection is final, and hiring fills an opening", () => {
    show();

    fireEvent.click(screen.getByRole("button", { name: "Not selected" }));
    expect(screen.getByText(/This is final/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    fireEvent.click(screen.getByRole("button", { name: "Hire" }));
    expect(screen.getByText(/fills one of your 2 openings and is final/)).toBeTruthy();
  });

  it("cannot hire once every opening is filled", () => {
    state.data = result([applicant()], { job: { id: "job-1", title: "Intern", openings: 1, hired: 1 } });
    show();
    expect((screen.getByRole("button", { name: "Hire" }) as HTMLButtonElement).disabled).toBe(true);
    // The other decisions stay available.
    expect((screen.getByRole("button", { name: "Shortlist" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("shows the server's reason when a decision is refused, and keeps the dialog open", () => {
    setStatus.mockImplementation((_vars, opts) =>
      opts.onError(Object.assign(new Error("All 2 openings are already filled."), { status: 400 }))
    );
    show();

    fireEvent.click(screen.getByRole("button", { name: "Hire" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Hire" }).at(-1)!);

    expect(screen.getByText("All 2 openings are already filled.")).toBeTruthy();
  });

  it("closes the dialog and clears the message after a decision is saved", () => {
    setStatus.mockImplementation((_vars, opts) => opts.onSuccess());
    show();

    fireEvent.click(screen.getByRole("button", { name: "Shortlist" }));
    fireEvent.change(screen.getByLabelText(/Message to/), { target: { value: "Hello" } });
    fireEvent.click(screen.getAllByRole("button", { name: "Shortlist" }).at(-1)!);

    expect(screen.queryByText(/They are told they made your shortlist/)).toBeNull();
  });

  it("offers no decisions on an application that is final", () => {
    state.data = result([applicant({ status: "HIRED", decidedAt: "2026-11-05T00:00:00.000Z" })]);
    show();
    expect(screen.queryByRole("button", { name: "Shortlist" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Hire" })).toBeNull();
    expect(screen.getByText(/Decided/)).toBeTruthy();
  });

  it("shows the message the employer sent with a decision", () => {
    state.data = result([applicant({ status: "REJECTED", employerNote: "Thanks for applying" })]);
    show();
    expect(screen.getByText(/Your message:/)).toBeTruthy();
    expect(screen.getByText(/Thanks for applying/)).toBeTruthy();
  });

  it("lets the employer report an applicant, whatever their status", () => {
    state.data = result([applicant({ status: "HIRED", decidedAt: "2026-11-05T00:00:00.000Z" })]);
    show();
    expect(screen.queryByRole("dialog", { name: "Report this applicant" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /Report applicant/ }));

    const dialog = screen.getByRole("dialog", { name: "Report this applicant" });
    expect(dialog.textContent).toContain("Tolu Bello");
  });
});
