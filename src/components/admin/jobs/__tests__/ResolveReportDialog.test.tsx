// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { AdminJobReport, ResolveReportResult } from "@/types/job-moderation";

type Callbacks = { onSuccess?: (r: ResolveReportResult) => void; onError?: (e: unknown) => void };

const resolve = { mutate: vi.fn(), isPending: false };
const hookId = vi.fn();

vi.mock("@/hooks/admin/use-admin-job-reports", () => ({
  useResolveJobReport: (id: string) => {
    hookId(id);
    return resolve;
  },
}));

import { ResolveReportDialog } from "../ResolveReportDialog";

afterEach(cleanup);
beforeEach(() => {
  resolve.mutate.mockReset();
  resolve.isPending = false;
  hookId.mockReset();
});

function report(over: Partial<AdminJobReport> = {}): AdminJobReport {
  return {
    id: "rep-1",
    targetType: "POSTING",
    reason: "SCAM",
    details: null,
    status: "OPEN",
    outcome: null,
    resolutionNote: null,
    resolvedAt: null,
    createdAt: "2026-11-04T10:00:00.000Z",
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

const applicantReport = () =>
  report({
    targetType: "APPLICANT",
    reason: "ABUSIVE",
    applicant: {
      id: "u1",
      name: "Tolu Bello",
      username: "tolu",
      applicationId: "app-1",
      applicationStatus: "SUBMITTED",
    },
  });

const open = (
  r: AdminJobReport | null = report(),
  extra: { onClose?: () => void; onResolved?: () => void } = {}
) => {
  const onClose = extra.onClose ?? vi.fn();
  const onResolved = extra.onResolved ?? vi.fn();
  render(<ResolveReportDialog report={r} onClose={onClose} onResolved={onResolved} />);
  return { onClose, onResolved };
};

const confirm = () =>
  screen.getByRole("button", {
    name: /^(Resolve|Dismiss|Take the posting down|Remove the application)$/,
  }) as HTMLButtonElement;

describe("ResolveReportDialog", () => {
  it("renders nothing without a report", () => {
    open(null);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers dismiss or take-down for a posting report", () => {
    open();
    expect(hookId).toHaveBeenCalledWith("rep-1");
    expect(screen.getByRole("radio", { name: /Dismiss/ })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /Take the posting down/ })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: /Remove the application/ })).toBeNull();
  });

  it("offers dismiss or removing the application for an applicant report", () => {
    open(applicantReport());
    expect(screen.getByRole("radio", { name: /Remove the application/ })).toBeTruthy();
    expect(screen.queryByRole("radio", { name: /Take the posting down/ })).toBeNull();
  });

  it("needs a choice before it can be confirmed", () => {
    open();
    expect(confirm().disabled).toBe(true);
    expect(screen.queryByLabelText(/Reason|Note/)).toBeNull();
  });

  it("dismisses with no note, which only admins would see", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: /Dismiss/ }));
    expect(screen.getByLabelText(/Note \(only admins see this\)/)).toBeTruthy();
    expect(confirm().disabled).toBe(false);

    fireEvent.click(confirm());
    expect(resolve.mutate.mock.calls[0][0]).toEqual({ action: "DISMISS", note: undefined });
  });

  it("will not take a posting down without a reason, because the employer is shown it", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: /Take the posting down/ }));
    expect(screen.getByLabelText("Reason (the employer can see this)")).toBeTruthy();
    expect(confirm().disabled).toBe(true);

    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "  Asks for fees  " } });
    expect(confirm().disabled).toBe(false);

    fireEvent.click(confirm());
    expect(resolve.mutate.mock.calls[0][0]).toEqual({ action: "TAKE_DOWN", note: "Asks for fees" });
  });

  it("can refund the posting fee, and only on a take-down", () => {
    open();
    fireEvent.click(screen.getByRole("radio", { name: /Dismiss/ }));
    expect(screen.queryByLabelText(/Also refund the posting fee/)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /Take the posting down/ }));
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: "Scam" } });
    fireEvent.click(screen.getByLabelText(/Also refund the posting fee/));
    fireEvent.click(confirm());

    expect(resolve.mutate.mock.calls[0][0]).toEqual({ action: "TAKE_DOWN", note: "Scam", refund: true });
  });

  it("tells the admin that other open reports on the posting will close with a take-down", () => {
    open(report({ openOnPosting: 3 }));
    fireEvent.click(screen.getByRole("radio", { name: /Dismiss/ }));
    expect(screen.queryByText(/will be closed too/)).toBeNull();

    fireEvent.click(screen.getByRole("radio", { name: /Take the posting down/ }));
    expect(screen.getByText(/The other 2 open reports on this posting will be closed too/)).toBeTruthy();
  });

  it("will not take down a posting that is already closed", () => {
    open(report({ job: { ...report().job, status: "CLOSED" } }));
    const take = screen.getByRole("radio", { name: /Take the posting down/ }) as HTMLInputElement;
    expect(take.disabled).toBe(true);
    expect(screen.getByText("A closed posting can't be taken down.")).toBeTruthy();
  });

  it("asks for a reason the applicant will see when removing an application", () => {
    open(applicantReport());
    fireEvent.click(screen.getByRole("radio", { name: /Remove the application/ }));
    fireEvent.change(screen.getByLabelText("Reason (the applicant can see this)"), {
      target: { value: "Abusive messages" },
    });
    fireEvent.click(confirm());
    expect(resolve.mutate.mock.calls[0][0]).toEqual({
      action: "REMOVE_APPLICATION",
      note: "Abusive messages",
    });
  });

  it("reassures that the reporter never sees the note", () => {
    open();
    expect(screen.getByText(/only told whether action was taken, never your note/)).toBeTruthy();
  });

  it("hands the result back when it is resolved", () => {
    const { onResolved } = open();
    fireEvent.click(screen.getByRole("radio", { name: /Dismiss/ }));
    fireEvent.click(confirm());
    const result = { report: report(), refundedAmount: 0, alsoResolved: 0 };
    act(() => (resolve.mutate.mock.calls[0][1] as Callbacks).onSuccess?.(result));
    expect(onResolved).toHaveBeenCalledWith(result);
  });

  it("shows why a resolution failed and stays open", () => {
    const { onClose } = open();
    fireEvent.click(screen.getByRole("radio", { name: /Dismiss/ }));
    fireEvent.click(confirm());
    act(() =>
      (resolve.mutate.mock.calls[0][1] as Callbacks).onError?.(
        new Error("This report has already been resolved.")
      )
    );
    expect(screen.getByRole("alert").textContent).toBe("This report has already been resolved.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("cannot be dismissed with Escape while working", () => {
    resolve.isPending = true;
    const { onClose } = open();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Working…" })).toBeTruthy();
  });
});
