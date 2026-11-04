// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { Opportunity } from "@/types/opportunity";
import type { Cv, MyApplication } from "@/services/job-applications";

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

const state = { cvs: [] as Cv[], loading: false };
const apply = vi.fn();

vi.mock("@/hooks/use-job-applications", () => ({
  useCvs: () => ({ data: state.loading ? undefined : state.cvs, isPending: state.loading }),
  useApplyToJob: () => ({ mutate: apply, isPending: false }),
  useUploadCv: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { ApplyDialog, firstMissingAnswer } from "../ApplyDialog";
import { HiringApplyPanel } from "../HiringApplyPanel";

afterEach(cleanup);
beforeEach(() => {
  state.cvs = [];
  state.loading = false;
  apply.mockReset();
});

const cv = (id: string, label: string): Cv => ({
  id,
  label,
  filename: `${label}.pdf`,
  sizeBytes: 100_000,
  mimeType: "application/pdf",
  createdAt: "2026-11-01T00:00:00Z",
  applicationCount: 0,
});

const job = (overrides: Partial<Opportunity> = {}): Opportunity =>
  ({
    id: "job-1",
    title: "Marketing intern",
    status: "open",
    employer: { id: "e1", name: "Acme Ltd", descriptor: "", location: "", verified: true },
    screeningQuestions: [
      { id: "q1", question: "Why us?", optional: false },
      { id: "q2", question: "Portfolio link?", optional: true },
    ],
    ...overrides,
  }) as Opportunity;

const open = (j: Opportunity = job(), extra: { onClose?: () => void; onApplied?: () => void } = {}) => {
  const onClose = extra.onClose ?? vi.fn();
  render(<ApplyDialog job={j} open onClose={onClose} onApplied={extra.onApplied} />);
  return { onClose };
};

describe("firstMissingAnswer", () => {
  const questions = job().screeningQuestions;
  it("names the first required question left blank", () => {
    expect(firstMissingAnswer(questions, {})).toBe("Why us?");
    expect(firstMissingAnswer(questions, { q1: "   " })).toBe("Why us?");
  });
  it("is satisfied once every required question has an answer, ignoring optional ones", () => {
    expect(firstMissingAnswer(questions, { q1: "Because" })).toBeNull();
  });
  it("is satisfied when there are no questions", () => {
    expect(firstMissingAnswer([], {})).toBeNull();
  });
});

describe("ApplyDialog", () => {
  it("renders nothing while closed", () => {
    render(<ApplyDialog job={job()} open={false} onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("starts on the newest CV and says who will see the application", () => {
    state.cvs = [cv("cv-2", "General"), cv("cv-1", "Design CV")];
    open();
    expect((screen.getByRole("radio", { name: /General/ }) as HTMLInputElement).checked).toBe(true);
    expect(screen.getByText(/will be shared with Acme Ltd/)).toBeTruthy();
    // Staff access is disclosed up front, not buried.
    expect(screen.getByText(/Kampmax staff can also read them to review a report/)).toBeTruthy();
    expect(screen.getByRole("link", { name: "My CVs" }).getAttribute("href")).toBe("/profile/cvs");
  });

  it("cannot be sent without a CV, and offers to add one", () => {
    open();
    expect(screen.getByText(/don't have a CV saved yet/)).toBeTruthy();
    expect(screen.getByLabelText("Add a CV")).toBeTruthy();
    expect((screen.getByRole("button", { name: "Send application" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("cannot be sent until every required question is answered, and says which", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    open();
    const send = screen.getByRole("button", { name: "Send application" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    expect(screen.getByText(/Answer .Why us\?. to continue/)).toBeTruthy();

    fireEvent.change(screen.getByLabelText(/Why us\?/), { target: { value: "I admire the brand" } });
    expect(send.disabled).toBe(false);
  });

  it("marks required and optional questions", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    open();
    expect(screen.getByLabelText(/Why us\?/).closest("div")?.textContent).toContain("*");
    expect(screen.getByText("(optional)", { selector: "span" })).toBeTruthy();
  });

  it("sends the chosen CV, a trimmed note and only the answers that were written", () => {
    state.cvs = [cv("cv-2", "General"), cv("cv-1", "Design CV")];
    open();

    fireEvent.click(screen.getByRole("radio", { name: /Design CV/ }));
    fireEvent.change(screen.getByLabelText(/Note to the employer/), { target: { value: "  Keen to learn  " } });
    fireEvent.change(screen.getByLabelText(/Why us\?/), { target: { value: " Because " } });
    fireEvent.click(screen.getByRole("button", { name: "Send application" }));

    expect(apply).toHaveBeenCalledWith(
      {
        cvId: "cv-1",
        coverNote: "Keen to learn",
        screeningAnswers: [{ questionId: "q1", answer: "Because" }],
      },
      expect.any(Object)
    );
  });

  it("sends no note when none is written", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    open(job({ screeningQuestions: [] }));
    fireEvent.click(screen.getByRole("button", { name: "Send application" }));
    expect(apply).toHaveBeenCalledWith(
      { cvId: "cv-1", coverNote: undefined, screeningAnswers: [] },
      expect.any(Object)
    );
  });

  it("closes and tells the page once the application is sent", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    apply.mockImplementation((_input, opts) => opts.onSuccess({ id: "app-1" }));
    const onApplied = vi.fn();
    const { onClose } = open(job({ screeningQuestions: [] }), { onApplied });

    fireEvent.click(screen.getByRole("button", { name: "Send application" }));

    expect(onApplied).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the server's reason when it refuses, and stays open", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    apply.mockImplementation((_input, opts) =>
      opts.onError(Object.assign(new Error("You already applied to this posting."), { status: 409 }))
    );
    const { onClose } = open(job({ screeningQuestions: [] }));

    fireEvent.click(screen.getByRole("button", { name: "Send application" }));

    expect(screen.getByRole("alert").textContent).toBe("You already applied to this posting.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("closes with Escape, and from Cancel", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    const { onClose } = open();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

describe("HiringApplyPanel", () => {
  const application = (overrides: Partial<MyApplication> = {}): MyApplication =>
    ({
      id: "app-1",
      status: "SUBMITTED",
      cvLabel: "Design CV",
      employerNote: null,
      createdAt: "2026-11-02T00:00:00Z",
      ...overrides,
    }) as MyApplication;

  const show = (props: Partial<React.ComponentProps<typeof HiringApplyPanel>> = {}) =>
    render(
      <HiringApplyPanel job={job()} isOwner={false} application={null} loading={false} {...props} />
    );

  it("invites an open posting to be applied to, and opens the dialog", () => {
    state.cvs = [cv("cv-1", "Design CV")];
    show();
    expect(screen.getByText("Ready to apply?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Apply now/ }));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("will not let anyone apply to a posting that has closed", () => {
    show({ job: job({ status: "expired" }) });
    expect(screen.getByText("Applications are closed")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Apply now/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("waits for the person's existing application before offering to apply", () => {
    show({ loading: true });
    expect((screen.getByRole("button", { name: /Apply now/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows an application already sent, and how it is going", () => {
    show({ application: application({ status: "SHORTLISTED" }) });
    expect(screen.getByText("You've applied")).toBeTruthy();
    expect(screen.getByText("Shortlisted")).toBeTruthy();
    expect(screen.getByText(/with "Design CV"/)).toBeTruthy();
    expect(screen.getByRole("link", { name: /My applications/ }).getAttribute("href")).toBe(
      "/profile/applications"
    );
    expect(screen.queryByRole("button", { name: /Apply now/ })).toBeNull();
  });

  it("passes on a message from the employer", () => {
    show({ application: application({ status: "REJECTED", employerNote: "We went with someone with more experience" }) });
    expect(screen.getByText(/We went with someone with more experience/)).toBeTruthy();
  });

  it("sends the owner to their applicants instead", () => {
    show({ isOwner: true });
    expect(screen.getByText("This is your posting")).toBeTruthy();
    expect(screen.getByRole("link", { name: /View applicants/ }).getAttribute("href")).toBe(
      "/employer/jobs/job-1/applications"
    );
    expect(screen.queryByRole("button", { name: /Apply now/ })).toBeNull();
  });
});
