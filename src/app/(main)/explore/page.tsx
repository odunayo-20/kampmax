"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  MapPin,
  ArrowRight,
  Store,
  Wrench,
  Briefcase,
  Ticket,
  GraduationCap,
  ChevronRight,
  Star,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useEvents } from "@/hooks/use-events";
import { useDebounce } from "@/hooks/use-debounce";
import { eventDate, eventTime, priceLabel } from "@/components/events/event-format";
import { fetchProducts } from "@/services/products";
import { listPublicJobs } from "@/services/jobs";
import { listPublicServices } from "@/services/service-marketplace";
import { useAuth } from "@/lib/auth-context";
import { useMyLocation } from "@/hooks/use-location";
import { fetchNearby, formatDistance, roundCoordinate } from "@/services/nearby-api";
import { cn } from "@/lib/utils";

type ExploreCategory = "all" | "events" | "products" | "services" | "jobs";

const CATEGORIES: { id: ExploreCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "products", label: "Products" },
  { id: "services", label: "Services" },
  { id: "jobs", label: "Jobs" },
];

type Origin = { latitude: number; longitude: number };

/** Nearby caps the radius at 25 km and a page at 50 results. */
const NEARBY_RADIUS_M = 25_000;
const NEARBY_LIMIT = 50;

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const debouncedQ = useDebounce(searchQuery.trim(), 300);
  const search = debouncedQ || undefined;

  const eventsQuery = useEvents({ q: search, limit: 20 });
  const filteredEvents = eventsQuery.data ?? [];

  const productsQuery = useQuery({
    queryKey: ["explore", "products", search],
    queryFn: async () => {
      const res = await fetchProducts({ search, status: "ACTIVE", limit: 4 });
      if (res.error) throw res.error;
      return res.data;
    },
  });
  const servicesQuery = useQuery({
    queryKey: ["explore", "services", search],
    queryFn: () => listPublicServices({ q: search, limit: 3 }),
  });
  const jobsQuery = useQuery({
    queryKey: ["explore", "jobs", search],
    queryFn: async () => {
      const res = await listPublicJobs({ search, limit: 3 });
      if (res.error) throw res.error;
      return res.jobs;
    },
  });

  const filteredProducts = productsQuery.data ?? [];
  const filteredServices = servicesQuery.data ?? [];
  const filteredJobs = jobsQuery.data ?? [];

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

  const failed = [eventsQuery, productsQuery, servicesQuery, jobsQuery].some((q) => q.isError);
  const loading = [eventsQuery, productsQuery, servicesQuery, jobsQuery].some((q) => q.isLoading);
  const showEvents = selectedCategory === "all" || selectedCategory === "events";
  const showProducts = selectedCategory === "all" || selectedCategory === "products";
  const showServices = selectedCategory === "all" || selectedCategory === "services";
  const showJobs = selectedCategory === "all" || selectedCategory === "jobs";
  const empty =
    !loading &&
    (!showEvents || !filteredEvents.length) &&
    (!showProducts || !filteredProducts.length) &&
    (!showServices || !filteredServices.length) &&
    (!showJobs || !filteredJobs.length);

  return (
    <PageContainer className="space-y-4 pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Explore</h1>
            <p className="text-xs text-neutral-500">
              Browse events, products, services, jobs, courses and more
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
      <div className="space-y-3.5">
        {failed && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Some results could not be loaded. Please try again.
          </p>
        )}
        {loading && <p className="text-xs text-neutral-500">Loading…</p>}
        {empty && !failed && (
          <p className="py-8 text-center text-sm text-neutral-500">
            Nothing found{debouncedQ ? ` for "${debouncedQ}"` : ""}.
          </p>
        )}

        {/* Events Vertical */}
        {showEvents &&
          filteredEvents.map((event) => (
            <div
              key={`event-${event.id}`}
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                  <img
                    src={
                      event.coverImageUrl ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">
                      {event.title}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-1">{event.location}</p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-500" />
                      <span>{eventDate(event.startsAt)} · {eventTime(event.startsAt)}</span>
                    </span>
                    {distanceLabel("EVENT", event.id) && (
                      <span>{distanceLabel("EVENT", event.id)}</span>
                    )}
                    <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 font-semibold text-[10px]">
                      Event
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/events/${event.id}`}
                className="w-full sm:w-auto text-center px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {event.minPrice > 0 ? `Get Ticket (${priceLabel(event)})` : "Register"}
              </Link>
            </div>
          ))}

        {/* Products Vertical */}
        {showProducts &&
          filteredProducts.map((product) => (
            <Link
              key={`product-${product.id}`}
              href={`/marketplace/${product.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-primary-600">
                    {product.title}
                  </h3>
                  <p className="text-xs text-neutral-500 capitalize">
                    {product.condition}
                    {product.location ? ` · ${product.location}` : ""}
                  </p>
                  <p className="text-xs font-extrabold text-neutral-900">
                    ₦{product.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold text-[10px]">
                  Product
                </span>
                {distanceLabel("VENDOR", product.vendorId) && (
                  <span className="text-[11px] text-neutral-400">
                    {distanceLabel("VENDOR", product.vendorId)}
                  </span>
                )}
              </div>
            </Link>
          ))}

        {/* Services Vertical */}
        {showServices &&
          filteredServices.map((service) => (
            <Link
              key={`service-${service.id}`}
              href={`/services/${service.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-purple-50 shrink-0 border border-purple-100">
                  <img
                    src={
                      service.imageUrl ||
                      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-purple-600">
                    {service.name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {service.durationMinutes ? `${service.durationMinutes} min` : "Campus service"}
                  </p>
                  <p className="text-xs font-extrabold text-neutral-900">
                    ₦{service.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold text-[10px]">
                  Service
                </span>
                {distanceLabel("SERVICE_PROVIDER", service.providerId) && (
                  <span className="text-[11px] text-neutral-400">
                    {distanceLabel("SERVICE_PROVIDER", service.providerId)}
                  </span>
                )}
              </div>
            </Link>
          ))}

        {/* Jobs Vertical */}
        {showJobs &&
          filteredJobs.map((job) => (
            <Link
              key={`job-${job.id}`}
              href={`/jobs/${job.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-black text-lg shrink-0">
                  {(job.employer.displayName).charAt(0)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-teal-600">
                      {job.title}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500">
                    {job.employer.displayName}
                  </p>
                  <p className="text-xs font-bold text-teal-700">
                    {job.budgetMax || job.budgetMin
                      ? `₦${Number(job.budgetMax ?? job.budgetMin).toLocaleString()}`
                      : "Budget negotiable"}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold text-[10px]">
                  Job
                </span>
              </div>
            </Link>
          ))}
      </div>
    </PageContainer>
  );
}
