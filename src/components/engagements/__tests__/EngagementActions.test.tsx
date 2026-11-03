// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

const jobs = vi.hoisted(() => ({
  cancelEngagement: vi.fn(),
  completeEngagement: vi.fn(),
  fundEngagement: vi.fn(),
  openEngagementDispute: vi.fn(),
  requestEngagementRevision: vi.fn(),
  startEngagement: vi.fn(),
  submitEngagementWork: vi.fn(),
  withdrawEngagementSubmission: vi.fn(),
}));
vi.mock("@/services/jobs", () => jobs);

import { EngagementActions } from "../EngagementActions";
import { EngagementNotices } from "../EngagementNotices";

const ok = { engagement: null, error: null };

beforeEach(() => {
  for (const fn of Object.values(jobs)) fn.mockReset().mockResolvedValue(ok);
});
afterEach(cleanup);

function renderActions(props: Partial<React.ComponentProps<typeof EngagementActions>> = {}) {
  const onChanged = vi.fn();
  render(<EngagementActions engagementId="e1" status="SUBMITTED" role="employer" onChanged={onChanged} {...props} />);
  return { onChanged };
}

describe("asking for a written reason", () => {
  it("won't send a change request until the note is long enough, then sends it trimmed", async () => {
    const { onChanged } = renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Request changes" }));

    const send = screen.getByRole("button", { name: "Send request" });
    expect((send as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("What needs to change?"), { target: { value: "  Fix the footer  " } });
    expect((send as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(send);

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(jobs.requestEngagementRevision).toHaveBeenCalledWith("e1", "Fix the footer");
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("requires a reason to cancel and passes it to the backend", async () => {
    const { onChanged } = renderActions({ status: "FUNDED" });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.change(screen.getByLabelText("Why are you cancelling?"), { target: { value: "Scope changed" } });
    fireEvent.click(screen.getByRole("button", { name: "Cancel contract" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(jobs.cancelEngagement).toHaveBeenCalledWith("e1", "Scope changed");
  });

  it("calls it 'Decline' when the freelancer turns down an unfunded contract", () => {
    renderActions({ role: "freelancer", status: "PENDING_PAYMENT" });
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Decline contract" }));
    expect(screen.getByRole("dialog", { name: "Decline this contract?" })).not.toBeNull();
  });

  it("keeps the dialog open and shows the backend's reason when it refuses", async () => {
    jobs.openEngagementDispute.mockResolvedValue({ engagement: null, error: { message: "Already disputed" } });
    const { onChanged } = renderActions({ role: "freelancer", status: "IN_PROGRESS" });

    fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
    fireEvent.change(screen.getByLabelText("What went wrong?"), { target: { value: "Client is not replying" } });
    fireEvent.click(screen.getByRole("button", { name: "Open dispute" }));

    expect((await screen.findByRole("alert")).textContent).toContain("Already disputed");
    expect(screen.getByRole("dialog")).not.toBeNull();
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("closes without doing anything when the user goes back", () => {
    renderActions();
    fireEvent.click(screen.getByRole("button", { name: "Report a problem" }));
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(jobs.openEngagementDispute).not.toHaveBeenCalled();
  });
});

describe("plain confirmations", () => {
  it("asks before withdrawing a submission, then does it", async () => {
    const { onChanged } = renderActions({ role: "freelancer" });
    fireEvent.click(screen.getByRole("button", { name: "Withdraw submission" }));
    expect(jobs.withdrawEngagementSubmission).not.toHaveBeenCalled();

    fireEvent.click(within_dialog("Withdraw submission"));
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(jobs.withdrawEngagementSubmission).toHaveBeenCalledWith("e1");
  });

  it("labels the resubmit step for revision requests", () => {
    renderActions({ role: "freelancer", status: "REVISION_REQUESTED" });
    expect(screen.getByRole("button", { name: "Resubmit work" })).not.toBeNull();
  });
});

describe("EngagementNotices", () => {
  const base = { status: "IN_PROGRESS" as const, revisionNote: null, cancellationReason: null, dispute: null };

  it("shows the client's change request to the freelancer", () => {
    render(
      <EngagementNotices
        role="freelancer"
        engagement={{ ...base, status: "REVISION_REQUESTED", revisionNote: "Fix the footer" }}
      />
    );
    expect(screen.getByText("The client asked for changes")).not.toBeNull();
    expect(screen.getByText(/Fix the footer/)).not.toBeNull();
  });

  it("says who opened an open dispute, from the viewer's point of view", () => {
    const dispute = {
      openedAt: "2026-09-03T00:00:00.000Z",
      openedBy: "EMPLOYER" as const,
      reason: "Nothing was delivered",
      resolvedAt: null,
      outcome: null,
      resolution: null,
    };
    const { rerender } = render(<EngagementNotices role="employer" engagement={{ ...base, status: "DISPUTED", dispute }} />);
    expect(screen.getByText(/You reported a problem/)).not.toBeNull();

    rerender(<EngagementNotices role="freelancer" engagement={{ ...base, status: "DISPUTED", dispute }} />);
    expect(screen.getByText(/The client reported a problem/)).not.toBeNull();
    expect(screen.getByText("Dispute open — payment on hold")).not.toBeNull();
  });

  it("shows how a dispute was settled", () => {
    render(
      <EngagementNotices
        role="employer"
        engagement={{
          ...base,
          status: "CANCELLED",
          dispute: {
            openedAt: "2026-09-03T00:00:00.000Z",
            openedBy: "EMPLOYER",
            reason: "Nothing was delivered",
            resolvedAt: "2026-09-05T00:00:00.000Z",
            outcome: "REFUND",
            resolution: "No work was submitted.",
          },
        }}
      />
    );
    expect(screen.getByText("Dispute resolved — payment refunded to the employer")).not.toBeNull();
    expect(screen.getByText("No work was submitted.")).not.toBeNull();
  });

  it("shows why a contract was cancelled, and nothing for an ordinary one", () => {
    const { container, rerender } = render(
      <EngagementNotices role="freelancer" engagement={{ ...base, status: "CANCELLED", cancellationReason: "Scope changed" }} />
    );
    expect(screen.getByText(/Scope changed/)).not.toBeNull();

    rerender(<EngagementNotices role="freelancer" engagement={base} />);
    expect(container.textContent).toBe("");
  });
});

/** The confirm button inside the open dialog (the page also has a button with the same name). */
function within_dialog(name: string) {
  const dialog = screen.getByRole("dialog");
  const button = Array.from(dialog.querySelectorAll("button")).find((b) => b.textContent === name);
  if (!button) throw new Error(`No "${name}" button in the dialog`);
  return button;
}
