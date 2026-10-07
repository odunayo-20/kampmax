"use client";

import { useCallback, useEffect, useRef, useState, Suspense } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { fetchMyServices } from "@/services/freelancer-services";
import type { FreelancerService, FreelancerServiceStatus } from "@/types/freelancer-services";
import {
  ServiceHeader,
  ServiceFilters,
  ServiceList,
  ServicesGridSkeleton,
  ServicesEmptyState,
} from "@/components/freelancer/services";
import { useDebounce } from "@/hooks";

type StatusFilter = FreelancerServiceStatus | "all";

function ServicesContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [all, setAll] = useState<FreelancerService[]>([]);

  const statusParam = (searchParams.get("status") ?? "all") as StatusFilter;
  const searchParam = searchParams.get("q") ?? "";

  const status: StatusFilter = ["all", "draft", "submitted", "under_review", "published", "paused", "rejected", "archived"].includes(statusParam)
    ? (statusParam as StatusFilter)
    : "all";

  const [searchInput, setSearchInput] = useState(searchParam);
  const debouncedSearch = useDebounce(searchInput, 300);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) params.set("q", debouncedSearch);
    else params.delete("q");
    if (status !== "all") params.set("status", status);
    else params.delete("status");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, status]);

  // Everything is loaded once; the tabs and the search narrow it down here.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchMyServices()
      .then((page) => {
        if (cancelled) return;
        setAll(page.items);
        setLoadError(null);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load your services.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const needle = debouncedSearch.trim().toLowerCase();
  const items = all.filter(
    (s) =>
      (status === "all" || s.status === status) &&
      (!needle ||
        s.title.toLowerCase().includes(needle) ||
        s.shortDescription.toLowerCase().includes(needle) ||
        s.skills.some((k) => k.toLowerCase().includes(needle)))
  );
  const total = items.length;

  const counts: Record<StatusFilter, number> = {
    all: all.length,
    draft: 0,
    submitted: 0,
    under_review: 0,
    published: 0,
    paused: 0,
    rejected: 0,
    archived: 0,
  };
  for (const s of all) counts[s.status] += 1;

  const handleStatusChange = useCallback(
    (value: StatusFilter) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value !== "all") params.set("status", value);
      else params.delete("status");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  const hasFilters = status !== "all" || debouncedSearch.length > 0;

  return (
    <div className="space-y-6">
      <ServiceHeader count={total} />
      <ServiceFilters
        status={status}
        search={searchInput}
        onStatusChange={handleStatusChange}
        onSearchChange={setSearchInput}
        counts={counts}
      />
      {loadError ? (
        <div role="alert" className="rounded-xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">
          {loadError}{" "}
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      ) : loading && items.length === 0 ? (
        <ServicesGridSkeleton />
      ) : items.length === 0 ? (
        <ServicesEmptyState
          hasFilters={hasFilters}
          onCreate={() => router.push("/freelancer/services/create")}
        />
      ) : (
        <ServiceList services={items} />
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={<ServicesGridSkeleton />}>
      <ServicesContent />
    </Suspense>
  );
}
