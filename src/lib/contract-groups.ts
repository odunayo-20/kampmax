/**
 * Contracts in three plain groups instead of eight raw statuses: the ones waiting on you, the ones moving without
 * you, and finished, for either side. The mobile app's freelance-ux (contractTab, defaultContractTab,
 * contractsHeadline, paidPercent) and contracts (isMyMove, nextStep) say the same.
 */

import type { Engagement } from "@/services/jobs";

export type Party = "freelancer" | "employer";
export type ContractGroup = "yours" | "moving" | "done";

export const CONTRACT_GROUPS: { id: ContractGroup; label: string; empty: string }[] = [
  { id: "yours", label: "Needs you", empty: "Nothing is waiting on you right now." },
  { id: "moving", label: "In progress", empty: "No contracts are moving right now." },
  { id: "done", label: "Finished", empty: "Finished and cancelled contracts will be listed here." },
];

type Basics = Pick<Engagement, "status" | "paymentType">;

const isOpen = (e: Basics) => e.status !== "COMPLETED" && e.status !== "CANCELLED";

/**
 * Whose turn it is. The freelancer's when there is work to submit or changes were asked for; the employer's when
 * the contract needs funding, starting, or the submitted work needs a review.
 */
export function isMyMove(e: Basics, party: Party): boolean {
  if (party === "freelancer") return e.status === "IN_PROGRESS" || e.status === "REVISION_REQUESTED";
  return e.status === "PENDING_PAYMENT" || e.status === "FUNDED" || e.status === "SUBMITTED";
}

export function contractGroup(e: Basics, party: Party): ContractGroup {
  if (!isOpen(e)) return "done";
  return isMyMove(e, party) ? "yours" : "moving";
}

export function defaultContractGroup(items: Basics[], party: Party): ContractGroup {
  for (const g of ["yours", "moving"] as const) if (items.some((e) => contractGroup(e, party) === g)) return g;
  return "done";
}

/** "2 contracts are waiting for you", or null when nothing is. */
export function contractsHeadline(items: Basics[], party: Party): string | null {
  const n = items.filter((e) => isMyMove(e, party)).length;
  if (n === 0) return null;
  return n === 1 ? "1 contract is waiting for you" : `${n} contracts are waiting for you`;
}

/** What this side is waiting on, in plain words. */
export function nextStep(e: Basics, party: Party): string | null {
  const employer = party === "employer";
  const hourly = e.paymentType === "HOURLY";
  switch (e.status) {
    case "PENDING_PAYMENT":
      return employer ? "Fund the contract to hold the payment in escrow." : "Waiting for the client to fund the contract.";
    case "FUNDED":
      return employer ? "The payment is held safely. Start the work when you are ready." : "The payment is held safely. Waiting for the client to start the work.";
    case "IN_PROGRESS":
      if (hourly) return employer ? "The freelancer is logging hours this week." : "Log your hours, then submit your timesheet when the week is done.";
      return employer ? "The freelancer is working on it." : "Submit your work when it is ready for review.";
    case "SUBMITTED":
      if (hourly) return employer ? "Review the timesheet: approving pays for the hours logged, and the rest goes back to you." : "Waiting for the client to review your timesheet.";
      return employer ? "Review the work: approve it to release the payment, or ask for changes." : "Waiting for the client to review your work.";
    case "REVISION_REQUESTED":
      if (hourly) return employer ? "Waiting for the freelancer to update the hours." : "The client asked for changes. Update your hours and submit again.";
      return employer ? "Waiting for the freelancer to send updated work." : "The client asked for changes. Update the work and submit again.";
    case "DISPUTED":
      return "Kampmax support is reviewing the dispute. The money stays held until it is settled.";
    default:
      return null;
  }
}

/** Share of a fixed-price contract already paid out, 0 to 100. Display only: the backend moves the money. */
export function paidPercent(e: Pick<Engagement, "status" | "agreedAmount" | "milestones">): number {
  if (e.status === "COMPLETED") return 100;
  const total = Number(e.agreedAmount);
  if (!(total > 0)) return 0;
  const paid = e.milestones.filter((m) => m.status === "COMPLETED").reduce((sum, m) => sum + m.amount, 0);
  return Math.max(0, Math.min(100, Math.round((paid / total) * 100)));
}

// ---- money held in escrow ---------------------------------------------------------------

/** A contract holds its current step's money from funding until it is paid out or refunded. */
const HELD = new Set(["FUNDED", "IN_PROGRESS", "SUBMITTED", "REVISION_REQUESTED", "DISPUTED"]);

/** What is held across these contracts: the current step of each funded one (the mobile app's heldInEscrow). */
export function heldInEscrow(contracts: Pick<Engagement, "status" | "milestones" | "currentMilestonePosition">[]): { total: number; count: number } {
  let kobo = 0;
  let count = 0;
  for (const c of contracts) {
    if (!HELD.has(c.status)) continue;
    const current = c.milestones.find((m) => m.position === c.currentMilestonePosition);
    if (!current) continue;
    kobo += Math.round(current.amount * 100);
    count += 1;
  }
  return { total: kobo / 100, count };
}
