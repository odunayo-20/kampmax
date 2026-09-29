"use client";

import { Eye } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { communityCampusName, previewText } from "@/components/admin/campus-community/campus-community-utils";
import { cn, formatDateShort, formatNaira, timeAgo } from "@/lib/utils";
import {
  disputeResolutionLabel,
  disputeResolutionVariant,
  disputeStatusLabel,
  disputeStatusVariant,
} from "./disputes-meta";
import type { ManagedDispute } from "@/types/admin";

export interface DisputesTableProps {
  items: ManagedDispute[];
  loading: boolean;
  error: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onView: (d: ManagedDispute) => void;
}

export function DisputesTable(props: DisputesTableProps) {
  const {
    items,
    loading,
    error,
    hasActiveFilters,
    onRetry,
    onClearFilters,
    onView,
  } = props;

  if (loading) return <LoadingSkeleton variant="table" rows={6} />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (items.length === 0)
    return (
      <EmptyState
        title={hasActiveFilters ? "No disputes match" : "No disputes yet"}
        message={
          hasActiveFilters
            ? "Try different search terms or clear the filters."
            : "Orders with an open or resolved dispute will show up here."
        }
        action={
          hasActiveFilters ? (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-8 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text hover:bg-kampmax-muted/60"
            >
              Clear filters
            </button>
          ) : undefined
        }
      />
    );

  return (
    <>
      {/* Desktop / tablet: full table */}
      <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed text-left text-sm">
            <colgroup>
              <col className="w-32" />
              <col />
              <col className="hidden w-36 xl:table-column" />
              <col className="hidden w-24 lg:table-column" />
              <col className="w-28" />
              <col className="w-28" />
              <col className="hidden w-32 xl:table-column" />
              <col className="w-28" />
            </colgroup>
            <thead>
              <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                <th scope="col" className="px-4 py-2.5 font-medium">Order</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Reason</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Vendor</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Campus</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Amount</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Status</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Opened</th>
                <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kampmax-border">
              {items.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => onView(d)}
                  className="cursor-pointer transition-colors hover:bg-kampmax-muted/40"
                >
                  <td className="px-4 py-2.5">
                    <span className="font-mono text-[11px] font-semibold uppercase text-kampmax-blue">
                      {d.id}
                    </span>
                    <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary" title={d.customerName}>
                      {d.customerName}
                    </p>
                  </td>

                  <td className="max-w-[260px] truncate px-3 py-2.5 text-kampmax-text" title={d.reason}>
                    {previewText(d.reason, 60)}
                  </td>

                  <td className="hidden max-w-[150px] truncate whitespace-nowrap px-3 py-2.5 text-kampmax-text-secondary xl:table-cell" title={d.vendorName}>
                    {d.vendorName}
                  </td>

                  <td className="hidden whitespace-nowrap px-3 py-2.5 text-kampmax-text-secondary lg:table-cell">
                    {communityCampusName(d.campusId)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5 font-medium tabular-nums text-kampmax-text">
                    {formatNaira(d.amount)}
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <div className="flex flex-col gap-1">
                      <StatusBadge
                        variant={disputeStatusVariant(d.status)}
                        label={disputeStatusLabel(d.status)}
                      />
                      {d.resolutionOutcome && (
                        <StatusBadge
                          variant={disputeResolutionVariant(d.resolutionOutcome)}
                          label={disputeResolutionLabel(d.resolutionOutcome)}
                        />
                      )}
                    </div>
                  </td>

                  <td
                    className="hidden whitespace-nowrap px-3 py-2.5 tabular-nums text-kampmax-text-secondary xl:table-cell"
                    title={new Date(d.openedAt).toISOString()}
                  >
                    {formatDateShort(d.openedAt)}
                    <span className="ml-1.5 hidden text-[11px] 2xl:inline">
                      {timeAgo(d.openedAt)}
                    </span>
                  </td>

                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <ViewButton onView={() => onView(d)} disputeId={d.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile: stacked cards */}
      <ul className="space-y-2.5 md:hidden">
        {items.map((d) => (
          <li
            key={d.id}
            onClick={() => onView(d)}
            className="cursor-pointer rounded-lg border border-kampmax-border bg-white p-3 transition-colors active:bg-kampmax-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="font-mono text-[11px] font-semibold uppercase text-kampmax-blue">
                  {d.id}
                </span>
                <p className="mt-0.5 truncate text-[13px] font-medium text-kampmax-text">
                  {previewText(d.reason, 48)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <StatusBadge
                  variant={disputeStatusVariant(d.status)}
                  label={disputeStatusLabel(d.status)}
                />
                {d.resolutionOutcome && (
                  <StatusBadge
                    variant={disputeResolutionVariant(d.resolutionOutcome)}
                    label={disputeResolutionLabel(d.resolutionOutcome)}
                  />
                )}
              </div>
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-dashed border-kampmax-border pt-2 text-xs">
              <MetaCell label="Amount">{formatNaira(d.amount)}</MetaCell>
              <MetaCell label="Customer">
                <span className="truncate">{d.customerName}</span>
              </MetaCell>
              <MetaCell label="Vendor">
                <span className="truncate">{d.vendorName}</span>
              </MetaCell>
              <MetaCell label="Campus">
                {communityCampusName(d.campusId)}
              </MetaCell>
              <MetaCell label="Opened">
                {formatDateShort(d.openedAt)} · {timeAgo(d.openedAt)}
              </MetaCell>
            </dl>

            <div
              className="mt-2 flex items-center justify-end border-t border-dashed border-kampmax-border pt-2"
              onClick={(e) => e.stopPropagation()}
            >
              <ViewButton onView={() => onView(d)} disputeId={d.id} />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function ViewButton({
  onView,
  disputeId,
}: {
  onView: () => void;
  disputeId: string;
}) {
  return (
    <button
      type="button"
      aria-label={`Open order ${disputeId}`}
      onClick={(e) => {
        e.stopPropagation();
        onView();
      }}
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-md border border-kampmax-border bg-white px-2 text-[11px] font-medium",
        "text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
      )}
    >
      <Eye className="h-3 w-3" aria-hidden />
      Open order
    </button>
  );
}

function MetaCell({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
        {label}
      </dt>
      <dd className="truncate text-kampmax-text">{children}</dd>
    </div>
  );
}
