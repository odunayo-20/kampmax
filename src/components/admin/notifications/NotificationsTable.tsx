"use client";

import { Eye } from "lucide-react";
import { Pagination } from "@/components/admin/Pagination";
import {
  StatusBadge,
  badgeVariantClasses,
} from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { cn, formatDateTime } from "@/lib/utils";
import {
  notificationTypeIcon,
  notificationTypeLabel,
  notificationTypeVariant,
  readStateLabel,
  readStateVariant,
  previewText,
} from "./notifications-meta";
import type {
  ManagedNotificationRow,
  Paginated,
} from "@/types/admin";

export interface NotificationsTableProps {
  data: Paginated<ManagedNotificationRow> | undefined;
  loading: boolean;
  error: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onView: (row: ManagedNotificationRow) => void;
  onPageChange: (page: number) => void;
}

export function NotificationsTable(props: NotificationsTableProps) {
  const {
    data,
    loading,
    error,
    hasActiveFilters,
    onRetry,
    onClearFilters,
    onView,
    onPageChange,
  } = props;

  if (loading) return <LoadingSkeleton variant="table" rows={6} />;
  if (error) return <ErrorState onRetry={onRetry} />;

  const items = data?.items ?? [];

  if (items.length === 0)
    return (
      <EmptyState
        title={hasActiveFilters ? "No notifications match" : "No notifications yet"}
        message={
          hasActiveFilters
            ? "Try different search terms or clear the filters."
            : "Dispatch your first in-app notification from the Create page."
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
      {/* Desktop / tablet */}
      <div className="hidden overflow-hidden rounded-lg border border-kampmax-border bg-white md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead>
              <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                <th scope="col" className="px-4 py-2.5 font-medium">Notification</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Type</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Recipient</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Status</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Created</th>
                <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kampmax-border">
              {items.map((r) => (
                <tr
                  key={r.id}
                  onClick={() => onView(r)}
                  className="cursor-pointer transition-colors hover:bg-kampmax-muted/40"
                >
                  <td className="max-w-[280px] px-4 py-2.5">
                    <p className="truncate font-medium text-kampmax-text" title={r.title}>
                      {r.title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary" title={r.body}>
                      {previewText(r.body, 64)}
                    </p>
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <TypeBadge type={r.type} />
                  </td>

                  <td className="whitespace-nowrap px-3 py-2.5">
                    <a
                      href={r.recipientHref}
                      onClick={(e) => e.stopPropagation()}
                      className="font-medium text-kampmax-text hover:underline"
                    >
                      {r.recipientName}
                    </a>
                    <span className="mt-0.5 block font-mono text-[11px] text-kampmax-text-secondary">
                      {r.recipientId}
                    </span>
                  </td>

                  <td className="hidden whitespace-nowrap px-3 py-2.5 lg:table-cell">
                    <StatusBadge
                      variant={readStateVariant(r.read)}
                      label={readStateLabel(r.read)}
                    />
                  </td>

                  <td
                    className="whitespace-nowrap px-3 py-2.5 text-xs tabular-nums text-kampmax-text-secondary"
                    title={r.createdAt}
                  >
                    {formatDateTime(r.createdAt)}
                  </td>

                  <td className="px-2 py-2.5" onClick={(e) => e.stopPropagation()}>
                    <span
                      role="button"
                      tabIndex={0}
                      title="View details"
                      onClick={() => onView(r)}
                      onKeyDown={(e) => e.key === "Enter" && onView(r)}
                      className="inline-flex cursor-pointer rounded-md p-1.5 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2.5 md:hidden">
        {items.map((r) => (
          <li
            key={r.id}
            onClick={() => onView(r)}
            className="cursor-pointer rounded-lg border border-kampmax-border bg-white p-3 transition-colors active:bg-kampmax-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 text-sm font-medium leading-snug text-kampmax-text">
                {r.title}
              </p>
              <StatusBadge
                variant={readStateVariant(r.read)}
                label={readStateLabel(r.read)}
              />
            </div>

            <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-kampmax-text-secondary">
              {previewText(r.body, 110)}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-kampmax-border pt-2 text-[11px] text-kampmax-text-secondary">
              <TypeBadge type={r.type} compact />
              <span>{r.recipientName}</span>
              <span className="ml-auto text-kampmax-text-secondary">
                {formatDateTime(r.createdAt)}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {data && data.totalPages > 1 && (
        <Pagination
          page={data.page}
          pageSize={data.pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={onPageChange}
          className="mt-3 rounded-lg border border-kampmax-border bg-white"
        />
      )}
    </>
  );
}

function TypeBadge({
  type,
  compact,
}: {
  type: ManagedNotificationRow["type"];
  compact?: boolean;
}) {
  const Icon = notificationTypeIcon(type);
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5",
        compact ? "truncate" : ""
      )}
    >
      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
          badgeVariantClasses(notificationTypeVariant(type))
        )}
      >
        <Icon className="h-3 w-3" aria-hidden />
        {notificationTypeLabel(type)}
      </span>
    </span>
  );
}
