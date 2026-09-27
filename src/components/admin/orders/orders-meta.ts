import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedOrderPaymentStatus,
  ManagedOrderStatus,
} from "@/types/admin";

export const ORDER_STATUS_LABELS: Record<ManagedOrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready_for_pickup: "Ready for pickup",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export function orderStatusLabel(status: ManagedOrderStatus): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function managedOrderStatusVariant(status: ManagedOrderStatus): BadgeVariant {
  switch (status) {
    case "pending":
      return "warning";
    case "confirmed":
    case "preparing":
      return "info";
    case "ready_for_pickup":
    case "out_for_delivery":
      return "blue";
    case "delivered":
      return "success";
    case "cancelled":
      return "neutral";
    case "disputed":
      return "error";
  }
}

export const PAYMENT_STATUS_LABELS: Record<ManagedOrderPaymentStatus, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

export function paymentStatusLabel(status: ManagedOrderPaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function managedPaymentStatusVariant(status: ManagedOrderPaymentStatus): BadgeVariant {
  switch (status) {
    case "pending":
      return "warning";
    case "paid":
      return "success";
    case "failed":
      return "error";
    case "refunded":
    case "partially_refunded":
      return "info";
  }
}

export const FULFILLMENT_LABELS = {
  campus_pickup: "Campus pickup",
  meetup: "Meetup",
  delivery: "Delivery",
} as const;

export function fulfillmentLabel(method: keyof typeof FULFILLMENT_LABELS): string {
  return FULFILLMENT_LABELS[method];
}

export function paymentMethodLabel(method: string): string {
  switch (method) {
    case "paystack":
      return "Paystack";
    case "flutterwave":
      return "Flutterwave";
    case "wallet":
      return "Kampmax Wallet";
    case "bank_transfer":
      return "Bank transfer";
    case "cod":
      return "Cash on delivery";
    default:
      return method;
  }
}
