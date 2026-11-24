"use client";

import { Suspense, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Calendar, MapPin, ArrowRight, Wrench, Briefcase, Ticket, ShoppingBag, UserRound } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { listEventsApi } from "@/services/event-tickets";
import { useDebounce } from "@/hooks/use-debounce";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { eventDate, eventTime, priceLabel } from "@/components/events/event-format";
import { fetchProducts } from "@/services/products";
import { listPublicJobs } from "@/services/jobs";
import { fetchServicePage } from "@/services/service-marketplace";
import { fetchPublicServices } from "@/services/freelancer-services";
import { listPublicFreelancers } from "@/services/freelancer";
import { FreelanceServiceRow } from "@/components/explore/FreelanceServiceRow";
import { EXPLORE_TONES, ExploreCard, ExploreRow, ExploreThumb } from "@/components/explore/ExploreRow";
import { Skeleton } from "@/components/ui/Skeleton";
import { useAuth } from "@/lib/auth-context";
import { useMyLocation } from "@/hooks/use-location";
import { fetchNearby, formatDistance, roundCoordinate } from "@/services/nearby-api";
import { cn } from "@/lib/utils";

type ExploreCategory = "all" | "events" | "products" | "services" | "freelance" | "freelancers" | "jobs";

const CATEGORIES: { id: ExploreCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "products", label: "Products" },
  { id: "services", label: "Services" },
  { id: "freelance", label: "Freelance" },
  { id: "freelancers", label: "Freelancers" },
  { id: "jobs", label: "Jobs" },
];

/** 1,284 → "1.3k" past a thousand, so a pill never grows wide. */
function formatCount(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);
}

/** A few freelancer services in the mixed view; more once that filter is chosen. */
const FREELANCE_PREVIEW = 3;
const FREELANCE_FULL = 10;

/** Keep the last results (and so the filter counts) on screen while a new search loads. */
const KEEP_PREVIOUS = { placeholderData: keepPreviousData };

type Origin = { latitude: number; longitude: number };

/** Nearby caps the radius at 25 km and a page at 50 results. */
const NEARBY_RADIUS_M = 25_000;
const NEARBY_LIMIT = 50;

// Reading the URL (?q=, from the home page's search) needs a Suspense boundary.
export default function ExplorePage() {
  return (
    <Suspense>
      <ExploreContent />
    </Suspense>
  );
}

function ExploreContent() {
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory>("all");
  const urlQuery = useSearchParams().get("q") ?? "";
  const [searchQuery, setSearchQuery] = useState(urlQuery.slice(0, 100));
  const { record: recordSearch } = useRecentSearches();
  const rememberSearch = (term: string) => term.trim().length >= 2 && recordSearch(term);

  const debouncedQ = useDebounce(searchQuery.trim(), 300);
  const search = debouncedQ || undefined;

  // Each vertical returns a few rows to show and the real total, which the filter pills display.
  const eventsQuery = useQuery({
    queryKey: ["explore", "events", search],
    queryFn: async () => {
      const page = await listEventsApi({ q: search, limit: 20 });
      return { items: page.items, total: page.meta.total };
    },
    ...KEEP_PREVIOUS,
  });
  const productsQuery = useQuery({
    queryKey: ["explore", "products", search],
    queryFn: async () => {
      const res = await fetchProducts({ search, status: "ACTIVE", limit: 4 });
      if (res.error) throw res.error;
      return { items: res.data, total: res.total };
    },
    ...KEEP_PREVIOUS,
  });
  const servicesQuery = useQuery({
    queryKey: ["explore", "services", search],
    queryFn: () => fetchServicePage({ q: search, pageSize: 3 }),
    ...KEEP_PREVIOUS,
  });
  const freelanceLimit = selectedCategory === "freelance" ? FREELANCE_FULL : FREELANCE_PREVIEW;
  const freelanceQuery = useQuery({
    queryKey: ["explore", "freelance", search, freelanceLimit],
    queryFn: async () => {
      const page = await fetchPublicServices({ q: search, limit: freelanceLimit });
      if (page.failed) throw new Error("Couldn't load freelancer services.");
      return page;
    },
    ...KEEP_PREVIOUS,
  });
  // The people themselves (the Freelance filter lists what they sell).
  const freelancersQuery = useQuery({
    queryKey: ["explore", "freelancers", search],
    queryFn: async () => {
      const res = await listPublicFreelancers({ q: search, limit: 3 });
      if (res.error) throw res.error;
      return { items: res.profiles, total: res.total };
    },
    ...KEEP_PREVIOUS,
  });
  const jobsQuery = useQuery({
    queryKey: ["explore", "jobs", search],
    queryFn: async () => {
      const res = await listPublicJobs({ search, limit: 3 });
      if (res.error) throw res.error;
      return { items: res.jobs, total: res.total };
    },
    ...KEEP_PREVIOUS,
  });

  const filteredEvents = eventsQuery.data?.items ?? [];
  const filteredProducts = productsQuery.data?.items ?? [];
  const filteredServices = servicesQuery.data?.items ?? [];
  const freelanceServices = freelanceQuery.data?.items ?? [];
  const freelanceTotal = freelanceQuery.data?.total ?? 0;
  const filteredFreelancers = freelancersQuery.data?.items ?? [];
  const filteredJobs = jobsQuery.data?.items ?? [];

  // Totals for the pills. Undefined while loading or failed, so a pill shows no number
  // rather than a wrong one; "All" appears only once every total is known.
  const verticalTotals = {
    events: eventsQuery.data?.total,
    products: productsQuery.data?.total,
    services: servicesQuery.data?.total,
    freelance: freelanceQuery.data?.total,
    freelancers: freelancersQuery.data?.total,
    jobs: jobsQuery.data?.total,
  };
  const known = Object.values(verticalTotals);
  const counts: Record<ExploreCategory, number | undefined> = {
    ...verticalTotals,
    all: known.every((n) => n !== undefined) ? known.reduce<number>((sum, n) => sum + (n ?? 0), 0) : undefined,
  };

  // Distances come from the backend's /nearby (privacy-aware, reduced-precision
  // public locations). Origin: saved profile location, else the device. Never fabricated.
  const { status: authStatus } = useAuth();
  const profileLocation = useMyLocation();
  const [deviceOrigin, setDeviceOrigin] = useState<Origin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);

  const profile = profileLocation.data;
  const origin: Origin | null =
    deviceOrigin ?? (profile ? { latitude: profile.latitude, longitude: profile.longitude } : null);

  const nearbyQuery = useQuery({
    queryKey: [
      "explore",
      "nearby",
      origin ? roundCoordinate(origin.latitude) : null,
      origin ? roundCoordinate(origin.longitude) : null,
    ],
    enabled: authStatus === "authenticated" && origin !== null,
    staleTime: 60_000,
    queryFn: () =>
      fetchNearby({
        latitude: origin!.latitude,
        longitude: origin!.longitude,
        radiusMeters: NEARBY_RADIUS_M,
        limit: NEARBY_LIMIT,
      }),
  });

  // "TYPE:id" -> meters. Products inherit their vendor's distance and services
  // their provider's. Jobs have no location of their own, so they show none.
  const distances = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of nearbyQuery.data?.items ?? []) {
      map.set(`${item.entityType}:${item.entityId}`, item.distanceMeters);
    }
    return map;
  }, [nearbyQuery.data]);
  const distanceLabel = (type: string, id: string) => {
    const m = distances.get(`${type}:${id}`);
    return m === undefined ? "" : formatDistance(m);
  };

  const useDeviceLocation = () => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      return;
    }
    setLocating(true);
    setLocationDenied(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setDeviceOrigin({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocationDenied(true);
        setLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  };

  const verticalQueries = [eventsQuery, productsQuery, servicesQuery, freelanceQuery, freelancersQuery, jobsQuery];
  const failed = verticalQueries.some((q) => q.isError);
  const loading = verticalQueries.some((q) => q.isLoading);
  // Swapping to a new search keeps the old results up (dimmed) until the new ones land.
  const refreshing = verticalQueries.some((q) => q.isPlaceholderData);
  const retryFailed = () => verticalQueries.filter((q) => q.isError).forEach((q) => q.refetch());
  const shows = (c: ExploreCategory) => selectedCategory === "all" || selectedCategory === c;
  const empty =
    !loading &&
    (!shows("events") || !filteredEvents.length) &&
    (!shows("products") || !filteredProducts.length) &&
    (!shows("services") || !filteredServices.length) &&
    (!shows("freelance") || !freelanceServices.length) &&
    (!shows("freelancers") || !filteredFreelancers.length) &&
    (!shows("jobs") || !filteredJobs.length);

  return (
    <PageContainer className="space-y-4 pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Explore</h1>
            <p className="text-xs text-neutral-500">
              Browse events, products, services, freelancers, jobs and more
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            // A finished search (Enter, or moving away), not every pause while typing.
            onKeyDown={(e) => e.key === "Enter" && rememberSearch(searchQuery)}
            onBlur={() => rememberSearch(searchQuery)}
            placeholder="Search in Kampmax Hub..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
                selectedCategory === cat.id
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {cat.label}
              {counts[cat.id] !== undefined && (
                <span
                  className={cn(
                    "ml-1.5 tabular-nums",
                    selectedCategory === cat.id ? "text-white/80" : "text-neutral-400"
                  )}
                >
                  {formatCount(counts[cat.id]!)}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Distance origin */}
      <div className="flex items-center justify-between gap-2 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5 text-neutral-400" />
          {origin
            ? deviceOrigin
              ? "Distances from your current location"
              : "Distances from your saved location"
            : locationDenied
              ? "Location unavailable. Allow location access to see distances."
              : "Turn on location to see how far things are"}
        </span>
        {(!origin || deviceOrigin) && (
          <button
            type="button"
            onClick={useDeviceLocation}
            disabled={locating}
            className="font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50"
          >
            {locating ? "Locating…" : deviceOrigin ? "Refresh" : "Use my location"}
          </button>
        )}
      </div>

      {/* Mixed Multi-Vertical Results Stream */}
      <div className={cn("space-y-3.5 transition-opacity", refreshing && "opacity-60")} aria-busy={loading || refreshing}>
        {failed && (
          <div
            role="alert"
            className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800"
          >
            <span>Some results could not be loaded.</span>
            <button
              type="button"
              onClick={retryFailed}
              className="shrink-0 rounded-lg px-2 py-1 font-semibold text-amber-900 underline hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600"
            >
              Try again
            </button>
          </div>
        )}
        {loading && <ResultsSkeleton />}
        {empty && !failed && (
          <p className="py-8 text-center text-sm text-neutral-500">
            Nothing found{debouncedQ ? ` for "${debouncedQ}"` : ""}.
          </p>
        )}

        {/* Events Vertical */}
        {shows("events") &&
          filteredEvents.map((event) => (
            <ExploreCard key={`event-${event.id}`} className="flex-col items-start sm:flex-row sm:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <ExploreThumb
                  src={event.coverImageUrl}
                  alt={event.title}
                  tone={EXPLORE_TONES.event}
                  fallback={<Ticket className="h-6 w-6 text-white/60" aria-hidden />}
                />
                <div className="min-w-0 space-y-1">
                  <h3 className="line-clamp-1 text-sm font-bold text-neutral-900">{event.title}</h3>
                  <p className="line-clamp-1 text-xs text-neutral-500">{event.location}</p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-500" aria-hidden />
                      <span>{eventDate(event.startsAt)} · {eventTime(event.startsAt)}</span>
                    </span>
                    {distanceLabel("EVENT", event.id) && <span>{distanceLabel("EVENT", event.id)}</span>}
                    <span className={cn("rounded px-1.5 text-[10px] font-semibold", EXPLORE_TONES.event.tag)}>Event</span>
                  </div>
                </div>
              </div>

              <Link
                href={`/events/${event.id}`}
                className="w-full rounded-xl bg-primary-600 px-4 py-2.5 text-center text-xs font-semibold text-white shadow-xs transition-colors hover:bg-primary-700 sm:w-auto"
              >
                {event.minPrice > 0 ? `Get Ticket (${priceLabel(event)})` : "Register"}
              </Link>
            </ExploreCard>
          ))}

        {/* Products Vertical */}
        {shows("products") &&
          filteredProducts.map((product) => (
            <ExploreRow
              key={`product-${product.id}`}
              href={`/marketplace/${product.id}`}
              tone={EXPLORE_TONES.product}
              title={product.title}
              tag="Product"
              thumb={
                <ExploreThumb
                  src={product.images[0]}
                  alt={product.title}
                  tone={EXPLORE_TONES.product}
                  fallback={<ShoppingBag className="h-6 w-6 text-neutral-300" aria-hidden />}
                />
              }
              aside={<Distance label={distanceLabel("VENDOR", product.vendorId)} />}
            >
              <p className="text-xs capitalize text-neutral-500">
                {product.condition}
                {product.location ? ` · ${product.location}` : ""}
              </p>
              <p className="text-xs font-extrabold text-neutral-900">₦{product.price.toLocaleString()}</p>
            </ExploreRow>
          ))}

        {/* Services Vertical */}
        {shows("services") &&
          filteredServices.map((service) => (
            <ExploreRow
              key={`service-${service.id}`}
              href={`/services/${service.id}`}
              tone={EXPLORE_TONES.service}
              title={service.name}
              tag="Service"
              thumb={
                <ExploreThumb
                  src={service.imageUrl}
                  alt={service.name}
                  tone={EXPLORE_TONES.service}
                  fallback={<Wrench className="h-6 w-6 text-purple-300" aria-hidden />}
                />
              }
              aside={<Distance label={distanceLabel("SERVICE_PROVIDER", service.providerId)} />}
            >
              <p className="text-xs text-neutral-500">
                {service.durationMinutes ? `${service.durationMinutes} min` : "Campus service"}
              </p>
              <p className="text-xs font-extrabold text-neutral-900">₦{service.price.toLocaleString()}</p>
            </ExploreRow>
          ))}

        {/* Freelance Vertical */}
        {shows("freelance") && freelanceServices.length > 0 && (
          <>
            {freelanceServices.map((service) => (
              <FreelanceServiceRow
                key={`freelance-${service.id}`}
                service={service}
                distance={service.freelancer ? distanceLabel("FREELANCER", service.freelancer.id) : undefined}
              />
            ))}
            <Link
              href={`/freelancers/services${search ? `?q=${encodeURIComponent(search)}` : ""}`}
              className="flex items-center justify-center gap-1 rounded-2xl border border-dashed border-indigo-200 py-3 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
            >
              See all {freelanceTotal} freelancer service{freelanceTotal === 1 ? "" : "s"}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </>
        )}

        {/* Freelancers Vertical (the people) */}
        {shows("freelancers") &&
          filteredFreelancers.map((person) => (
            <ExploreRow
              key={`freelancer-${person.id}`}
              href={`/freelancers/${person.id}`}
              tone={EXPLORE_TONES.freelance}
              title={person.fullName}
              tag="Freelancer"
              thumb={
                <ExploreThumb
                  src={person.avatar}
                  alt=""
                  tone={EXPLORE_TONES.freelance}
                  fallback={<UserRound className="h-6 w-6 text-indigo-300" aria-hidden />}
                />
              }
              aside={<Distance label={distanceLabel("FREELANCER", person.id)} />}
            >
              {person.professionalTitle && <p className="line-clamp-1 text-xs text-neutral-500">{person.professionalTitle}</p>}
              <p className="text-xs font-extrabold text-neutral-900">
                {person.hourlyRate ? `₦${person.hourlyRate.toLocaleString()}/hr` : "Rate on request"}
              </p>
            </ExploreRow>
          ))}

        {/* Jobs Vertical */}
        {shows("jobs") &&
          filteredJobs.map((job) => (
            <ExploreRow
              key={`job-${job.id}`}
              href={`/jobs/${job.id}`}
              tone={EXPLORE_TONES.job}
              title={job.title}
              tag="Job"
              thumb={
                <ExploreThumb
                  src={null}
                  alt=""
                  tone={EXPLORE_TONES.job}
                  fallback={
                    <span className="text-lg font-black text-teal-600" aria-hidden>
                      {job.employer.displayName.charAt(0)}
                    </span>
                  }
                />
              }
            >
              <p className="text-xs text-neutral-500">{job.employer.displayName}</p>
              <p className="text-xs font-bold text-teal-700">
                {job.budgetMax || job.budgetMin
                  ? `₦${Number(job.budgetMax ?? job.budgetMin).toLocaleString()}`
                  : "Budget negotiable"}
              </p>
            </ExploreRow>
          ))}
      </div>
    </PageContainer>
  );
}

function Distance({ label }: { label: string }) {
  return label ? <span className="text-[11px] text-neutral-400">{label}</span> : null;
}

/** Placeholder rows while the first results load, the same shape as the real ones. */
function ResultsSkeleton() {
  return (
    <div role="status" aria-label="Loading results" className="space-y-3.5">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-neutral-200/90 bg-white p-3.5">
          <Skeleton className="h-14 w-14 shrink-0 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
