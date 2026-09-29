"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import type { CustomerWithdrawalStatus } from "@/types/admin";
import { CUSTOMER_WITHDRAWAL_STATUS_TABS, customerWithdrawalStatusLabel } from "./withdrawals-meta";

export interface CustomerWithdrawalFilterState {
  search: string;
  status: CustomerWithdrawalStatus | "all";
}

export const DEFAULT_CUSTOMER_WITHDRAWAL_FILTERS: CustomerWithdrawalFilterState = {
  search: "",
  status: "all",
};

export function CustomerWithdrawalsFilters({
  filters,
  onChange,
  counts,
}: {
  filters: CustomerWithdrawalFilterState;
  onChange: (patch: Partial<CustomerWithdrawalFilterState>) => void;
  counts: Record<CustomerWithdrawalStatus, number>;
}) {
  const patch = useCallback((p: Partial<CustomerWithdrawalFilterState>) => onChange(p), [onChange]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {CUSTOMER_WITHDRAWAL_STATUS_TABS.map((status) => {
          const count = status === "all" ? Object.values(counts).reduce((a, b) => a + b, 0) : counts[status] ?? 0;
          return (
            <button
              key={status}
              onClick={() => patch({ status })}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                filters.status === status
                  ? "bg-kampmax-primary text-white"
                  : "bg-kampmax-surface-hover text-kampmax-text-muted hover:text-kampmax-text"
              }`}
            >
              {status === "all" ? "All" : customerWithdrawalStatusLabel(status)}
              <span className="ml-0.5 text-[10px] opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-muted" />
          <input
            type="text"
            placeholder="Search withdrawals, references, customers…"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            className="w-full rounded-lg border border-kampmax-border bg-kampmax-surface py-2 pl-9 pr-3 text-sm text-kampmax-text placeholder:text-kampmax-text-muted focus:border-kampmax-primary focus:outline-none focus:ring-1 focus:ring-kampmax-primary/50"
          />
          {filters.search && (
            <button
              onClick={() => patch({ search: "" })}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-kampmax-text-muted hover:text-kampmax-text"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <button
          onClick={() => patch(DEFAULT_CUSTOMER_WITHDRAWAL_FILTERS)}
          className="rounded-lg border border-kampmax-border px-3 py-2 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
