"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getOpportunitiesPageApi } from "@/services/opportunity";
import type { OpportunitySortKey, OpportunityWorkArrangement } from "@/types/opportunity";
import { useDebounce } from "@/hooks";
import {
  FindWorkHeader,
  OpportunityFilters,
  OpportunityList,
  OpportunityGridSkeleton,
  OpportunityEmptyState,
  OpportunityErrorState,
} from "@/components/freelancer/opportunities";
import type { OpportunityFilterValues } from "@/components/freelancer/opportunities/OpportunityFilters";
import { Button } from "@/components/ui";

const PAGE_SIZE = 9;

function FindWorkContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isFirstRender = useRef(true);

  const qParam = searchParams.get("q") ?? "";
  const categoryParam = searchParams.get("category") ?? "";
  const expParam = searchParams.get("exp") ?? "";
  const arrParam = searchParams.get("arr") ?? "";
  const sortParam = (searchParams.get("sort") as OpportunitySortKey | null) ?? "newest";
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const validArrangements: OpportunityWorkArrangement[] = ["remote", "on_site", "on_campus", "hybrid"];
  const arrangement =
    arrParam && validArrangements.includes(arrParam as OpportunityWorkArrangement)
      ? (arrParam as OpportunityWorkArrangement)
      : undefined;

  const [searchInput, setSearchInput] = useState(qParam);
  const debouncedSearch = useDebounce(searchInput, 300);

  const values: OpportunityFilterValues = {
    search: searchInput,
    categoryId: categoryParam,
    experience: expParam,
    arrangement: arrParam,
    sort: sortParam,
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
      if (next.sort !== "newest") params.set("sort", next.sort);
      else params.delete("sort");
      if (next.page && next.page > 1) params.set("page", String(next.page));
      else params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, values]
  );

  // Debounced search → URL + loading state.
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 200);
    syncUrl({ search: searchInput, page: 1 });
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const [result, setResult] = useState({ items: [], total: 0, page: 1, size: PAGE_SIZE, totalPages: 1 });

  const query = useMemo(
    () => ({
      search: debouncedSearch,
      categoryId: categoryParam || undefined,
      experience: expParam || undefined,
      arrangement,
      sort: sortParam,
      page: pageParam,
      size: PAGE_SIZE,
    }),
    [debouncedSearch, categoryParam, expParam, arrangement, sortParam, pageParam]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    void getOpportunitiesPageApi({
      search: query.search,
      categoryId: query.categoryId,
      experience: query.experience,
      arrangement: query.arrangement,
      page: query.page,
      size: query.size,
    }).then((response) => {
      if (cancelled) return;
      if (response.error) {
        setError(response.error.message);
        return;
      }
      setResult(response.page);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setError("We couldn't load opportunities right now.");
    }).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [query]);

  const hasFilters = Boolean(searchInput.trim() || categoryParam || expParam || arrParam);

  const handleReset = useCallback(() => {
    setSearchInput("");
    syncUrl({ search: "", categoryId: "", experience: "", arrangement: "", sort: "newest", page: 1 });
  }, [syncUrl]);

  const goToPage = useCallback(
    (p: number) => syncUrl({ page: p }),
    [syncUrl]
  );

  if (error) {
    return (
      <div className="space-y-6">
        <FindWorkHeader count={0} />
        <OpportunityErrorState message={error} onRetry={() => setError(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FindWorkHeader count={result ? result.total : 0} />
      <OpportunityFilters
        values={values}
        onSearchChange={setSearchInput}
        onCategoryChange={(v) => syncUrl({ categoryId: v, page: 1 })}
        onExperienceChange={(v) => syncUrl({ experience: v, page: 1 })}
        onArrangementChange={(v) => syncUrl({ arrangement: v, page: 1 })}
        onSortChange={(v) => syncUrl({ sort: v })}
        onReset={handleReset}
      />
      {loading ? (
        <OpportunityGridSkeleton />
      ) : result.items.length === 0 ? (
        <OpportunityEmptyState hasFilters={hasFilters} onReset={handleReset} />
      ) : (
        <>
          <OpportunityList opportunities={result.items} />
          {result.totalPages > 1 && (
            <nav
              className="flex items-center justify-between border-t border-neutral-200 pt-4"
              aria-label="Job pagination"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={result.page <= 1}
                onClick={() => goToPage(result.page - 1)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" aria-hidden /> Previous
              </Button>
              <p className="text-xs text-neutral-500">
                Page {result.page} of {result.totalPages} · {result.total}{" "}
                {result.total === 1 ? "job" : "jobs"}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={result.page >= result.totalPages}
                onClick={() => goToPage(result.page + 1)}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" aria-hidden />
              </Button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function FindWorkPage() {
  return (
    <Suspense fallback={<OpportunityGridSkeleton />}>
      <FindWorkContent />
    </Suspense>
  );
}
