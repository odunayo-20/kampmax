import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type { VendorFulfillmentStatus, VendorPaymentStatus } from "@/types/vendor-orders";
import { VENDOR_ESCROW_STATE, VENDOR_DISPUTE_STATUS } from "@/types/vendor-orders";
import type { VendorEscrowState, VendorDisputeStatus } from "@/types/vendor-orders";

export const FULFILLMENT_LABELS: Record<VendorFulfillmentStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  processing: "Processing",
  ready_for_pickup: "Ready for pickup",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function fulfillmentStatusLabel(status: VendorFulfillmentStatus): string {
  return FULFILLMENT_LABELS[status] ?? status.replace(/_/g, " ");
}

export function fulfillmentStatusVariant(status: VendorFulfillmentStatus): BadgeVariant {
  switch (status) {
    case "pending":
      return "warning";
    case "accepted":
    case "processing":
      return "info";
    case "ready_for_pickup":
      return "gold";
    case "shipped":
    case "out_for_delivery":
      return "blue";
    case "delivered":
      return "success";
    case "completed":
      return "neutral";
    case "cancelled":
      return "error";
  }
}

export const PAYMENT_LABELS: Record<VendorPaymentStatus, string> = {
  pending: "Payment pending",
  processing: "Payment processing",
  paid: "Paid",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  failed: "Payment failed",
};

export function paymentStatusLabel(status: VendorPaymentStatus): string {
  return PAYMENT_LABELS[status] ?? status.replace(/_/g, " ");
}

export function paymentStatusVariant(status: VendorPaymentStatus): BadgeVariant {
  switch (status) {
    case "pending":
    case "processing":
      return "warning";
    case "paid":
      return "success";
    case "refund_pending":
      return "info";
    case "refunded":
      return "neutral";
    case "failed":
      return "error";
  }
}

export const DELIVERY_METHOD_LABELS = {
  campus_pickup: "Campus pickup",
  delivery: "Delivery",
} as const;

export function deliveryMethodLabel(method: keyof typeof DELIVERY_METHOD_LABELS): string {
  return DELIVERY_METHOD_LABELS[method];
}

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  paystack: "Paystack",
  wallet: "Kampmax Wallet",
  bank_transfer: "Bank transfer",
  cod: "Cash on delivery",
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

export const ESCROW_LABELS: Record<VendorEscrowState, { label: string; variant: BadgeVariant }> = {
  none: { label: "No escrow", variant: "neutral" },
  funds_held: { label: "Funds held", variant: "info" },
  awaiting_fulfillment: { label: "Escrow awaiting fulfillment", variant: "info" },
  release_eligible: { label: "Ready to release", variant: "success" },
  released: { label: "Released", variant: "success" },
  refunded: { label: "Refunded", variant: "warning" },
};

export function escrowInfo(state: VendorEscrowState): { label: string; variant: BadgeVariant } {
  return ESCROW_LABELS[state] ?? { label: state, variant: "neutral" };
}

export const DISPUTE_LABELS: Record<VendorDisputeStatus, string> = {
  none: "No dispute",
  opened: "Dispute opened",
  under_review: "Under review",
  requirements_sent: "More info requested",
  resolved: "Resolved",
  closed: "Closed",
};

export function disputeStatusLabel(status: VendorDisputeStatus): string {
  return DISPUTE_LABELS[status] ?? status.replace(/_/g, " ");
}

export const ISSUE_TYPE_LABELS: Record<string, string> = {
  delay: "Delay",
  stock_shortage: "Stock shortage",
  delivery_exception: "Delivery exception",
  damaged_item: "Damaged item",
  wrong_item: "Wrong item",
  dispute_opened: "Dispute opened",
  payment_issue: "Payment issue",
  other: "Other",
};

export function issueTypeLabel(type: string): string {
  return ISSUE_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

export { VENDOR_ESCROW_STATE, VENDOR_DISPUTE_STATUS };