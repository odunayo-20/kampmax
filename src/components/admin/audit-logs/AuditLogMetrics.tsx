"use client";

import { CalendarDays, ScrollText, ShieldAlert, ShieldX, XCircle } from "lucide-react";
import { StatCard } from "@/components/admin/StatCard";
import { Skeleton } from "@/components/admin/LoadingSkeleton";
import type { ManagedAuditLogMetrics } from "@/types/admin";

interface AuditLogMetricsProps {
  metrics?: ManagedAuditLogMetrics;
  loading: boolean;
}

/** Backend-authoritative headline metrics for the audit trail. */
export function AuditLogMetrics({ metrics, loading }: AuditLogMetricsProps) {
  if (loading || !metrics) {
    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-kampmax-border bg-white p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-3 h-7 w-16" />
            <Skeleton className="mt-2 h-3 w-20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Total events"
        value={metrics.total.toLocaleString("en-NG")}
        icon={ScrollText}
        hint="audited privileged actions"
      />
      <StatCard
        label="Today"
        value={metrics.today.toLocaleString("en-NG")}
        icon={CalendarDays}
        hint="recorded today"
      />
      <StatCard
        label="High severity"
        value={metrics.highSeverity.toLocaleString("en-NG")}
        icon={ShieldAlert}
        tone="error"
        hint="high / critical events"
      />
      <StatCard
        label="Security events"
        value={metrics.securityEvents.toLocaleString("en-NG")}
        icon={ShieldX}
        tone="warning"
        hint="suspensions & state resets"
      />
      <StatCard
        label="Failed / denied"
        value={`${metrics.failed} / ${metrics.denied}`}
        icon={XCircle}
        tone="default"
        hint="non-success outcomes"
      />
    </div>
  );
}