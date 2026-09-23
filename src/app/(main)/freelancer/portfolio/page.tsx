"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { fetchMyPortfolio } from "@/services/freelancer-services";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import {
  PortfolioHeader,
  PortfolioGrid,
  PortfolioEmptyState,
  PortfolioErrorState,
  PortfolioGridSkeleton,
} from "@/components/freelancer/portfolio";
import { cn } from "@/lib/utils";

type VisibilityFilter = "all" | "public" | "private";

function PortfolioContent() {
  const router = useRouter();
  const [items, setItems] = useState<FreelancerPortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<VisibilityFilter>("all");

  async function load() {
    setLoading(true);
    setLoadError(null);
    const { items: loaded, error } = await fetchMyPortfolio();
    setItems(loaded);
    setLoadError(error);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const counts = useMemo(() => {
    return {
      all: items.length,
      public: items.filter((i) => i.visible).length,
      private: items.filter((i) => !i.visible).length,
    };
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === "public") return items.filter((i) => i.visible);
    if (filter === "private") return items.filter((i) => !i.visible);
    return items;
  }, [items, filter]);

  const tabs: { value: VisibilityFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: counts.all },
    { value: "public", label: "Public", count: counts.public },
    { value: "private", label: "Private", count: counts.private },
  ];

  if (loading) return <PortfolioGridSkeleton />;
  if (loadError) return <PortfolioErrorState message={loadError} onRetry={() => void load()} />;

  return (
    <div className="space-y-6">
      <PortfolioHeader count={counts.all} />

      <div className="flex -space-x-px overflow-x-auto rounded-lg border border-neutral-200 bg-white">
        {tabs.map((tab) => {
          const active = filter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilter(tab.value)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "whitespace-nowrap border-r border-neutral-200 px-3 py-2 text-xs font-medium last:border-r-0",
                active ? "bg-primary-600 text-white" : "bg-white text-neutral-600 hover:bg-neutral-50"
              )}
            >
              {tab.label}
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]",
                  active ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-500"
                )}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <PortfolioEmptyState />
      ) : (
        <PortfolioGrid
          items={filtered}
          onAction={(item) => router.push(`/freelancer/portfolio/${item.id}`)}
        />
      )}
    </div>
  );
}

export default function PortfolioPage() {
  return (
    <Suspense fallback={<PortfolioGridSkeleton />}>
      <PortfolioContent />
    </Suspense>
  );
}
