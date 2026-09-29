"use client";

import { StatusBadge } from "@/components/admin/StatusBadge";
import type { CustomerWithdrawalStatus } from "@/types/admin";
import { customerWithdrawalStatusLabel, customerWithdrawalStatusVariant } from "./withdrawals-meta";

/** Named distinctly from the legacy WithdrawalStatusBadge in FinanceBadges.tsx, which still backs the mock /admin/withdrawals data used elsewhere (the dashboard overview). */
export function CustomerWithdrawalStatusBadge({
  status,
  className,
}: {
  status: CustomerWithdrawalStatus;
  className?: string;
}) {
  return (
    <StatusBadge
      variant={customerWithdrawalStatusVariant(status)}
      label={customerWithdrawalStatusLabel(status)}
      className={className}
    />
  );
}
