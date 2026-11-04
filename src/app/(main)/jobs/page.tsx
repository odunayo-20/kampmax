"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type {
  OpportunitySortKey,
  OpportunityType,
  OpportunityWorkArrangement,
} from "@/types/opportunity";
import { OPPORTUNITY_TYPE_ORDER } from "@/config/opportunity";
import { useDebounce } from "@/hooks";
import { useJobs, useSavedJobIds } from "@/hooks/use-jobs";
import {
  OpportunityCard,
  OpportunityFilters,
  OpportunityGridSkeleton,
  OpportunityEmptyState,
  OpportunityErrorState,
} from "@/components/freelancer/opportunities";
import type { OpportunityFilterValues } from "@/components/freelancer/opportunities/OpportunityFilters";
import { JobsHeader } from "@/components/jobs/JobsHeader";
import { JobsPagination } from "@/components/jobs/JobsPagination";
import { JOBS_PAGE_SIZE, JOB_SEARCH_DEBOUNCE_MS } from "@/config/jobs";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

const VALID_ARRANGEMENTS: OpportunityWorkArrangement[] = [
  "remote",
  "on_site",
  "on_campus",
  "hybrid",
];

function JobsMarketplaceContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const qParam = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category") ?? "";
  const expParam = searchParams.get("exp") ?? "";
  const arrParam = searchParams.get("arr") ?? "";
  const typeParam = searchParams.get("type") ?? "";
  const sortParam = (searchParams.get("sort") as OpportunitySortKey | null) ?? "newest";
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const arrangement =
    arrParam && VALID_ARRANGEMENTS.includes(arrParam as OpportunityWorkArrangement)
      ? (arrParam as OpportunityWorkArrangement)
      : undefined;

  const type: OpportunityType | "" = OPPORTUNITY_TYPE_ORDER.includes(typeParam as OpportunityType)
    ? (typeParam as OpportunityType)
    : "";

  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebounce(searchInput, JOB_SEARCH_DEBOUNCE_MS);
  const isFirstRender = useRef(true);

  const values: OpportunityFilterValues = {
    search: searchInput,
    categoryId: categoryParam,
    experience: expParam,
    arrangement: arrParam,
    sort: sortParam,
    type,
  };

  const syncUrl = useCallback(
    (overrides: Partial<OpportunityFilterValues> & { page?: number }) => {
      const params = new URLSearchParams(searchParams.toString());
      const next = { ...values, ...overrides };
      if (next.search.trim()) params.set("q", next.search.trim());
      else params.delete("q");
      if (next.categoryId) params.set("category", next.categoryId);
      else params.delete("category");
      if (next.experience) params.set("exp", next.experience);
      else params.delete("exp");
      if (next.arrangement) params.set("arr", next.arrangement);
      else params.delete("arr");
      if (next.type) params.set("type", next.type);
      else params.delete("type");
      if (next.sort !== "newest") params.set("sort", next.sort);
      else params.delete("sort");
      if (next.page && next.page > 1) params.set("page", String(next.page));
      else params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, values]
  );

  // Debounced search → URL (the query cache keeps previous results warm).
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    syncUrl({ search: searchInput, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      categoryId: categoryParam || undefined,
      experience: expParam || undefined,
      arrangement: arrangement as string | undefined,
      type: type || undefined,
      sort: sortParam,
      page: pageParam,
      size: JOBS_PAGE_SIZE,
    }),
    [debouncedSearch, categoryParam, expParam, arrangement, type, sortParam, pageParam]
  );

  const jobsQuery = useJobs(filters);
  const savedIdsQuery = useSavedJobIds();
  const savedSet = useMemo(
    () => new Set(savedIdsQuery.data ?? []),
    [savedIdsQuery.data]
  );

  const hasFilters = Boolean(searchInput.trim() || categoryParam || expParam || arrParam || type);

  const handleReset = useCallback(() => {
    setSearchInput("");
    syncUrl({ search: "", categoryId: "", experience: "", arrangement: "", type: "", sort: "newest", page: 1 });
  }, [syncUrl]);

  const goToPage = useCallback((p: number) => syncUrl({ page: p }), [syncUrl]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
      <div className="space-y-6">
        <JobsHeader count={jobsQuery.data?.total ?? 0} />

        <OpportunityFilters
          values={values}
          onSearchChange={setSearchInput}
          onCategoryChange={(v) => syncUrl({ categoryId: v, page: 1 })}
          onExperienceChange={(v) => syncUrl({ experience: v, page: 1 })}
          onArrangementChange={(v) => syncUrl({ arrangement: v, page: 1 })}
          onSortChange={(v) => syncUrl({ sort: v })}
          onTypeChange={(v) => syncUrl({ type: v, page: 1 })}
          onReset={handleReset}
        />

        {jobsQuery.isPending ? (
          <OpportunityGridSkeleton />
        ) : jobsQuery.isError ? (
          <OpportunityErrorState
            message={getFriendlyErrorMessage(jobsQuery.error)}
            onRetry={() => jobsQuery.refetch()}
          />
        ) : jobsQuery.data?.total === 0 ? (
          <OpportunityEmptyState hasFilters={hasFilters} onReset={handleReset} />
        ) : (
          <>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3" role="list">
              {(jobsQuery.data?.items ?? []).map((o) => (
                <li key={o.id}>
                  <OpportunityCard
                    opportunity={o}
                    saved={savedSet.has(o.id)}
                    href={`/jobs/${o.id}`}
                  />
                </li>
              ))}
            </ul>
            <JobsPagination
              page={jobsQuery.data?.page ?? 1}
              totalPages={jobsQuery.data?.totalPages ?? 1}
              total={jobsQuery.data?.total ?? 0}
              onPageChange={goToPage}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default function JobsMarketplacePage() {
  return (
    <Suspense fallback={<OpportunityGridSkeleton />}>
      <JobsMarketplaceContent />
    </Suspense>
  );
}