"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollText } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import { AuditLogsTable } from "@/components/admin/audit-logs/AuditLogsTable";
import { AuditLogMetrics } from "@/components/admin/audit-logs/AuditLogMetrics";
import {
  AuditLogFilters,
  DEFAULT_AUDIT_FILTERS,
  auditQueryFromFilter,
  hasAuditFilters,
  type AuditFilterState,
} from "@/components/admin/audit-logs/AuditLogFilters";
import {
  useAdminAuditActors,
  useAdminAuditEvents,
  useAdminAuditMetrics,
} from "@/hooks/admin/use-admin-audit-trail";
import { useDebounce } from "@/hooks/use-debounce";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import type { ManagedAuditLogEntry } from "@/types/admin";

const PAGE_SIZE = 15;

const AUDIT_FILTER_KEYS = [
  "search",
  "action",
  "resourceType",
  "result",
  "severity",
  "actorId",
  "dateFrom",
  "dateTo",
] as const;

export default function AdminAuditLogsPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" rows={8} />}>
      <AuditLogsConsole />
    </Suspense>
  );
}

function readInitialFilters(params: URLSearchParams): AuditFilterState {
  const state: AuditFilterState = { ...DEFAULT_AUDIT_FILTERS };
  for (const key of AUDIT_FILTER_KEYS) {
    const value = params.get(key);
    if (value) (state as Record<typeof key, string>)[key] = value;
  }
  return state;
}

function AuditLogsConsole() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialFilters = useMemo(() => readInitialFilters(searchParams), [searchParams]);
  const [filters, setFilters] = useState<AuditFilterState>(initialFilters);
  const debouncedSearch = useDebounce(filters.search.trim(), 350);
  const [page, setPage] = useState(1);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filters.action, filters.resourceType, filters.result, filters.severity, filters.actorId, filters.dateFrom, filters.dateTo]);

  useEffect(() => {
    const params = new URLSearchParams();
    for (const key of AUDIT_FILTER_KEYS) {
      const value = filters[key];
      if (value && value !== "all") params.set(key, value);
    }
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "/admin/audit-logs", { scroll: false });
  }, [filters, router]);

  const query = useMemo(
    () => auditQueryFromFilter({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch]
  );

  const listQuery = useMemo(
    () => ({ ...query, page, pageSize: PAGE_SIZE, sortBy: "at" as const, sortDir: "desc" as const }),
    [query, page]
  );

  const events = useAdminAuditEvents(listQuery);
  const metrics = useAdminAuditMetrics();
  const actors = useAdminAuditActors();

  const hasActiveFilters = hasAuditFilters({ ...filters, search: debouncedSearch });

  function clearFilters() {
    setFilters({ ...DEFAULT_AUDIT_FILTERS });
    setPage(1);
  }

  function openEvent(event: ManagedAuditLogEntry) {
    router.push(`/admin/audit-logs/${event.id}`);
  }

  return (
    <>
      <AdminPageHeader
        title="Audit Logs"
        description="Immutable, backend-authoritative record of privileged admin actions. Refreshes from the audit store on each visit — no fabricated entries."
        actions={
          events.data && (
            <span className="inline-flex h-9 items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text-secondary">
              <ScrollText className="h-3.5 w-3.5 opacity-60" />
              {events.data.total.toLocaleString("en-NG")} events
            </span>
          )
        }
      />

      <div className="my-3 space-y-3">
        <AuditLogMetrics metrics={metrics.data} loading={metrics.isLoading} />
        <AuditLogFilters
          state={filters}
          actors={actors.data ?? []}
          actorsLoading={actors.isLoading}
          onChange={(next) => setFilters(next)}
          onReset={clearFilters}
        />
      </div>

      <AuditLogsTable
        items={events.data?.items ?? []}
        loading={events.isLoading}
        error={events.isError}
        hasActiveFilters={hasActiveFilters}
        onRetry={() => void events.refetch()}
        onClearFilters={clearFilters}
        onView={openEvent}
      />

      {events.data && events.data.totalPages > 1 && (
        <Pagination
          page={events.data.page}
          pageSize={events.data.pageSize}
          total={events.data.total}
          totalPages={events.data.totalPages}
          onPageChange={setPage}
          className="mt-3 rounded-lg border border-kampmax-border bg-white"
          unitLabel="events"
        />
      )}
    </>
  );
}