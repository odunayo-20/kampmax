"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ClipboardList, Flag } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { Pagination } from "@/components/admin/Pagination";
import {
  JobFilters,
  DEFAULT_JOB_FILTERS,
  type JobFilterState,
} from "@/components/admin/jobs/JobFilters";
import { JobsTable } from "@/components/admin/jobs/JobsTable";
import {
  ARRANGEMENT_OPTIONS,
  JOB_PUBLICATION_OPTIONS,
  JOB_STATUS_TABS,
} from "@/components/admin/jobs/jobs-meta";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAdminJobs,
  useAdminJobCounts,
  useAdminJobFacets,
} from "@/hooks/admin/use-admin-jobs";
import type {
  ManagedJobPublication,
  ManagedJobStatus,
  SortDir,
} from "@/types/admin";
import type { OpportunityType, OpportunityWorkArrangement } from "@/types/opportunity";
import { OPPORTUNITY_TYPE_ORDER } from "@/config/opportunity";
import type { ManagedJobSortField } from "@/services/admin";

function parseInitialFilters(params: URLSearchParams): JobFilterState {
  const rawStatus = params.get("status");
  const validStatus = JOB_STATUS_TABS as (ManagedJobStatus | "all")[];
  const rawPublication = params.get("publication");
  const validPublication = JOB_PUBLICATION_OPTIONS as (ManagedJobPublication | "all")[];
  const rawType = params.get("type");
  const rawArrangement = params.get("arrangement");
  const validArrangement = ARRANGEMENT_OPTIONS as (OpportunityWorkArrangement | "all")[];
  return {
    search: params.get("q") ?? "",
    status:
      rawStatus && validStatus.includes(rawStatus as ManagedJobStatus | "all")
        ? (rawStatus as ManagedJobStatus | "all")
        : "all",
    publication:
      rawPublication &&
      validPublication.includes(rawPublication as ManagedJobPublication | "all")
        ? (rawPublication as ManagedJobPublication | "all")
        : "all",
    opportunityType:
      rawType && OPPORTUNITY_TYPE_ORDER.includes(rawType as OpportunityType)
        ? (rawType as OpportunityType)
        : "all",
    categoryId: params.get("category") ?? "all",
    campusId: params.get("campus") ?? "all",
    employerId: params.get("employer") ?? "all",
    arrangement:
      rawArrangement &&
      validArrangement.includes(rawArrangement as OpportunityWorkArrangement | "all")
        ? (rawArrangement as OpportunityWorkArrangement | "all")
        : "all",
  };
}

function parseInitialPage(params: URLSearchParams): number {
  const rawPage = Number.parseInt(params.get("page") ?? "", 10);
  return Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
}

export default function AdminJobsPage() {
  return (
    <Suspense fallback={<JobsSkeleton />}>
      <AdminJobsPageInner />
    </Suspense>
  );
}

function AdminJobsPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [filters, setFilters] = useState<JobFilterState>(() =>
    parseInitialFilters(new URLSearchParams(searchParams.toString()))
  );
  const [sortBy, setSortBy] = useState<ManagedJobSortField>("postedAt");
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
      publication: filters.publication === "all" ? undefined : filters.publication,
      categoryId: filters.categoryId === "all" ? undefined : filters.categoryId,
      campusId: filters.campusId === "all" ? undefined : filters.campusId,
      employerId: filters.employerId === "all" ? undefined : filters.employerId,
      arrangement: filters.arrangement === "all" ? undefined : filters.arrangement,
      opportunityType: filters.opportunityType === "all" ? undefined : filters.opportunityType,
      sortBy,
      sortDir,
      page,
      pageSize,
    }),
    [debouncedSearch, filters, sortBy, sortDir, page, pageSize]
  );

  // ----- data hooks (always called at top level) -----
  const { data, error, isLoading, refetch } = useAdminJobs(query);
  const counts = useAdminJobCounts();
  const facets = useAdminJobFacets();

  // Non-sensitive filters persist to the URL so views are shareable and
  // survive reloads (never the raw search term per keystroke).
  const urlParams = searchParams.toString();
  useEffect(() => {
    const timer = setTimeout(() => {
      const sp = new URLSearchParams();
      const trimmed = filters.search.trim();
      if (trimmed) sp.set("q", trimmed);
      if (filters.status !== "all") sp.set("status", filters.status);
      if (filters.publication !== "all") sp.set("publication", filters.publication);
      if (filters.categoryId !== "all") sp.set("category", filters.categoryId);
      if (filters.campusId !== "all") sp.set("campus", filters.campusId);
      if (filters.employerId !== "all") sp.set("employer", filters.employerId);
      if (filters.arrangement !== "all") sp.set("arrangement", filters.arrangement);
      if (filters.opportunityType !== "all") sp.set("type", filters.opportunityType);
      if (page > 1) sp.set("page", String(page));
      const next = sp.toString();
      if (next !== urlParams) router.replace(`${pathname}?${next}`, { scroll: false });
    }, 350);
    return () => clearTimeout(timer);
  }, [filters, page, urlParams, router, pathname]);

  const patchFilters = useCallback((patch: Partial<JobFilterState>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  const toggleSort = useCallback(
    (field: ManagedJobSortField) => {
      if (field === sortBy) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir(field === "title" ? "asc" : "desc");
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
    filters.publication !== "all" ||
    filters.categoryId !== "all" ||
    filters.campusId !== "all" ||
    filters.employerId !== "all" ||
    filters.arrangement !== "all" ||
    filters.opportunityType !== "all";

  const clearFilters = useCallback(() => {
    patchFilters(DEFAULT_JOB_FILTERS);
  }, [patchFilters]);

  return (
    <>
      <AdminPageHeader
        title="Jobs & Hiring"
        description="Every job posted on the platform, its employer, applications and hiring state. Postings go live without approval: open one to take it down, or work through user reports."
        actions={
          <>
            <Link
              href="/admin/job-reports"
              className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
            >
              <Flag className="h-3.5 w-3.5" />
              {countsData ? `${countsData.reported} reported` : "Reports"}
            </Link>
            <span className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-1.5 text-xs font-medium text-kampmax-text-secondary">
              <ClipboardList className="h-3.5 w-3.5" />
              {countsData ? `${countsData.all} jobs` : "…"}
            </span>
          </>
        }
      />

      {/* Pipeline summary */}
      <div className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-kampmax-border bg-white px-4 py-2.5 text-xs text-kampmax-text-secondary">
        <span>
          Open <strong className="font-semibold text-kampmax-success">{countsData?.open ?? "…"}</strong>
        </span>
        <span>
          Pending review{" "}
          <strong className="font-semibold tabular-nums text-kampmax-info">{countsData?.pending_review ?? "…"}</strong>
        </span>
        <span>
          Draft <strong className="font-semibold tabular-nums">{countsData?.draft ?? "…"}</strong>
        </span>
        <span className="text-kampmax-border">•</span>
        <span>
          With applications{" "}
          <strong className="font-semibold tabular-nums">{countsData?.withApplications ?? "…"}</strong>
        </span>
        <span>
          Expiring soon{" "}
          <strong className="font-semibold tabular-nums text-kampmax-warning">{countsData?.expiringSoon ?? "…"}</strong>
        </span>
        <span className="text-kampmax-border">•</span>
        <span>
          Reported <strong className="font-semibold tabular-nums">{countsData?.reported ?? "…"}</strong>
        </span>
        <span>
          <span title="Ended = closed, expired or cancelled">
            Ended{" "}
            <strong className="font-semibold tabular-nums">
              {(countsData?.closed ?? 0) + (countsData?.expired ?? 0) + (countsData?.cancelled ?? 0)}
            </strong>
          </span>
        </span>
      </div>

      <div className="mb-4">
        <JobFilters
          filters={filters}
          counts={countsData}
          facets={facetsData}
          onChange={patchFilters}
        />
      </div>

      <JobsTable
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
        />
      )}
    </>
  );
}

function JobsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-10 w-64 animate-pulse rounded bg-kampmax-muted" />
      <div className="h-24 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
      <div className="h-80 animate-pulse rounded-lg bg-white ring-1 ring-kampmax-border" />
    </div>
  );
}