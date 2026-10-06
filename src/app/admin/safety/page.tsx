"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import {
  SafetyFilters,
  DEFAULT_SAFETY_FILTERS,
  type SafetyFilterState,
} from "@/components/admin/safety/SafetyFilters";
import { SafetyTable } from "@/components/admin/safety/SafetyTable";
import {
  SAFETY_SOURCE_LABELS,
  SAFETY_STATUS_LABELS,
  SAFETY_STATUS_TABS,
  SAFETY_TARGET_TYPE_LABELS,
  SAFETY_TARGET_TYPE_OPTIONS,
} from "@/components/admin/safety/safety-meta";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminSafetyCounts,
  useAdminSafetyFacets,
  useAdminSafetyReports,
} from "@/hooks/admin/use-admin-safety";
import type {
  SortDir,
  TrustSafetyReportStatus,
  TrustSafetySource,
  TrustSafetyTargetType,
} from "@/types/admin";
import type { TrustSafetySortField } from "@/services/admin";

function parseInitialFilters(params: URLSearchParams): SafetyFilterState {
  const rawStatus = params.get("status");
  const rawSource = params.get("source");
  const rawTarget = params.get("target");
  const rawReason = params.get("reason");
  const validStatus = SAFETY_STATUS_TABS as (TrustSafetyReportStatus | "all")[];
  const validSource = ["all", "review", "campus_post", "store", "service"] as (
    | TrustSafetySource
    | "all"
  )[];
  const validTarget = SAFETY_TARGET_TYPE_OPTIONS as (TrustSafetyTargetType | "all")[];
  return {
    search: params.get("q") ?? "",
    status:
      rawStatus && validStatus.includes(rawStatus as TrustSafetyReportStatus | "all")
        ? (rawStatus as TrustSafetyReportStatus | "all")
        : "all",
    source:
      rawSource && validSource.includes(rawSource as TrustSafetySource | "all")
        ? (rawSource as TrustSafetySource | "all")
        : "all",
    reason: rawReason ?? "all",
    targetType:
      rawTarget && validTarget.includes(rawTarget as TrustSafetyTargetType | "all")
        ? (rawTarget as TrustSafetyTargetType | "all")
        : "all",
  };
}

function parseInitialPage(params: URLSearchParams): number {
  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

export default function AdminSafetyPage() {
  return (
    <Suspense fallback={<SafetySkeleton />}>
      <AdminSafetyPageInner />
    </Suspense>
  );
}

function AdminSafetyPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<SafetyFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<TrustSafetySortField>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(() =>
    parseInitialPage(new URLSearchParams(searchParams.toString()))
  );
  const [pageSize, setPageSize] = useState(10);

  const debouncedSearch = useDebounce(filters.search.trim(), 350);
  const query = useMemo(
    () => ({
      search: debouncedSearch,
      status: filters.status === "all" ? undefined : filters.status,
      source: filters.source === "all" ? undefined : filters.source,
      reason: filters.reason === "all" ? undefined : filters.reason,
      targetType: filters.targetType === "all" ? undefined : filters.targetType,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [debouncedSearch, filters, sortBy, sortDir, page, pageSize]
  );

  // ----- data hooks (always called at top level) -----
  const { data, error, isLoading, refetch } = useAdminSafetyReports(query);
  const counts = useAdminSafetyCounts();
  const facets = useAdminSafetyFacets();

  // Non-sensitive filters persist to the URL so views are shareable and
  // survive reloads (never the raw search term per keystroke).
  const urlParams = searchParams.toString();
  useEffect(() => {
    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      const trimmed = filters.search.trim();
      if (trimmed) sp.set("q", trimmed);
      if (filters.status !== "all") sp.set("status", filters.status);
      if (filters.source !== "all") sp.set("source", filters.source);
      if (filters.reason !== "all") sp.set("reason", filters.reason);
      if (filters.targetType !== "all") sp.set("target", filters.targetType);
      if (page > 1) sp.set("page", String(page));
      const next = sp.toString();
      if (next !== urlParams) router.replace(`${pathname}?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [filters, page, urlParams, router, pathname]);

  const patchFilters = useCallback((patch: Partial<SafetyFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: TrustSafetySortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir("desc");
      }
      setPage(1);
    },
    [sortBy]
  );

  const onRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const countsData = counts.data ?? null;
  const facetsData = facets.data ?? null;
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.source !== "all" ||
    filters.reason !== "all" ||
    filters.targetType !== "all";

  const clearFilters = useCallback(() => {
    patchFilters(DEFAULT_SAFETY_FILTERS);
  }, [patchFilters]);

  return (
    <>
      <AdminPageHeader
        title="Trust & Safety"
        description="Reports submitted through the platform report flows — storefront reviews, profile reviews and campus posts. Read-only console over the real report stores; every moderation action deep-links into the existing admin consoles."
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
            <ShieldAlert className="h-3.5 w-3.5" />
            {countsData ? `${countsData.all} reports` : "…"}
          </span>
        }
      />

      {/* Pipeline summary */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-kampmax-border bg-white px-4 py-2.5 text-xs text-kampmax-text-secondary">
        {SAFETY_STATUS_TABS.filter((s) => s !== "all").map((s) => (
          <span key={s}>
            {SAFETY_STATUS_LABELS[s]}{" "}
            <strong className="font-semibold tabular-nums text-kampmax-text">
              {countsData?.byStatus[s] ?? "…"}
            </strong>
          </span>
        ))}
        <span className="text-kampmax-border">•</span>
        <span>
          Open{" "}
          <strong className="font-semibold tabular-nums text-kampmax-error">
            {countsData?.open ?? "…"}
          </strong>
        </span>
        <span className="text-kampmax-border">•</span>
        <span>
          {SAFETY_SOURCE_LABELS.review}{" "}
          <strong className="font-semibold tabular-nums">
            {countsData?.bySource.review ?? "…"}
          </strong>
        </span>
        <span>
          {SAFETY_SOURCE_LABELS.campus_post}{" "}
          <strong className="font-semibold tabular-nums">
            {countsData?.bySource.campus_post ?? "…"}
          </strong>
        </span>
        <span className="text-kampmax-border">•</span>
        <span
          title="Distinct targets with at least one real report"
          className="cursor-help"
        >
          Targets{" "}
          <strong className="font-semibold tabular-nums">
            {countsData?.uniqueTargets ?? "…"}
          </strong>
        </span>
        <span
          title="Distinct users who submitted at least one report"
          className="cursor-help"
        >
          Reporters{" "}
          <strong className="font-semibold tabular-nums">
            {countsData?.uniqueReporters ?? "…"}
          </strong>
        </span>
      </div>

      <div className="mb-4">
        <SafetyFilters
          filters={filters}
          counts={countsData}
          facets={facetsData}
          onChange={patchFilters}
        />
      </div>

      <SafetyTable
        page={data ?? null}
        loading={isLoading}
        error={!!error}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        onRetry={onRetry}
        hasActiveFilters={hasActiveFilters}
        onClearFilters={clearFilters}
      />

      {data && data.total > 0 && (
        <Pagination
          page={data.page}
          pageSize={pageSize}
          total={data.total}
          totalPages={data.totalPages}
          onPageChange={setPage}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          unitLabel="reports"
        />
      )}
    </>
  );
}

function SafetySkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded bg-kampmax-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      <div className="h-80 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
    </div>
  );
}