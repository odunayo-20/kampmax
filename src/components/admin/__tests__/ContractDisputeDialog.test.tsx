// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ContractDisputeDialog } from "../disputes/ContractDisputeDialog";
import { ContractDisputeList } from "../disputes/ContractDisputeList";
import type { Engagement } from "@/services/jobs";

afterEach(cleanup);

const party = (fullName: string) => ({ id: fullName, userId: fullName, username: fullName.toLowerCase(), fullName, avatar: null });

const disputed = (dispute: Partial<NonNullable<Engagement["dispute"]>> = {}): Engagement => ({
  id: "e1",
  proposalId: "p1",
  jobId: "j1",
  job: { id: "j1", title: "Build a landing page", slug: "build-a-landing-page" },
  freelancerId: "f1",
  freelancer: party("Ada Nwosu"),
  employerId: "em1",
  employer: party("Acme Ltd"),
  agreedAmount: 75000,
  currency: "NGN",
  status: "DISPUTED",
  startDate: null,
  expectedCompletionDate: null,
  submittedAt: null,
  autoReleaseAt: null,
  completedAt: null,
  autoReleasedAt: null,
  cancelledAt: null,
  cancellationReason: null,
  revisionNote: null,
  revisionCount: 0,
  dispute: {
    openedAt: "2026-11-01T10:00:00.000Z",
    openedBy: "EMPLOYER",
    reason: "Nothing was delivered",
    resolvedAt: null,
    outcome: null,
    resolution: null,
    ...dispute,
  },
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-11-01T10:00:00.000Z",
});

function renderDialog(engagement = disputed(), extra: { busy?: boolean; error?: string | null } = {}) {
  const onResolve = vi.fn();
  const onClose = vi.fn();
  render(
    <ContractDisputeDialog
      engagement={engagement}
      busy={extra.busy ?? false}
      error={extra.error ?? null}
      onResolve={onResolve}
      onClose={onClose}
    />
  );
  return { onResolve, onClose };
}

const confirmButton = () => screen.getByRole("button", { name: /Choose a ruling|^Pay |^Refund |Settling/ }) as HTMLButtonElement;

describe("ruling on an open dispute", () => {
  it("shows who reported what, and starts with no side chosen", () => {
    renderDialog();
    expect(screen.getByText("Acme Ltd reported:")).not.toBeNull();
    expect(screen.getByText("Nothing was delivered")).not.toBeNull();
    for (const radio of screen.getAllByRole("radio")) expect((radio as HTMLInputElement).checked).toBe(false);
    expect(confirmButton().disabled).toBe(true);
    expect(confirmButton().textContent).toBe("Choose a ruling");
  });

  it("needs both a side and an explanation, and the button names who gets the money", () => {
    const { onResolve } = renderDialog();

    fireEvent.click(screen.getByRole("radio", { name: /Pay the freelancer/ }));
    expect(confirmButton().disabled).toBe(true); // still no explanation
    expect(confirmButton().textContent).toBe("Pay ₦75,000 to Ada Nwosu");

    fireEvent.change(screen.getByLabelText(/Explain your ruling/), { target: { value: "  Work matched the scope  " } });
    expect(confirmButton().disabled).toBe(false);

    fireEvent.click(confirmButton());
    expect(onResolve).toHaveBeenCalledWith("RELEASE", "Work matched the scope");
  });

  it("can refund the employer instead", () => {
    const { onResolve } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: /Refund the employer/ }));
    fireEvent.change(screen.getByLabelText(/Explain your ruling/), { target: { value: "No work was submitted" } });
    expect(confirmButton().textContent).toBe("Refund ₦75,000 to Acme Ltd");

    fireEvent.click(confirmButton());
    expect(onResolve).toHaveBeenCalledWith("REFUND", "No work was submitted");
  });

  it("locks the form while settling and shows a failure from the server", () => {
    renderDialog(disputed(), { busy: true, error: "Only a disputed engagement can be resolved" });
    expect((screen.getByLabelText(/Explain your ruling/) as HTMLTextAreaElement).disabled).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("Only a disputed engagement can be resolved");
  });

  it("closes on Escape unless it is mid-settlement", () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    cleanup();

    const busy = renderDialog(disputed(), { busy: true });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(busy.onClose).not.toHaveBeenCalled();
  });
});

describe("a resolved dispute", () => {
  it("is a read-only record of the ruling, with no way to rule again", () => {
    renderDialog(
      disputed({ resolvedAt: "2026-11-02T09:00:00.000Z", outcome: "REFUND", resolution: "No work was submitted." })
    );
    expect(screen.getByText("₦75,000 was refunded to Acme Ltd")).not.toBeNull();
    expect(screen.getByText("No work was submitted.")).not.toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /^Refund |^Pay / })).toBeNull();
  });
});

describe("ContractDisputeList", () => {
  const render_ = (items: Engagement[], extra: Partial<React.ComponentProps<typeof ContractDisputeList>> = {}) => {
    const onReview = vi.fn();
    render(
      <ContractDisputeList items={items} loading={false} error={false} filtered={false} onRetry={() => {}} onReview={onReview} {...extra} />
    );
    return { onReview };
  };

  it("offers 'Review & rule' on open cases and 'View ruling' on settled ones", () => {
    const open = disputed();
    const settled = { ...disputed({ resolvedAt: "2026-11-02T00:00:00.000Z", outcome: "RELEASE" }), id: "e2" };
    const { onReview } = render_([open, settled]);

    expect(screen.getByText("Open")).not.toBeNull();
    expect(screen.getByText("Paid freelancer")).not.toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Review Build a landing page" }));
    expect(onReview).toHaveBeenCalledWith(open);
    expect(screen.getByRole("button", { name: "View ruling for Build a landing page" })).not.toBeNull();
  });

  it("tells the admin when a filtered view is empty", () => {
    render_([], { filtered: true });
    expect(screen.getByText("Nothing here")).not.toBeNull();
  });
});
