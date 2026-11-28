/**
 * A freelancer's contracts in three plain groups instead of eight raw statuses: the ones waiting on them, the ones
 * moving without them, and finished. The mobile app's freelance-ux (contractTab, defaultContractTab,
 * contractsHeadline, paidPercent) and contracts (isMyMove, nextStep) say the same for the freelancer's side.
 */

import type { Engagement } from "@/services/jobs";

export type ContractGroup = "yours" | "moving" | "done";

export const CONTRACT_GROUPS: { id: ContractGroup; label: string; empty: string }[] = [
  { id: "yours", label: "Needs you", empty: "Nothing is waiting on you right now." },
  { id: "moving", label: "In progress", empty: "No contracts are moving right now." },
  { id: "done", label: "Finished", empty: "Finished and cancelled contracts will be listed here." },
];

type Basics = Pick<Engagement, "status" | "paymentType">;

const isOpen = (e: Basics) => e.status !== "COMPLETED" && e.status !== "CANCELLED";

/** The freelancer's turn: there is work to submit, or changes the client asked for. */
export const isMyMove = (e: Basics): boolean => e.status === "IN_PROGRESS" || e.status === "REVISION_REQUESTED";

export function contractGroup(e: Basics): ContractGroup {
  if (!isOpen(e)) return "done";
  return isMyMove(e) ? "yours" : "moving";
}

export function defaultContractGroup(items: Basics[]): ContractGroup {
  for (const g of ["yours", "moving"] as const) if (items.some((e) => contractGroup(e) === g)) return g;
  return "done";
}

/** "2 contracts are waiting for you", or null when nothing is. */
export function contractsHeadline(items: Basics[]): string | null {
  const n = items.filter(isMyMove).length;
  if (n === 0) return null;
  return n === 1 ? "1 contract is waiting for you" : `${n} contracts are waiting for you`;
}

/** What the freelancer is waiting on, in plain words. */
export function nextStep(e: Basics): string | null {
  const hourly = e.paymentType === "HOURLY";
  switch (e.status) {
    case "PENDING_PAYMENT":
      return "Waiting for the client to fund the contract.";
    case "FUNDED":
      return "The payment is held safely. Waiting for the client to start the work.";
    case "IN_PROGRESS":
      return hourly ? "Log your hours, then submit your timesheet when the week is done." : "Submit your work when it is ready for review.";
    case "SUBMITTED":
      return hourly ? "Waiting for the client to review your timesheet." : "Waiting for the client to review your work.";
    case "REVISION_REQUESTED":
      return hourly ? "The client asked for changes. Update your hours and submit again." : "The client asked for changes. Update the work and submit again.";
    case "DISPUTED":
      return "Kampmax is looking at the dispute. The money stays held until it is settled.";
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
