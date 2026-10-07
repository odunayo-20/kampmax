"use client";

import { useEffect, useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  ShieldCheck,
  Star,
  MapPin,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  UserCheck,
  Zap,
} from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useDebounce } from "@/hooks/use-debounce";
import { useServiceMarketplace } from "@/hooks/useServiceMarketplace";
import { ServiceCategoryChips } from "./ServiceCategoryChips";
import { ServiceFilterSidebar } from "./ServiceFilterSidebar";
import { ServiceFilterDrawer } from "./ServiceFilterDrawer";
import { ServiceSortDropdown } from "./ServiceSortDropdown";
import { ServiceCard } from "./ServiceCard";
import { ServiceCardSkeleton } from "./ServiceSkeletons";
import { ServiceEmptyState } from "./ServiceEmptyState";
import { ServicePagination } from "./ServicePagination";
import { serviceSortLabel } from "./constants";
import { searchProviders } from "@/services/service-marketplace";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";

const QUICK_SERVICE_TAGS = [
  "Laptop Repair",
  "Knotless Braids",
  "Birthday Shoot",
  "Math Tutoring",
  "Laundry",
  "Wig Revamp",
];

function FilteredSearchField({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  const [input, setInput] = useState(value);
  const debouncedInput = useDebounce(input, 300);

  useEffect(() => setInput(value), [value]);

  useEffect(() => {
    if (debouncedInput !== value) onValueChange(debouncedInput);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedInput]);

  return (
    <div className="relative w-full">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search services (e.g. screen fix, makeup, braids, maths tutoring)..."
        className="w-full h-11 sm:h-12 pl-10 pr-4 rounded-2xl bg-white text-neutral-900 placeholder:text-neutral-400 text-sm border border-neutral-200/90 shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
      />
      {input && (
        <button
          onClick={() => setInput("")}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-neutral-400 hover:text-neutral-600"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function VerifiedProsReel() {
  const query = useQuery({
    queryKey: ["services", "verified-pros"],
    queryFn: () => searchProviders({ limit: 12 }),
    staleTime: 5 * 60_000,
    retry: false,
  });
  const providers = query.data ?? [];

  if (providers.length === 0) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserCheck className="h-4 w-4 text-primary-600" />
          <h2 className="text-sm font-bold text-neutral-900">Verified providers</h2>
        </div>
        <span className="text-xs text-neutral-500 font-medium">{providers.length} verified</span>
      </div>

      <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
        {providers.map((p) => (
          <Link
            key={p.id}
            href={`/services/providers/${p.slug}`}
            className="flex-shrink-0 w-[200px] sm:w-[220px] bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-2xs hover:border-primary-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-2.5 mb-2">
              <Avatar name={p.displayName} size="md" className="h-10 w-10 ring-1 ring-neutral-200" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <span className="text-xs sm:text-sm font-bold text-neutral-900 group-hover:text-primary-600 transition-colors truncate">
                    {p.displayName}
                  </span>
                  <ShieldCheck className="h-3.5 w-3.5 text-primary-600 shrink-0" />
                </div>
              </div>
            </div>
            {p.bio && <p className="line-clamp-2 border-t border-neutral-100 pt-1.5 text-[11px] text-neutral-500">{p.bio}</p>}
          </Link>
        ))}
      </div>
    </section>
  );
}

function GuaranteeRow() {
  const items = [
    {
      icon: ShieldCheck,
      title: "Escrow Protection",
      body: "Funds are released to providers only after you confirm job satisfaction.",
    },
    {
      icon: UserCheck,
      title: "Campus Verified",
      body: "Providers are verified students or vetted local technicians.",
    },
    {
      icon: Zap,
      title: "Fast Turnaround",
      body: "Get same-day emergency repairs, styling, and academic tutoring.",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {items.map((item) => (
        <div
          key={item.title}
          className="flex items-start gap-3 bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-2xs"
        >
          <span className="w-9 h-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <item.icon className="h-4.5 w-4.5" />
          </span>
          <div>
            <h3 className="text-xs font-bold text-neutral-900">{item.title}</h3>
            <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">
              {item.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ServicesBrowseView() {
  const { selectedCampus } = useApp();
  const {
    filters,
    setFilter,
    setPage,
    clearFilters,
    isLoading,
    services,
    error,
    retry,
    resultCount,
    totalPages,
    currentPage,
    categories,
    campusOptions,
    effectiveCampusId,
  } = useServiceMarketplace();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const campusAbbr =
    campusOptions.find((c) => c.id === effectiveCampusId)?.abbreviation ??
    selectedCampus.abbreviation;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. Hero Search & Campus Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl border border-primary-800/40">
        <div className="max-w-2xl space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 text-white backdrop-blur-md border border-white/15">
              <MapPin className="h-3.5 w-3.5 text-primary-400" />
              <span>{selectedCampus.name} ({campusAbbr})</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-400 text-neutral-950">
              <span>Verified Campus Gigs & Services</span>
            </span>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
              Hire Trusted Student & Campus Pros
            </h1>
            <p className="text-xs sm:text-sm text-neutral-300 font-medium mt-1">
              Tech repairs, hair & braids, photography, cleaning, academic tutoring, and event coverage.
            </p>
          </div>

          {/* Search Input */}
          <div className="pt-1">
            <FilteredSearchField
              value={filters.q}
              onValueChange={(v) => setFilter("q", v)}
            />
          </div>

          {/* Quick Tag Pills */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[11px] font-semibold text-neutral-300">Popular:</span>
            {QUICK_SERVICE_TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => setFilter("q", tag)}
                className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10 transition-colors"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Top Verified Providers Highlight */}
      <VerifiedProsReel />

      {/* 3. Category Filter Strip */}
      <section aria-label="Browse services by category" className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
            Departments
          </h2>
          <Link
            href="/categories"
            className="text-xs font-bold text-primary-600 hover:underline"
          >
            All Categories →
          </Link>
        </div>
        <ServiceCategoryChips categories={categories} />
      </section>

      {/* 4. Trust & Guarantee Badges */}
      <GuaranteeRow />

      {/* 5. Main Results Feed with Sidebar & Scalable Pagination */}
      <section id="results" className="scroll-mt-20 pt-2 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-black text-neutral-900 tracking-tight">
              {isLoading
                ? "Loading services…"
                : `${resultCount} service${resultCount === 1 ? "" : "s"} available`}
            </h2>
            <p className="text-xs text-neutral-500">
              Showing active services at {campusAbbr} · Sorted by {serviceSortLabel(filters.sort)}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 shadow-2xs hover:bg-neutral-50"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>
            <ServiceSortDropdown
              value={filters.sort}
              onChange={(s) => setFilter("sort", s)}
            />
          </div>
        </div>

        <div className="flex gap-6 items-start">
          {/* Desktop Filter Sidebar */}
          <ServiceFilterSidebar
            filters={filters}
            onFilterChange={setFilter}
            onClear={clearFilters}
            onOpenDrawer={() => setDrawerOpen(true)}
            categories={categories}
            campuses={campusOptions}
          />

          {/* Service Cards Grid (Scalable 2-col mobile / 3-col desktop) */}
          <div className="flex-1 min-w-0">
            {error ? (
              <div role="alert" className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">
                {error}{" "}
                <button type="button" onClick={retry} className="font-semibold text-primary-600 hover:underline">
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <ServiceEmptyState
                hasFilters={Boolean(
                  filters.q ||
                    filters.campusId ||
                    filters.ratingMin ||
                    filters.priceBucket ||
                    filters.locationType
                )}
                onClearFilters={clearFilters}
                activeCampusLabel={
                  campusOptions.find((c) => c.id === effectiveCampusId)?.name
                }
              />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                    />
                  ))}
                </div>

                {/* Scalable Pagination Controls */}
                {totalPages > 1 && (
                  <div className="mt-8 pt-4 border-t border-neutral-100 flex justify-center">
                    <ServicePagination
                      page={currentPage}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      {/* 6. Onboarding / Register as a Pro */}
      <section className="rounded-3xl bg-gradient-to-r from-neutral-900 to-neutral-950 border border-neutral-800 p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 shadow-lg">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary-400 uppercase tracking-wider">
            Earn on Campus
          </span>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Offer laundry, tech repairs, styling or tutoring?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-md">
            Register as a service provider on Kampmax. Get booked directly by fellow students and build a trusted campus reputation.
          </p>
        </div>

        <Link
          href="/onboarding/service-provider"
          className="inline-flex items-center gap-1.5 shrink-0 px-5 py-3 rounded-2xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-black shadow-lg shadow-primary-950/50 active:scale-95 transition-all"
        >
          <span>Register as a Service Pro</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>

      <ServiceFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onShowResults={() => {
          setDrawerOpen(false);
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
        }}
        filters={filters}
        onFilterChange={setFilter}
        categories={categories}
        campuses={campusOptions}
      />
    </div>
  );
}

interface ServiceCategoryViewProps {
  categoryId: string;
  categorySlug: string;
  categoryName: string;
  description?: string;
}

/** Category landing page — locked to one category */
export function ServicesCategoryView({
  categoryId,
  categorySlug,
  categoryName,
  description,
}: ServiceCategoryViewProps) {
  const {
    filters,
    setFilter,
    setPage,
    clearFilters,
    isLoading,
    services,
    error,
    retry,
    resultCount,
    totalPages,
    currentPage,
    categories,
    campusOptions,
  } = useServiceMarketplace({
    basePath: `/services/categories/${categorySlug}`,
    lockedCategoryId: categoryId,
  });

  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="space-y-6 pb-16">
      {/* Category Banner */}
      <section className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-950 via-primary-900 to-indigo-950 text-white p-6 sm:p-8 shadow-xl">
        <div className="max-w-xl space-y-2">
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-xs font-bold text-white/80 hover:text-white mb-2"
          >
            ← All Services
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">{categoryName}</h1>
          {description && (
            <p className="text-xs sm:text-sm text-white/80 font-medium">{description}</p>
          )}
        </div>
      </section>

      {/* Results */}
      <section id="results" className="scroll-mt-20 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              {isLoading ? "Loading…" : `${resultCount} ${resultCount === 1 ? "service" : "services"} found`}
            </h2>
            <p className="text-xs text-neutral-500">
              Sorted by {serviceSortLabel(filters.sort)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-bold text-neutral-700 shadow-2xs"
            >
              <Filter className="h-3.5 w-3.5" />
              <span>Filters</span>
            </button>
            <ServiceSortDropdown value={filters.sort} onChange={(s) => setFilter("sort", s)} />
          </div>
        </div>

        <div className="flex gap-6 items-start">
          <ServiceFilterSidebar
            filters={filters}
            onFilterChange={setFilter}
            onClear={clearFilters}
            onOpenDrawer={() => setDrawerOpen(true)}
            categories={categories}
            campuses={campusOptions}
          />

          <div className="flex-1 min-w-0">
            {error ? (
              <div role="alert" className="rounded-2xl border border-neutral-200 bg-white p-8 text-center text-sm text-neutral-600">
                {error}{" "}
                <button type="button" onClick={retry} className="font-semibold text-primary-600 hover:underline">
                  Try again
                </button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ServiceCardSkeleton key={i} />
                ))}
              </div>
            ) : services.length === 0 ? (
              <ServiceEmptyState
                hasFilters={Boolean(
                  filters.q ||
                    filters.campusId ||
                    filters.ratingMin ||
                    filters.priceBucket ||
                    filters.locationType
                )}
                onClearFilters={clearFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                    />
                  ))}
                </div>
                {totalPages > 1 && (
                  <div className="mt-8 pt-4 border-t border-neutral-100 flex justify-center">
                    <ServicePagination
                      page={currentPage}
                      totalPages={totalPages}
                      onChange={setPage}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <ServiceFilterDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onShowResults={() => {
          setDrawerOpen(false);
          document.getElementById("results")?.scrollIntoView({ behavior: "smooth" });
        }}
        filters={filters}
        onFilterChange={setFilter}
        categories={categories}
        campuses={campusOptions}
      />
    </div>
  );
}