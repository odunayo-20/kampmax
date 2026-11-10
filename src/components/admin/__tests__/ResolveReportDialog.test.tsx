// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ResolveReportDialog } from "../accommodation/ResolveReportDialog";
import type { AdminReport } from "@/types/accommodation";

afterEach(cleanup);

const report = (over: Partial<AdminReport> = {}): AdminReport => ({
  id: "r1",
  listingId: "l1",
  listingTitle: "Bright room near campus",
  listingModerationStatus: "APPROVED",
  agentId: "a1",
  agentName: "Obi Homes",
  reason: "FAKE_LISTING",
  description: "Photos are from another site",
  status: "OPEN",
  openReportsOnListing: 1,
  reporterId: "u1",
  reporterName: "Chidi O.",
  reviewedAt: null,
  resolution: null,
  createdAt: "2026-12-01T09:00:00Z",
  ...over,
});

const setup = (over: Partial<AdminReport> = {}, props: Partial<Parameters<typeof ResolveReportDialog>[0]> = {}) => {
  const onSubmit = vi.fn();
  const onClose = vi.fn();
  const view = render(
    <ResolveReportDialog report={report(over)} onSubmit={onSubmit} onClose={onClose} {...props} />
  );
  return { onSubmit, onClose, ...view };
};

const note = () => screen.getByLabelText(/What you found and did/) as HTMLTextAreaElement;
const submit = () => screen.getByRole("button", { name: /Close report|Dismiss report/ }) as HTMLButtonElement;

describe("ResolveReportDialog", () => {
  it("is not shown without a report", () => {
    const { container } = render(<ResolveReportDialog report={null} onSubmit={() => {}} onClose={() => {}} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows what was reported: the reason, the listing and the reporter's words", () => {
    setup();
    expect(screen.getByText("Fake listing")).toBeTruthy();
    expect(screen.getByText(/Bright room near campus/)).toBeTruthy();
    expect(screen.getByText(/Photos are from another site/)).toBeTruthy();
  });

  it("will not submit without a note of at least five characters", () => {
    setup();
    expect(submit().disabled).toBe(true);
    fireEvent.change(note(), { target: { value: "abcd" } });
    expect(submit().disabled).toBe(true);
    fireEvent.change(note(), { target: { value: "abcde" } });
    expect(submit().disabled).toBe(false);
  });

  it("does not count spaces toward the minimum", () => {
    setup();
    fireEvent.change(note(), { target: { value: "  ab  " } });
    expect(submit().disabled).toBe(true);
  });

  it("starts as 'acted on it', and sends the trimmed note", () => {
    const { onSubmit } = setup();
    fireEvent.change(note(), { target: { value: "  Photos are copied from another site  " } });
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith({
      decision: "RESOLVED",
      resolution: "Photos are copied from another site",
      suspendListing: false,
    });
  });

  it("takes the listing down only when the box is ticked", () => {
    const { onSubmit } = setup();
    fireEvent.change(note(), { target: { value: "Confirmed fake" } });
    fireEvent.click(screen.getByLabelText(/Also take the listing down/));
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith({ decision: "RESOLVED", resolution: "Confirmed fake", suspendListing: true });
  });

  it("dismissing changes the button, hides the take-down option and never takes a listing down", () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByLabelText(/Also take the listing down/));
    fireEvent.click(screen.getByLabelText(/Nothing wrong/));
    expect(screen.queryByLabelText(/Also take the listing down/)).toBeNull();
    fireEvent.change(note(), { target: { value: "Checked: it is genuine" } });
    expect(submit().textContent).toBe("Dismiss report");
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith({
      decision: "DISMISSED",
      resolution: "Checked: it is genuine",
      suspendListing: false,
    });
  });

  it("explains, and disables, the take-down option for a listing that is already off the site", () => {
    setup({ listingModerationStatus: "ADMIN_SUSPENDED" });
    const box = screen.getByLabelText(/Also take the listing down/) as HTMLInputElement;
    expect(box.disabled).toBe(true);
    expect(screen.getByText(/already off the site/)).toBeTruthy();
  });

  it("cannot take down a listing that is not approved, even if it had been ticked before", () => {
    const { onSubmit, rerender } = setup();
    fireEvent.click(screen.getByLabelText(/Also take the listing down/));
    rerender(
      <ResolveReportDialog report={report({ listingModerationStatus: "REJECTED" })} onSubmit={onSubmit} onClose={() => {}} />
    );
    fireEvent.change(note(), { target: { value: "Looked at it" } });
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ suspendListing: false }));
  });

  it("starts each report from a clean form", () => {
    const { onSubmit, rerender } = setup();
    fireEvent.change(note(), { target: { value: "A note for the first one" } });
    fireEvent.click(screen.getByLabelText(/Nothing wrong/));
    rerender(<ResolveReportDialog report={report({ id: "r2" })} onSubmit={onSubmit} onClose={() => {}} />);
    expect(note().value).toBe("");
    expect((screen.getByLabelText(/Acted on it/) as HTMLInputElement).checked).toBe(true);
    expect(submit().disabled).toBe(true);
  });

  it("shows why the last attempt failed, and keeps what was typed", () => {
    setup({}, { error: "This report has already been handled." });
    expect(screen.getByRole("alert").textContent).toContain("This report has already been handled.");
  });

  it("locks the form while saving", () => {
    const { onSubmit } = setup({}, { loading: true });
    expect(note().disabled).toBe(true);
    expect(submit().disabled).toBe(true);
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.submit(note().closest("form")!);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("closes with Escape, the close button and Cancel", () => {
    const { onClose } = setup();
    fireEvent.keyDown(document, { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("stops the page behind it from scrolling, and restores it", () => {
    const { unmount } = setup();
    expect(document.body.style.overflow).toBe("hidden");
    unmount();
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("caps the note at 500 characters", () => {
    setup();
    expect(note().maxLength).toBe(500);
  });
});
