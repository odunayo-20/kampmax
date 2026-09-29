"use client";

import { ScrollText, ShieldAlert } from "lucide-react";
import { StatusBadge, badgeVariantClasses } from "@/components/admin/StatusBadge";
import { EmptyState } from "@/components/admin/EmptyState";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { cn, formatDateTime, timeAgo } from "@/lib/utils";
import {
  auditActionIcon,
  auditActionLabel,
  auditActionVariant,
  auditEventSummary,
  auditResourceIcon,
  auditResourceLabel,
  auditResultLabel,
  auditResultVariant,
  auditSeverityLabel,
} from "./audit-logs-meta";
import type { ManagedAuditLogEntry } from "@/types/admin";

export interface AuditLogsTableProps {
  items: ManagedAuditLogEntry[];
  loading: boolean;
  error: boolean;
  hasActiveFilters: boolean;
  onRetry: () => void;
  onClearFilters: () => void;
  onView: (event: ManagedAuditLogEntry) => void;
}

export function AuditLogsTable(props: AuditLogsTableProps) {
  const { items, loading, error, hasActiveFilters, onRetry, onClearFilters, onView } = props;

  if (loading) return <LoadingSkeleton variant="table" rows={8} />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (items.length === 0)
    return (
      <EmptyState
        icon={ScrollText}
        title={hasActiveFilters ? "No audit events match" : "No audit events yet"}
        message={
          hasActiveFilters
            ? "Try different search terms or clear the filters."
            : "Privileged admin actions will be recorded here as they happen."
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
          <table className="w-full min-w-[1020px] text-left text-sm">
            <thead>
              <tr className="border-b border-kampmax-border bg-kampmax-muted/40 text-[11px] uppercase tracking-wide text-kampmax-text-secondary">
                <th scope="col" className="px-4 py-2.5 font-medium">Timestamp</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Actor</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Action</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium lg:table-cell">Resource</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Summary</th>
                <th scope="col" className="hidden px-3 py-2.5 font-medium xl:table-cell">Severity</th>
                <th scope="col" className="px-3 py-2.5 font-medium">Result</th>
                <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Details</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-kampmax-border">
              {items.map((e) => (
                <AuditRow key={e.id} event={e} onView={onView} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-2.5 md:hidden">
        {items.map((e) => (
          <MobileCard key={e.id} event={e} onView={onView} />
        ))}
      </ul>
    </>
  );
}

function actorInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function AuditRow({ event, onView }: { event: ManagedAuditLogEntry; onView: (e: ManagedAuditLogEntry) => void }) {
  const ActionIcon = auditActionIcon(event.action);
  const ResourceIcon = auditResourceIcon(event.resource.type);
  return (
    <tr
      onClick={() => onView(event)}
      className="cursor-pointer transition-colors hover:bg-kampmax-muted/40"
    >
      <td
        className="whitespace-nowrap px-4 py-2.5 tabular-nums text-xs text-kampmax-text-secondary"
        title={formatDateTime(event.at)}
      >
        <span className="block font-medium text-kampmax-text">{formatDateTime(event.at)}</span>
        <span className="text-[11px]">{timeAgo(event.at)}</span>
      </td>

      <td className="max-w-[150px] whitespace-nowrap px-3 py-2.5">
        <span className="flex items-center gap-2">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-kampmax-blue/10 text-[10px] font-semibold text-kampmax-blue">
            {actorInitials(event.actor.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-[13px] font-medium text-kampmax-text" title={event.actor.name}>
              {event.actor.name}
            </span>
            <span className="block text-[10px] uppercase tracking-wide text-kampmax-text-secondary">
              {event.actor.type === "system" ? "Automated" : "Admin"}
            </span>
          </span>
        </span>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5">
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
            badgeVariantClasses(auditActionVariant(event))
          )}
        >
          <ActionIcon className="h-3 w-3" aria-hidden />
          {auditActionLabel(event.action)}
        </span>
      </td>

      <td className="hidden max-w-[160px] whitespace-nowrap px-3 py-2.5 lg:table-cell">
        <span className="inline-flex items-center gap-1.5 text-xs text-kampmax-text">
          <ResourceIcon className="h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary" aria-hidden />
          {auditResourceLabel(event.resource.type)}
        </span>
        <span className="mt-0.5 block truncate font-mono text-[10px] uppercase text-kampmax-text-secondary/70" title={event.resource.id}>
          {event.resource.id}
        </span>
      </td>

      <td className="max-w-[320px] px-3 py-2.5">
        <p className="line-clamp-2 text-[13px] leading-snug text-kampmax-text" title={auditEventSummary(event)}>
          {auditEventSummary(event)}
        </p>
      </td>

      <td className="hidden whitespace-nowrap px-3 py-2.5 xl:table-cell">
        <span className="inline-flex items-center gap-1 text-xs text-kampmax-text-secondary">
          {event.isSecurityEvent && <ShieldAlert className="h-3.5 w-3.5 text-kampmax-error" aria-hidden />}
          {auditSeverityLabel(event.severity)}
        </span>
      </td>

      <td className="whitespace-nowrap px-3 py-2.5">
        <StatusBadge variant={auditResultVariant(event.result)} label={auditResultLabel(event.result)} dot />
      </td>

      <td className="px-2 py-2.5">
        <button
          type="button"
          aria-label={`Open details for event ${event.id}`}
          onClick={(e) => {
            e.stopPropagation();
            onView(event);
          }}
          className="rounded-md p-1.5 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
        >
          <ScrollText className="h-4 w-4" aria-hidden />
        </button>
      </td>
    </tr>
  );
}

function MobileCard({ event: e, onView }: { event: ManagedAuditLogEntry; onView: (e: ManagedAuditLogEntry) => void }) {
  const ActionIcon = auditActionIcon(e.action);
  const ResourceIcon = auditResourceIcon(e.resource.type);
  return (
    <li
      onClick={() => onView(e)}
      className="cursor-pointer rounded-lg border border-kampmax-border bg-white p-3 transition-colors active:bg-kampmax-muted/50"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-kampmax-text-secondary">
          <ActionIcon className="h-3.5 w-3.5" aria-hidden />
          {auditActionLabel(e.action)}
          <ResourceIcon className="ml-1 h-3 w-3" aria-hidden />
          {auditResourceLabel(e.resource.type)}
        </span>
        <StatusBadge variant={auditResultVariant(e.result)} label={auditResultLabel(e.result)} dot />
      </div>

      <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-kampmax-text">{auditEventSummary(e)}</p>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-dashed border-kampmax-border pt-2 text-[11px] text-kampmax-text-secondary">
        <span className="min-w-0 truncate">
          {e.actor.name}
          <span className="ml-1.5 font-mono uppercase">{e.resource.id}</span>
        </span>
        <span className="tabular-nums" title={formatDateTime(e.at)}>
          {timeAgo(e.at)}
        </span>
      </div>
    </li>
  );
}
