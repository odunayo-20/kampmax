"use client";

import { CalendarDays, Fingerprint, Hash, Network, ShieldAlert, Tag, User } from "lucide-react";
import { StatusBadge, badgeVariantClasses } from "@/components/admin/StatusBadge";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { ScrollText } from "lucide-react";
import { cn, formatDateTime } from "@/lib/utils";
import {
  auditActionIcon,
  auditActionLabel,
  auditActionVariant,
  auditEventSummary,
  auditResourceLabel,
  auditResultLabel,
  auditResultVariant,
  auditSeverityLabel,
  auditSeverityVariant,
} from "./audit-logs-meta";
import type { ManagedAuditLogEntry } from "@/types/admin";

interface AuditLogDetailViewProps {
  event: ManagedAuditLogEntry | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

/** Full read-only detail for a single immutable audit event. */
export function AuditLogDetailView({ event, loading, error, onRetry }: AuditLogDetailViewProps) {
  if (loading) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white">
        <LoadingSkeleton variant="detail" rows={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-6">
        <ErrorState onRetry={onRetry} />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-lg border border-kampmax-border bg-white p-6 text-center">
        <ScrollText className="mx-auto mb-3 h-8 w-8 text-kampmax-text-secondary/40" aria-hidden />
        <h2 className="text-sm font-semibold text-kampmax-text">Audit event not found</h2>
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          This event does not exist on the real audit trail.
        </p>
      </div>
    );
  }

  const ActionIcon = auditActionIcon(event.action);

  return (
    <div className="overflow-hidden rounded-lg border border-kampmax-border bg-white">
      {/* Event header */}
      <div className="border-b border-kampmax-border p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
              badgeVariantClasses(auditActionVariant(event))
            )}
          >
            <ActionIcon className="h-3.5 w-3.5" aria-hidden />
            {auditActionLabel(event.action)}
          </span>
          <StatusBadge variant={auditResultVariant(event.result)} label={auditResultLabel(event.result)} dot />
          <StatusBadge variant={auditSeverityVariant(event.severity)} label={auditSeverityLabel(event.severity)} dot />
          {event.isSecurityEvent && <StatusBadge variant="error" label="Security event" dot />}
        </div>
        <p className="mt-3 text-sm text-kampmax-text" data-testid="audit-detail-summary">
          {auditEventSummary(event)}
        </p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          {auditResourceLabel(event.resource.type)} · {event.resource.id}
        </p>
      </div>

      <dl className="grid grid-cols-1 gap-5 p-4 sm:grid-cols-2 sm:p-5">
        <InfoRow icon={Hash} label="Event ID" value={event.id} mono />
        <InfoRow
          icon={CalendarDays}
          label="Timestamp"
          value={`${formatDateTime(event.at)} · ${new Date(event.at).toISOString()}`}
          mono
        />

        <InfoRow icon={User} label="Actor" value={event.actor.name} />
        <InfoRow icon={Fingerprint} label="Actor type" value={event.actor.type === "system" ? "Automated" : "Admin"} />

        <InfoRow icon={Tag} label="Resource" value={event.resource.id} mono />
        <InfoRow icon={ShieldAlert} label="Severity" value={auditSeverityLabel(event.severity)} />

        {event.ipAddress && <InfoRow icon={Network} label="IP address" value={event.ipAddress} mono />}
      </dl>

      {(event.previousValue || event.newValue || event.metadata) && (
        <div className="border-t border-kampmax-border p-4 sm:p-5">
          <h3 className="text-[11px] font-medium uppercase tracking-wide text-kampmax-text-secondary">
            Audit context
          </h3>
          <JsonRows label="Previous value" value={event.previousValue} />
          <JsonRows label="New value" value={event.newValue} />
          <JsonRows label="Metadata" value={event.metadata} />
        </div>
      )}
    </div>
  );
}

/** Renders an already-redacted JSON object as key/value rows — no sensitive keys reach here (AuditService strips password/token/secret/etc. before persisting). */
function JsonRows({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value || Object.keys(value).length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[11px] font-medium text-kampmax-text-secondary">{label}</p>
      <dl className="mt-1.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="rounded-md border border-kampmax-border bg-kampmax-muted/30 px-3 py-2">
            <dt className="text-[11px] font-medium text-kampmax-text-secondary">{k}</dt>
            <dd className="mt-0.5 break-words text-sm text-kampmax-text">
              {typeof v === "object" ? JSON.stringify(v) : String(v)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon?: typeof Tag;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="text-xs font-medium text-kampmax-text-secondary">
        <span className="inline-flex items-center gap-1">
          {Icon && <Icon className="h-3 w-3 opacity-60" aria-hidden />}
          {label}
        </span>
      </dt>
      <dd className={cn("mt-0.5 break-all text-sm text-kampmax-text", mono && "font-mono text-xs normal-case")}>
        {value}
      </dd>
    </div>
  );
}
