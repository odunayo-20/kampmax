import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type { CustomerWithdrawalSortField, CustomerWithdrawalStatus } from "@/types/admin";

export const CUSTOMER_WITHDRAWAL_STATUS_TABS: (CustomerWithdrawalStatus | "all")[] = [
  "all",
  "pending",
  "successful",
  "failed",
  "reversed",
];

export const CUSTOMER_WITHDRAWAL_STATUS_LABELS: Record<CustomerWithdrawalStatus, string> = {
  successful: "Successful",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export function customerWithdrawalStatusLabel(status: CustomerWithdrawalStatus): string {
  return CUSTOMER_WITHDRAWAL_STATUS_LABELS[status] ?? status;
}

export function customerWithdrawalStatusVariant(status: CustomerWithdrawalStatus): BadgeVariant {
  switch (status) {
    case "successful":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "reversed":
      return "gold";
  }
}

export const CUSTOMER_WITHDRAWAL_SORT_OPTIONS: { value: CustomerWithdrawalSortField; label: string }[] = [
  { value: "createdAt", label: "Date" },
  { value: "amount", label: "Amount" },
];

export function formatWithdrawalDate(iso: string | null): string {
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
