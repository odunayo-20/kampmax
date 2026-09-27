import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedTransactionMethod,
  ManagedTransactionSortField,
  ManagedTransactionStatus,
  ManagedTransactionType,
} from "@/types/admin";

// ------------------------------------------------------------
// STATUS TABS
// ------------------------------------------------------------

export const TRANSACTION_STATUS_TABS: (ManagedTransactionStatus | "all")[] = [
  "all",
  "successful",
  "pending",
  "processing",
  "failed",
  "refunded",
  "cancelled",
];

export const TRANSACTION_STATUS_LABELS: Record<ManagedTransactionStatus, string> = {
  successful: "Successful",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
  refunded: "Refunded",
  cancelled: "Cancelled",
};

export function transactionStatusLabel(status: ManagedTransactionStatus): string {
  return TRANSACTION_STATUS_LABELS[status] ?? status;
}

export function transactionStatusVariant(status: ManagedTransactionStatus): BadgeVariant {
  switch (status) {
    case "successful":
      return "success";
    case "pending":
      return "warning";
    case "processing":
      return "info";
    case "failed":
      return "error";
    case "refunded":
      return "gold";
    case "cancelled":
      return "neutral";
  }
}

export const STATUS_CARD_META: Record<
  ManagedTransactionStatus,
  { label: string; hint: string }
> = {
  successful: { label: "Successful", hint: "Real store status: paid / completed" },
  pending: { label: "Pending", hint: "Real store status: pending" },
  processing: { label: "Processing", hint: "Wallet store only" },
  failed: { label: "Failed", hint: "No failed record in the seed data" },
  refunded: { label: "Refunded", hint: "Real store status: refunded" },
  cancelled: { label: "Cancelled", hint: "Wallet store only" },
};

// ------------------------------------------------------------
// TYPE
// ------------------------------------------------------------

export const TRANSACTION_TYPE_OPTIONS: (ManagedTransactionType | "all")[] = [
  "all",
  "order_payment",
  "wallet_funding",
  "refund",
];

export const TRANSACTION_TYPE_LABELS: Record<ManagedTransactionType, string> = {
  order_payment: "Order payment",
  wallet_funding: "Wallet funding",
  refund: "Refund",
};

export function transactionTypeLabel(type: ManagedTransactionType): string {
  return TRANSACTION_TYPE_LABELS[type] ?? type;
}

export function transactionTypeVariant(type: ManagedTransactionType): BadgeVariant {
  switch (type) {
    case "order_payment":
      return "blue";
    case "wallet_funding":
      return "info";
    case "refund":
      return "gold";
  }
}

// ------------------------------------------------------------
// METHOD
// ------------------------------------------------------------

export const TRANSACTION_METHOD_OPTIONS: (ManagedTransactionMethod | "all")[] = [
  "all",
  "paystack",
  "flutterwave",
  "wallet",
  "cod",
  "bank_transfer",
];

export const TRANSACTION_METHOD_LABELS: Record<ManagedTransactionMethod, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  wallet: "Wallet",
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
};

export function transactionMethodLabel(method: ManagedTransactionMethod): string {
  return TRANSACTION_METHOD_LABELS[method] ?? method;
}

// ------------------------------------------------------------
// SORT
// ------------------------------------------------------------

export const TRANSACTION_SORT_OPTIONS: {
  value: ManagedTransactionSortField;
  label: string;
}[] = [
  { value: "createdAt", label: "Date" },
  { value: "amount", label: "Amount" },
];

// ------------------------------------------------------------
// DATE FORMATTER
// ------------------------------------------------------------

export function formatTransactionDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}