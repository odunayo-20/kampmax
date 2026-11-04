// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AdminApplicationDetail } from "@/types/job-moderation";

const state = {
  loading: false,
  error: null as Error | null,
  data: undefined as AdminApplicationDetail | undefined,
};
const queryId = vi.fn();
const refetch = vi.fn();
const openCv = vi.fn();

vi.mock("@/hooks/admin/use-admin-job-reports", () => ({
  useAdminApplication: (id: string | null) => {
    queryId(id);
    return {
      data: state.loading || state.error ? undefined : state.data,
      isPending: state.loading,
      isError: !!state.error,
      error: state.error,
      refetch,
    };
  },
  openApplicationCv: (...a: unknown[]) => openCv(...a),
}));

import { ApplicationReviewDialog } from "../ApplicationReviewDialog";

afterEach(cleanup);
beforeEach(() => {
  state.loading = false;
  state.error = null;
  state.data = detail();
  queryId.mockReset();
  refetch.mockReset();
  openCv.mockReset().mockResolvedValue({ error: null });
});

function detail(over: Partial<AdminApplicationDetail> = {}): AdminApplicationDetail {
  return {
    id: "app-1",
    status: "under_review",
    cvLabel: "Design CV",
    cvAvailable: true,
    coverNote: "I love design",
    answers: [{ question: "Why us?", answer: "Great team" }],
    employerNote: null,
    createdAt: "2026-11-04T10:00:00.000Z",
    viewedAt: null,
    decidedAt: null,
    applicant: { id: "u1", name: "Tolu Bello", username: "tolu" },
    job: {
      id: "job-1",
      title: "Marketing intern",
      opportunityType: "INTERNSHIP",
      status: "PUBLISHED",
      employerName: "Acme Ltd",
    },
    ...over,
  };
}

describe("ApplicationReviewDialog", () => {
  it("renders nothing without an application", () => {
    render(<ApplicationReviewDialog applicationId={null} onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for the application it was opened for", () => {
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);
    expect(queryId).toHaveBeenCalledWith("app-1");
  });

  it("shows the applicant, their note and answers, and says the look is logged", () => {
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);

    expect(screen.getByRole("heading", { name: "Tolu Bello" })).toBeTruthy();
    expect(screen.getByText(/Marketing intern · Acme Ltd/)).toBeTruthy();
    expect(screen.getByText("Under review")).toBeTruthy();
    expect(screen.getByText("I love design")).toBeTruthy();
    expect(screen.getByText("Why us?")).toBeTruthy();
    expect(screen.getByText("Great team")).toBeTruthy();
    expect(screen.getByText(/recorded in the audit log with your name/)).toBeTruthy();
  });

  it("says when there is no note, and names a question that was removed from the posting", () => {
    state.data = detail({ coverNote: null, answers: [{ question: "", answer: "Orphaned" }] });
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);
    expect(screen.getByText("No note.")).toBeTruthy();
    expect(screen.getByText("Question removed from the posting")).toBeTruthy();
  });

  it("shows the employer's message to the applicant when there is one", () => {
    state.data = detail({ employerNote: "Thanks for applying" });
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);
    expect(screen.getByText("Thanks for applying")).toBeTruthy();
  });

  it("opens the CV through a fresh link made at the click", async () => {
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);
    expect(openCv).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Open CV" }));
    });

    expect(openCv).toHaveBeenCalledTimes(1);
    expect(openCv).toHaveBeenCalledWith("app-1");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows why a CV could not be opened", async () => {
    openCv.mockResolvedValue({ error: "This CV is no longer available." });
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Open CV" }));
    });

    expect(screen.getByRole("alert").textContent).toBe("This CV is no longer available.");
  });

  it("disables the CV button once the file is gone", () => {
    state.data = detail({ cvAvailable: false });
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);
    const button = screen.getByRole("button", { name: "CV no longer available" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it("offers a retry when the application cannot be opened", () => {
    state.error = new Error("You don't have permission to do that.");
    render(<ApplicationReviewDialog applicationId="app-1" onClose={() => undefined} />);
    expect(screen.getByText("You don't have permission to do that.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /try again|retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("closes from the button and from Escape", () => {
    const onClose = vi.fn();
    render(<ApplicationReviewDialog applicationId="app-1" onClose={onClose} />);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
