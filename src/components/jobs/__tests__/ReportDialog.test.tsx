// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReportInput } from "@/types/job-moderation";

type Callbacks = { onSuccess?: () => void; onError?: (e: unknown) => void };

const posting = { mutate: vi.fn(), isPending: false };
const applicant = { mutate: vi.fn(), isPending: false };
const postingId = vi.fn();
const applicantId = vi.fn();

vi.mock("@/hooks/use-job-reports", () => ({
  useReportPosting: (id: string) => {
    postingId(id);
    return posting;
  },
  useReportApplicant: (id: string) => {
    applicantId(id);
    return applicant;
  },
}));

import { ReportDialog, type ReportTarget } from "../ReportDialog";

afterEach(cleanup);
beforeEach(() => {
  posting.mutate.mockReset();
  posting.isPending = false;
  applicant.mutate.mockReset();
  applicant.isPending = false;
  postingId.mockReset();
  applicantId.mockReset();
});

const postingTarget: ReportTarget = { kind: "posting", jobId: "job-1", title: "Marketing intern" };
const applicantTarget: ReportTarget = { kind: "applicant", applicationId: "app-1", name: "Tolu Bello" };

const open = (target: ReportTarget, onClose = vi.fn()) => {
  render(<ReportDialog open target={target} onClose={onClose} />);
  return { onClose };
};

describe("ReportDialog", () => {
  it("renders nothing while closed", () => {
    render(<ReportDialog open={false} target={postingTarget} onClose={() => undefined} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("offers the reasons that make sense for a posting", () => {
    open(postingTarget);
    expect(screen.getByRole("dialog", { name: "Report this posting" })).toBeTruthy();
    expect(screen.getByText("Marketing intern")).toBeTruthy();
    const labels = screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent ?? "");
    expect(labels.some((l) => l.includes("Asks for money"))).toBe(true);
    expect(labels.some((l) => l.includes("Abusive or harassing"))).toBe(false);
    expect(screen.getByText("The employer isn't told who reported them.", { exact: false })).toBeTruthy();
  });

  it("offers the reasons that make sense for an applicant", () => {
    open(applicantTarget);
    expect(screen.getByRole("dialog", { name: "Report this applicant" })).toBeTruthy();
    const labels = screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent ?? "");
    expect(labels.some((l) => l.includes("Abusive or harassing"))).toBe(true);
    expect(labels.some((l) => l.includes("Asks for money"))).toBe(false);
    expect(screen.getByText("The applicant isn't told who reported them.", { exact: false })).toBeTruthy();
  });

  it("cannot be sent until a reason is chosen", () => {
    open(postingTarget);
    const send = screen.getByRole("button", { name: "Send report" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: /Looks like a scam/ }));
    expect(send.disabled).toBe(false);
  });

  it("reports a posting with the reason and what was written", () => {
    open(postingTarget);
    fireEvent.click(screen.getByRole("radio", { name: /Asks for money/ }));
    fireEvent.change(screen.getByLabelText(/What happened/), { target: { value: "  wants ₦5,000 first  " } });
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(postingId).toHaveBeenCalledWith("job-1");
    expect(posting.mutate).toHaveBeenCalledTimes(1);
    expect(applicant.mutate).not.toHaveBeenCalled();
    expect(posting.mutate.mock.calls[0][0]).toEqual<ReportInput>({
      reason: "ASKS_FOR_PAYMENT",
      details: "wants ₦5,000 first",
    });
  });

  it("reports an applicant through the applicant route, leaving out empty details", () => {
    open(applicantTarget);
    fireEvent.click(screen.getByRole("radio", { name: /Abusive or harassing/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));

    expect(applicantId).toHaveBeenCalledWith("app-1");
    expect(applicant.mutate.mock.calls[0][0]).toEqual({ reason: "ABUSIVE", details: undefined });
    expect(posting.mutate).not.toHaveBeenCalled();
  });

  it("thanks the person once it is sent", () => {
    const { onClose } = open(postingTarget);
    fireEvent.click(screen.getByRole("radio", { name: /Looks like a scam/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    act(() => (posting.mutate.mock.calls[0][1] as Callbacks).onSuccess?.());

    // The form is replaced, and the thanks is announced.
    expect(screen.getByRole("status").textContent).toContain("Thanks, we'll take a look");
    expect(screen.queryByRole("button", { name: "Send report" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows the reason the server gives, such as having already reported", () => {
    open(postingTarget);
    fireEvent.click(screen.getByRole("radio", { name: /Looks like a scam/ }));
    fireEvent.click(screen.getByRole("button", { name: "Send report" }));
    act(() =>
      (posting.mutate.mock.calls[0][1] as Callbacks).onError?.(
        Object.assign(new Error("You already reported this. Our team will review it."), { status: 409 })
      )
    );

    expect(screen.getByRole("alert").textContent).toBe("You already reported this. Our team will review it.");
    // Still the form: the person can change their mind or close it.
    expect(screen.getByRole("button", { name: "Send report" })).toBeTruthy();
  });

  it("closes on Cancel and on Escape, but not while sending", () => {
    const { onClose } = open(postingTarget);
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);

    cleanup();
    posting.isPending = true;
    const second = open(postingTarget);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(second.onClose).not.toHaveBeenCalled();
    expect((screen.getByRole("button", { name: "Sending…" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
