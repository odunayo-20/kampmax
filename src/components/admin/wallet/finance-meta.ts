import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  FinanceFundPool,
  ManagedFinanceTxnType,
  WalletTxnStatus,
  WithdrawalStatus,
} from "@/types/admin";

export const FINANCE_TYPE_LABELS: Record<ManagedFinanceTxnType, string> = {
  credit: "Credit",
  debit: "Debit",
  refund: "Refund",
  commission: "Commission",
  settlement: "Settlement",
  withdrawal: "Withdrawal",
  adjustment: "Adjustment",
};

export function financeTypeLabel(type: ManagedFinanceTxnType): string {
  return FINANCE_TYPE_LABELS[type] ?? type;
}

export const POOL_LABELS: Record<FinanceFundPool, string> = {
  platform: "Platform funds",
  vendor: "Vendor funds",
  customer: "Customer funds",
};

export function poolLabel(pool: FinanceFundPool): string {
  return POOL_LABELS[pool] ?? pool;
}

export function poolChipClass(pool: FinanceFundPool): string {
  switch (pool) {
    case "platform":
      return "bg-kampmax-blue/10 text-kampmax-blue";
    case "vendor":
      return "bg-amber-100 text-amber-700";
    case "customer":
      return "bg-sky-100 text-sky-700";
  }
}

export function txnStatusVariant(status: WalletTxnStatus): BadgeVariant {
  switch (status) {
    case "completed":
      return "success";
    case "pending":
      return "warning";
    case "failed":
      return "error";
    case "reversed":
      return "neutral";
  }
}

export const TXN_STATUS_LABELS: Record<WalletTxnStatus, string> = {
  completed: "Completed",
  pending: "Pending",
  failed: "Failed",
  reversed: "Reversed",
};

export function withdrawalStatusVariant(status: WithdrawalStatus): BadgeVariant {
  switch (status) {
    case "pending":
      return "warning";
    case "processing":
      return "info";
    case "approved":
      return "blue";
    case "completed":
      return "success";
    case "rejected":
    case "failed":
      return "error";
  }
}

export const WITHDRAWAL_STATUS_LABELS: Record<WithdrawalStatus, string> = {
  pending: "Pending",
  processing: "Processing",
  approved: "Approved",
  completed: "Completed",
  rejected: "Rejected",
  failed: "Failed",
};
