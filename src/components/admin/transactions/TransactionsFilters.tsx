"use client";

import { useCallback } from "react";
import { Search, X } from "lucide-react";
import type {
  ManagedTransactionFacets,
  ManagedTransactionMethod,
  ManagedTransactionStatus,
  ManagedTransactionType,
} from "@/types/admin";
import {
  TRANSACTION_METHOD_OPTIONS,
  TRANSACTION_STATUS_TABS,
  TRANSACTION_TYPE_OPTIONS,
  transactionMethodLabel,
  transactionStatusLabel,
  transactionTypeLabel,
} from "./transactions-meta";

export interface TransactionFilterState {
  search: string;
  status: ManagedTransactionStatus | "all";
  type: ManagedTransactionType | "all";
  method: ManagedTransactionMethod | "all";
  /** `YYYY-MM-DD` or empty. */
  dateFrom: string;
  dateTo: string;
}

export const DEFAULT_TRANSACTION_FILTERS: TransactionFilterState = {
  search: "",
  status: "all",
  type: "all",
  method: "all",
  dateFrom: "",
  dateTo: "",
};

/**
 * Filter bar for the transactions console. Options for type/method are
 * driven by `facets` (derived from the real ledger) so the console never
 * offers a filter that has no matching record. Status tabs show live
 * counts from the ledger.
 */
export function TransactionsFilters({
  filters,
  onChange,
  counts,
  facets,
}: {
  filters: TransactionFilterState;
  onChange: (patch: Partial<TransactionFilterState>) => void;
  counts: Record<ManagedTransactionStatus, number>;
  facets?: ManagedTransactionFacets | null;
}) {
  const patch = useCallback(
    (p: Partial<TransactionFilterState>) => onChange(p),
    [onChange]
  );

  const typeOptions = facets
    ? (["all", ...facets.types.map((t) => t.id)] as (ManagedTransactionType | "all")[])
    : TRANSACTION_TYPE_OPTIONS;

  const methodOptions = facets
    ? (["all", ...facets.methods.map((m) => m.id)] as (ManagedTransactionMethod | "all")[])
    : TRANSACTION_METHOD_OPTIONS;

  return (
    <div className="space-y-4">
      {/* Status tabs */}
      <div className="flex flex-wrap gap-2">
        {TRANSACTION_STATUS_TABS.map((status) => {
          const count =
            status === "all"
              ? Object.values(counts).reduce((a, b) => a + b, 0)
              : counts[status] ?? 0;
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
              {status === "all" ? "All" : transactionStatusLabel(status)}
              <span className="ml-0.5 text-[10px] opacity-80">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-muted" />
          <input
            type="text"
            placeholder="Search transactions, references, customers, vendors…"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            className="w-full rounded-lg border border-kampmax-border bg-kampmax-surface pl-9 pr-3 py-2 text-sm text-kampmax-text placeholder:text-kampmax-text-muted focus:border-kampmax-primary focus:outline-none focus:ring-1 focus:ring-kampmax-primary/50"
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

        <Select
          value={filters.type}
          onChange={(v) => patch({ type: v as TransactionFilterState["type"] })}
          options={typeOptions.map((v) => ({
            value: v,
            label: v === "all" ? "All types" : transactionTypeLabel(v),
          }))}
        />

        <Select
          value={filters.method}
          onChange={(v) => patch({ method: v as TransactionFilterState["method"] })}
          options={methodOptions.map((v) => ({
            value: v,
            label: v === "all" ? "All methods" : transactionMethodLabel(v),
          }))}
        />

        <label className="flex items-center gap-1.5 text-xs text-kampmax-text-muted">
          From
          <input
            type="date"
            value={filters.dateFrom}
            max={filters.dateTo || undefined}
            onChange={(e) => patch({ dateFrom: e.target.value })}
            className="rounded-lg border border-kampmax-border bg-kampmax-surface px-2 py-1.5 text-xs text-kampmax-text focus:border-kampmax-primary focus:outline-none focus:ring-1 focus:ring-kampmax-primary/50"
          />
        </label>
        <label className="flex items-center gap-1.5 text-xs text-kampmax-text-muted">
          To
          <input
            type="date"
            value={filters.dateTo}
            min={filters.dateFrom || undefined}
            onChange={(e) => patch({ dateTo: e.target.value })}
            className="rounded-lg border border-kampmax-border bg-kampmax-surface px-2 py-1.5 text-xs text-kampmax-text focus:border-kampmax-primary focus:outline-none focus:ring-1 focus:ring-kampmax-primary/50"
          />
        </label>

        <button
          onClick={() => patch(DEFAULT_TRANSACTION_FILTERS)}
          className="rounded-lg border border-kampmax-border px-3 py-2 text-xs font-medium text-kampmax-text-muted hover:text-kampmax-text"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-kampmax-border bg-kampmax-surface px-3 py-2 text-xs text-kampmax-text focus:border-kampmax-primary focus:outline-none focus:ring-1 focus:ring-kampmax-primary/50"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}