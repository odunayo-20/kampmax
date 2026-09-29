import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedDisputeResolutionOutcome,
  ManagedDisputeStatus,
} from "@/types/admin";

// ------------------------------------------------------------
// DISPUTE STATUS
// ------------------------------------------------------------
// A dispute is an order (orders.disputedAt/disputeResolvedAt) — only two
// real states exist. There is no under-review/escalated/awaiting-party
// workflow in the store.

export const DISPUTE_STATUS_LABELS: Record<ManagedDisputeStatus, string> = {
  open: "Open",
  resolved: "Resolved",
};

export function disputeStatusLabel(status: ManagedDisputeStatus): string {
  return DISPUTE_STATUS_LABELS[status] ?? status;
}

export function disputeStatusVariant(status: ManagedDisputeStatus): BadgeVariant {
  return status === "open" ? "error" : "success";
}

export const DISPUTE_STATUS_FILTER_ORDER: ManagedDisputeStatus[] = [
  "open",
  "resolved",
];

// ------------------------------------------------------------
// RESOLUTION OUTCOME
// ------------------------------------------------------------
// Inferred from the real payment outcome once resolved — a "refund"
// resolution cancels the order and refunds the customer's wallet; a
// "dismiss" resolution leaves the order and its payment untouched.

export const DISPUTE_RESOLUTION_LABELS: Record<ManagedDisputeResolutionOutcome, string> = {
  refunded: "Refunded",
  dismissed: "Dismissed",
};

export function disputeResolutionLabel(
  outcome: ManagedDisputeResolutionOutcome
): string {
  return DISPUTE_RESOLUTION_LABELS[outcome] ?? outcome;
}

export function disputeResolutionVariant(
  outcome: ManagedDisputeResolutionOutcome
): BadgeVariant {
  return outcome === "refunded" ? "info" : "neutral";
}
