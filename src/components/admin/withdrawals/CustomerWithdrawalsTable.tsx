"use client";

import type { CustomerWithdrawalSortField, ManagedCustomerWithdrawal, SortDir } from "@/types/admin";
import { formatNaira } from "@/lib/utils";
import { CustomerWithdrawalStatusBadge } from "./WithdrawalBadges";
import { formatWithdrawalDate } from "./withdrawals-meta";

export function CustomerWithdrawalsTable({
  rows,
  sortBy,
  sortDir,
  onSort,
  onOpen,
  emptyHint,
}: {
  rows: ManagedCustomerWithdrawal[];
  sortBy: CustomerWithdrawalSortField;
  sortDir: SortDir;
  onSort: (field: CustomerWithdrawalSortField) => void;
  onOpen: (id: string) => void;
  emptyHint?: string;
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-kampmax-surface p-12 text-center text-sm text-kampmax-text-muted">
        {emptyHint ?? "No withdrawals match the current filters."}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-kampmax-border">
      <table className="min-w-full divide-y divide-kampmax-border text-sm">
        <thead className="bg-kampmax-surface-hover">
          <tr>
            <Th>Withdrawal</Th>
            <Th>Customer</Th>
            <Th>Bank</Th>
            <SortableTh field="amount" active={sortBy === "amount"} dir={sortDir} onClick={onSort}>
              Amount
            </SortableTh>
            <Th>Status</Th>
            <SortableTh field="createdAt" active={sortBy === "createdAt"} dir={sortDir} onClick={onSort}>
              Date
            </SortableTh>
            <Th className="text-right">Open</Th>
          </tr>
        </thead>
        <tbody className="divide-y divide-kampmax-border bg-kampmax-surface">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-kampmax-surface-hover/50">
              <td>
                <span className="font-mono text-xs font-semibold text-kampmax-text">{row.id}</span>
              </td>
              <td>
                <div className="flex flex-col">
                  <span className="font-medium text-kampmax-text">{row.customerName}</span>
                  {row.customerEmail && (
                    <span className="text-xs text-kampmax-text-muted">{row.customerEmail}</span>
                  )}
                </div>
              </td>
              <td>
                <div className="flex flex-col">
                  <span className="text-xs text-kampmax-text">{row.bankName ?? "—"}</span>
                  <span className="font-mono text-xs text-kampmax-text-muted">
                    {row.maskedAccountNumber ?? "not recorded"}
                  </span>
                </div>
              </td>
              <td className="whitespace-nowrap text-sm font-semibold tabular-nums text-kampmax-text">
                {formatNaira(row.amount)}
              </td>
              <td>
                <CustomerWithdrawalStatusBadge status={row.status} />
              </td>
              <td className="whitespace-nowrap text-xs text-kampmax-text-muted">
                {formatWithdrawalDate(row.createdAt)}
              </td>
              <td className="text-right">
                <button
                  onClick={() => onOpen(row.id)}
                  className="inline-flex items-center rounded-md bg-kampmax-primary/10 px-2.5 py-1 text-xs font-medium text-kampmax-primary hover:bg-kampmax-primary/20"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-kampmax-text-muted ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function SortableTh({
  field,
  active,
  dir,
  onClick,
  children,
  className,
}: {
  field: CustomerWithdrawalSortField;
  active: boolean;
  dir: SortDir;
  onClick: (field: CustomerWithdrawalSortField) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider ${
        active ? "text-kampmax-primary" : "text-kampmax-text-muted"
      } ${className ?? ""}`}
    >
      <button onClick={() => onClick(field)} className="inline-flex items-center gap-1 hover:text-kampmax-primary">
        {children}
        {active && <span className="text-[10px]">{dir === "asc" ? "▲" : "▼"}</span>}
      </button>
    </th>
  );
}
