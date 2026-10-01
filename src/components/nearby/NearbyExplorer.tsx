"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { LocateFixed, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MapView, type MapPoint } from "@/components/maps/MapView";
import { LocationPicker } from "@/components/maps/LocationPicker";
import { NearbyFilterDrawer } from "@/components/nearby/NearbyFilterDrawer";
import { NearbyPreview, NearbyResultCard, nearbyKey } from "@/components/nearby/NearbyResultCard";
import { useDebounce } from "@/hooks/use-debounce";
import { useMyLocation } from "@/hooks/use-location";
import { useNearby, useNearbyTypes } from "@/hooks/use-nearby";
import { useCategories } from "@/hooks/use-taxonomy";
import { useApp } from "@/lib/app-context";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { getDevicePosition } from "@/lib/maps/geolocation";
import { DeviceLocationError, type PickedLocation } from "@/lib/maps/types";
import { cn } from "@/lib/utils";
import type { TaxonomyType } from "@/services/taxonomy";
import {
  DATE_PRESET_OPTIONS,
  DEFAULT_RADIUS_METERS,
  RADIUS_OPTIONS,
  SORT_OPTIONS,
  datePresetRange,
  roundCoordinate,
  type NearbyDatePreset,
  type NearbyItem,
  type NearbySort,
} from "@/services/nearby-api";

/** Where the search starts. Never persisted to the profile — Nearby only reads it. */
export interface NearbyOrigin {
  latitude: number;
  longitude: number;
  label: string;
  kind: "device" | "profile" | "manual";
}

const ORIGIN_STORAGE_KEY = "kampmax:nearby-origin";
const SEARCH_DEBOUNCE_MS = 400;
const VALID_RADII = new Set(RADIUS_OPTIONS.map((o) => o.value));
const VALID_DATE_PRESETS = new Set<NearbyDatePreset>(["today", "tomorrow", "week", "weekend"]);
const VALID_SORTS = new Set<NearbySort>(["nearest", "newest", "upcoming"]);

function readStoredOrigin(): NearbyOrigin | null {
  try {
    const raw = sessionStorage.getItem(ORIGIN_STORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw) as Partial<NearbyOrigin>;
    if (typeof o.latitude !== "number" || typeof o.longitude !== "number") return null;
    if (Math.abs(o.latitude) > 90 || Math.abs(o.longitude) > 180) return null;
    return { latitude: o.latitude, longitude: o.longitude, label: String(o.label ?? "Chosen location"), kind: "manual" };
  } catch {
    return null;
  }
}

function storeOrigin(origin: NearbyOrigin) {
  try {
    sessionStorage.setItem(ORIGIN_STORAGE_KEY, JSON.stringify(origin));
  } catch {
    /* storage unavailable — origin simply won't survive a reload */
  }
}

export function NearbyExplorer() {
  const profileLocation = useMyLocation();
  const typesQuery = useNearbyTypes();
  const { campuses } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ── Filters restored from the URL (never coordinates — see storeOrigin). ──
  const urlType = searchParams.get("entityType") ?? "";
  const urlCategory = searchParams.get("category") ?? "";
  const urlRadius = Number(searchParams.get("radius"));
  const urlCampusId = searchParams.get("campus") ?? "";
  const urlDateRaw = searchParams.get("date") ?? "";
  const urlDate = VALID_DATE_PRESETS.has(urlDateRaw as NearbyDatePreset) ? (urlDateRaw as NearbyDatePreset) : "";
  const urlSortRaw = searchParams.get("sort") ?? "";
  const urlSort = VALID_SORTS.has(urlSortRaw as NearbySort) ? (urlSortRaw as NearbySort) : "nearest";
  const urlQuery = searchParams.get("q") ?? "";

  // ── UI state ────────────────────────────────────────────────
  const [chosenOrigin, setChosenOrigin] = useState<NearbyOrigin | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [text, setText] = useState(urlQuery);
  const [type, setType] = useState(urlType);
  const [categoryId, setCategoryId] = useState(urlCategory);
  const [radius, setRadius] = useState(VALID_RADII.has(urlRadius) ? urlRadius : DEFAULT_RADIUS_METERS);
  const [campusFilterId, setCampusFilterId] = useState(urlCampusId);
  const [datePreset, setDatePreset] = useState<NearbyDatePreset | "">(urlDate);
  const [sort, setSort] = useState<NearbySort>(urlSort);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<"list" | "map">("list");
  const [viewportBounds, setViewportBounds] = useState<string | null>(null);
  const [activeViewportSearch, setActiveViewportSearch] = useState<string | null>(null);
  const selectionFromMap = useRef(false);

  // Last manually/device-chosen origin survives a reload (session only).
  useEffect(() => {
    const stored = readStoredOrigin();
    if (stored) setChosenOrigin((current) => current ?? stored);
  }, []);

  // Fallback order: explicit choice → saved profile location → nothing (never fabricated).
  const profile = profileLocation.data;
  const origin: NearbyOrigin | null = useMemo(() => {
    if (chosenOrigin) return chosenOrigin;
    if (profile) {
      return {
        latitude: profile.latitude,
        longitude: profile.longitude,
        label: profile.formattedAddress || profile.city || "Saved location",
        kind: "profile",
      };
    }
    return null;
  }, [chosenOrigin, profile]);

  const debouncedText = useDebounce(text.trim(), SEARCH_DEBOUNCE_MS);
  const searchText = debouncedText.length >= 2 ? debouncedText : "";

  // ── URL sync: search/entityType/category/radius/campus/date/sort only, never the origin. ──
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const set = (key: string, value: string | null) => {
      if (value) params.set(key, value);
      else params.delete(key);
    };
    set("q", searchText || null);
    set("entityType", type || null);
    set("category", categoryId || null);
    set("radius", radius !== DEFAULT_RADIUS_METERS ? String(radius) : null);
    set("campus", campusFilterId || null);
    set("date", datePreset || null);
    set("sort", sort !== "nearest" ? sort : null);
    const qs = params.toString();
    if (qs !== searchParams.toString()) {
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText, type, categoryId, radius, campusFilterId, datePreset, sort]);

  const activeType = useMemo(() => (typesQuery.data ?? []).find((t) => t.type === type) ?? null, [typesQuery.data, type]);
  const activeTaxonomy = (activeType?.categoryTaxonomy as TaxonomyType | null) ?? null;
  const activeHasSchedule = activeType?.hasSchedule ?? false;

  // Category/date/"upcoming" sort only make sense for the currently selected
  // single type. Wait for types to load before clearing, so a filter restored
  // from the URL isn't dropped before its type's capabilities are known.
  useEffect(() => {
    if (!typesQuery.data) return;
    if (!activeTaxonomy && categoryId) setCategoryId("");
    if (!activeHasSchedule && datePreset) setDatePreset("");
    if (!activeHasSchedule && sort === "upcoming") setSort("nearest");
  }, [typesQuery.data, activeTaxonomy, categoryId, activeHasSchedule, datePreset, sort]);

  const campusScopeActive = !!campusFilterId;
  // Computed once per preset (not every render): "today"/"week" pin `dateFrom` to
  // the instant the preset was chosen, so it doesn't drift — and re-render —
  // every millisecond.
  const dateRange = useMemo(
    () => (activeHasSchedule && datePreset ? datePresetRange(datePreset) : null),
    [activeHasSchedule, datePreset],
  );
  const effectiveSort: NearbySort = activeHasSchedule ? sort : sort === "upcoming" ? "nearest" : sort;
  const handleBoundsChange = useCallback(
    (b: { minLat: number; maxLat: number; minLng: number; maxLng: number }) => {
      const formatted = `${roundCoordinate(b.minLng)},${roundCoordinate(b.minLat)},${roundCoordinate(b.maxLng)},${roundCoordinate(b.maxLat)}`;
      setViewportBounds(formatted);
    },
    [],
  );

  const params = useMemo(
    () =>
      origin
        ? {
            latitude: roundCoordinate(origin.latitude),
            longitude: roundCoordinate(origin.longitude),
            radiusMeters: radius,
            bounds: activeViewportSearch || undefined,
            entityType: type || undefined,
            categoryId: activeTaxonomy && categoryId ? categoryId : undefined,
            campusId: campusScopeActive ? campusFilterId : undefined,
            campusScope: campusScopeActive ? ("WITHIN" as const) : undefined,
            dateFrom: dateRange?.dateFrom,
            dateTo: dateRange?.dateTo,
            sort: effectiveSort !== "nearest" ? effectiveSort : undefined,
            q: searchText || undefined,
          }
        : null,
    [
      origin,
      radius,
      activeViewportSearch,
      type,
      activeTaxonomy,
      categoryId,
      campusScopeActive,
      campusFilterId,
      dateRange,
      effectiveSort,
      searchText,
    ],
  );
  const nearby = useNearby(params);

  const items: NearbyItem[] = useMemo(() => nearby.data?.pages.flatMap((p) => p.items) ?? [], [nearby.data]);
  const total = nearby.data?.pages[nearby.data.pages.length - 1]?.meta?.total;
  const typeLabels = useMemo(() => new Map((typesQuery.data ?? []).map((t) => [t.type, t.label])), [typesQuery.data]);
  const labelFor = useCallback(
    (t: string) => (typeLabels.get(t) ?? t.replace(/_/g, " ").toLowerCase()).replace(/^\w/, (c) => c.toUpperCase()),
    [typeLabels],
  );
  const singular = useCallback((t: string) => labelFor(t).replace(/s$/, ""), [labelFor]);

  const points: MapPoint[] = useMemo(
    () =>
      items.map((i) => ({
        id: nearbyKey(i),
        latitude: i.location.latitude,
        longitude: i.location.longitude,
        kind: i.entityType,
      })),
    [items],
  );
  const selected = items.find((i) => nearbyKey(i) === selectedKey) ?? null;
  const fitKey = origin
    ? `${origin.latitude},${origin.longitude}|${radius}|${type}|${categoryId}|${campusFilterId}|${datePreset}|${effectiveSort}|${searchText}|${activeViewportSearch ?? ""}`
    : undefined;
  const originMarker = useMemo(() => (origin ? { latitude: origin.latitude, longitude: origin.longitude } : null), [origin]);

  // A new search context clears the selection.
  useEffect(() => setSelectedKey(null), [fitKey]);

  // Map → list: bring the chosen result into view.
  useEffect(() => {
    if (!selectedKey || !selectionFromMap.current) return;
    selectionFromMap.current = false;
    document.getElementById(`nearby-item-${selectedKey}`)?.scrollIntoView({ block: "nearest" });
  }, [selectedKey]);

  const selectFromList = useCallback((key: string) => {
    selectionFromMap.current = false;
    setSelectedKey(key);
    // On small screens the list hides the map, so show it.
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches) setMobileView("map");
  }, []);
  const selectFromMap = useCallback((key: string) => {
    selectionFromMap.current = true;
    setSelectedKey(key);
  }, []);

  // ── Origin actions ──────────────────────────────────────────
  async function useDeviceLocation() {
    setLocationError(null);
    setLocating(true);
    try {
      const pos = await getDevicePosition();
      const next: NearbyOrigin = { latitude: pos.latitude, longitude: pos.longitude, label: "Current location", kind: "device" };
      setChosenOrigin(next);
      storeOrigin(next);
      setPickerOpen(false);
    } catch (e) {
      setLocationError(e instanceof DeviceLocationError ? e.message : "Couldn't get your location. Choose a location instead.");
    } finally {
      setLocating(false);
    }
  }

  function useChosenLocation(loc: PickedLocation) {
    const next: NearbyOrigin = {
      latitude: loc.latitude,
      longitude: loc.longitude,
      label: loc.formattedAddress || [loc.city, loc.state].filter(Boolean).join(", ") || "Chosen location",
      kind: "manual",
    };
    setChosenOrigin(next);
    storeOrigin(next);
    setPickerOpen(false);
    setLocationError(null);
  }

  function clearMoreFilters() {
    setCategoryId("");
    setCampusFilterId("");
    setDatePreset("");
    setSort("nearest");
  }

  function clearAllFilters() {
    setType("");
    setText("");
    setRadius(DEFAULT_RADIUS_METERS);
    setActiveViewportSearch(null);
    clearMoreFilters();
  }

  const moreFiltersCount =
    (activeTaxonomy && categoryId ? 1 : 0) +
    (campusScopeActive ? 1 : 0) +
    (activeHasSchedule && datePreset ? 1 : 0) +
    (effectiveSort !== "nearest" ? 1 : 0);
  const hasAnyFilter =
    !!type ||
    !!searchText ||
    radius !== DEFAULT_RADIUS_METERS ||
    !!activeViewportSearch ||
    moreFiltersCount > 0;
  const radiusLabel = RADIUS_OPTIONS.find((o) => o.value === radius)?.label ?? `${radius / 1000} km`;
  const categoryName = useCategories(activeTaxonomy ?? "PRODUCT", !!(activeTaxonomy && categoryId)).nameById.get(categoryId);
  const campusName = campuses.find((c) => c.id === campusFilterId)?.name;

  // One removable chip per active filter, for at-a-glance review (module 9 §27).
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = [];
    if (type) chips.push({ key: "type", label: labelFor(type), onRemove: () => setType("") });
    if (searchText) chips.push({ key: "q", label: `"${searchText}"`, onRemove: () => setText("") });
    if (radius !== DEFAULT_RADIUS_METERS) {
      chips.push({ key: "radius", label: radiusLabel, onRemove: () => setRadius(DEFAULT_RADIUS_METERS) });
    }
    if (activeViewportSearch) {
      chips.push({
        key: "viewport",
        label: "Map area",
        onRemove: () => setActiveViewportSearch(null),
      });
    }
    if (activeTaxonomy && categoryId) {
      chips.push({ key: "category", label: categoryName ?? "Category", onRemove: () => setCategoryId("") });
    }
    if (campusScopeActive) {
      chips.push({ key: "campus", label: campusName ?? "Campus", onRemove: () => setCampusFilterId("") });
    }
    if (activeHasSchedule && datePreset) {
      chips.push({
        key: "date",
        label: DATE_PRESET_OPTIONS.find((o) => o.value === datePreset)?.label ?? datePreset,
        onRemove: () => setDatePreset(""),
      });
    }
    if (effectiveSort !== "nearest") {
      chips.push({
        key: "sort",
        label: `Sort: ${SORT_OPTIONS.find((o) => o.value === effectiveSort)?.label ?? effectiveSort}`,
        onRemove: () => setSort("nearest"),
      });
    }
    return chips;
    // radiusLabel depends only on radius; listing every primitive is noisier than useful here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    type,
    searchText,
    radius,
    activeViewportSearch,
    activeTaxonomy,
    categoryId,
    categoryName,
    campusScopeActive,
    campusName,
    activeHasSchedule,
    datePreset,
    effectiveSort,
    labelFor,
  ]);

  const nextRadius = RADIUS_OPTIONS.find((o) => o.value > radius);
  const isInitialLoading = !!origin && nearby.isPending;
  const hasError = nearby.isError && !nearby.isFetching;
  const showEmpty = !!origin && !nearby.isPending && !nearby.isError && items.length === 0;

  // ── Render ──────────────────────────────────────────────────
  const originBar = (
    <div className="flex flex-wrap items-center gap-2">
      <p className="min-w-0 flex-1 text-sm text-neutral-600" aria-live="polite">
        {origin ? (
          <>
            <span className="text-neutral-500">Searching around </span>
            <span className="font-medium text-neutral-900">{origin.label}</span>
          </>
        ) : (
          "Choose where to look."
        )}
      </p>
      <Button type="button" size="sm" variant="outline" onClick={useDeviceLocation} disabled={locating}>
        <LocateFixed className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        {locating ? "Locating…" : "Use my location"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setPickerOpen((v) => !v)} aria-expanded={pickerOpen}>
        {origin ? "Change location" : "Choose location"}
      </Button>
    </div>
  );

  return (
    <div className="mx-auto max-w-[1280px] space-y-3 px-4 py-4 lg:px-6 lg:py-6">
      <header>
        <h1 className="text-xl font-bold text-neutral-900">Nearby</h1>
        <p className="text-sm text-neutral-500">Vendors, freelancers, services and events on Kampmax close to you.</p>
      </header>

      {originBar}
      {locationError && (
        <p role="alert" className="text-sm text-error-600">
          {locationError}
        </p>
      )}
      {pickerOpen && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-xs text-neutral-500">This only changes where you search from. It doesn&apos;t change your saved location.</p>
          <LocationPicker onConfirm={useChosenLocation} confirmLabel="Use this location" initial={null} />
        </div>
      )}

      {origin && (
        <div className="space-y-2">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input
                aria-label="Search Kampmax nearby"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Search vendors, services, events…"
                leftIcon={<Search className="h-4 w-4" aria-hidden />}
                maxLength={100}
                autoComplete="off"
              />
            </div>
            <div className="sm:w-36">
              <Select aria-label="Distance" value={String(radius)} onChange={(e) => setRadius(Number(e.target.value))}>
                {RADIUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    Within {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <Button
              type="button"
              variant="outline"
              className="relative shrink-0"
              onClick={() => setFilterDrawerOpen(true)}
              aria-haspopup="dialog"
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" aria-hidden />
              Filters
              {moreFiltersCount > 0 && (
                <span className="ml-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary-600 text-xs text-white">
                  {moreFiltersCount}
                </span>
              )}
            </Button>
          </div>
          <div role="group" aria-label="Filter by type" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:px-0">
            {[{ type: "", label: "All", categoryTaxonomy: null }, ...(typesQuery.data ?? [])].map((t) => (
              <button
                key={t.type || "all"}
                type="button"
                aria-pressed={type === t.type}
                onClick={() => setType(t.type)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
                  type === t.type ? "border-primary-600 bg-primary-600 text-white" : "border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-50",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {activeFilters.length > 0 && (
            <div role="group" aria-label="Active filters" className="flex flex-wrap items-center gap-1.5">
              {activeFilters.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={f.onRemove}
                  className="flex h-7 items-center gap-1 rounded-full bg-neutral-100 pl-2.5 pr-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200"
                >
                  {f.label}
                  <X className="h-3 w-3" aria-hidden />
                  <span className="sr-only">Remove {f.label} filter</span>
                </button>
              ))}
              <button type="button" onClick={clearAllFilters} className="h-7 px-1.5 text-xs font-semibold text-primary-600 hover:underline">
                Clear all
              </button>
            </div>
          )}
        </div>
      )}

      <NearbyFilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        categoryTaxonomy={activeTaxonomy}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        campuses={campuses}
        campusId={campusFilterId}
        onCampusIdChange={setCampusFilterId}
        hasSchedule={activeHasSchedule}
        datePreset={datePreset}
        onDatePresetChange={setDatePreset}
        sort={effectiveSort}
        onSortChange={setSort}
        activeCount={moreFiltersCount}
        onClear={clearMoreFilters}
      />

      {!origin ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-8 text-center">
          <p className="text-sm font-medium text-neutral-900">Set your location to see what&apos;s nearby</p>
          <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
            Use your current location, or pick a place. We only ask for your device location when you choose to.
          </p>
        </div>
      ) : (
        <>
          <div className="lg:hidden" role="tablist" aria-label="Nearby view">
            {(["list", "map"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={mobileView === v}
                onClick={() => setMobileView(v)}
                className={cn(
                  "h-10 w-1/2 border-b-2 text-sm font-medium",
                  mobileView === v ? "border-primary-600 text-primary-700" : "border-neutral-200 text-neutral-500",
                )}
              >
                {v === "list" ? "List" : "Map"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            {/* Results */}
            <section aria-label="Nearby results" className={cn("min-w-0", mobileView === "map" && "hidden lg:block")}>
              <p className="mb-2 text-xs text-neutral-500" role="status" aria-live="polite">
                {isInitialLoading
                  ? "Finding places…"
                  : hasError
                    ? ""
                    : `${total ?? items.length} ${(total ?? items.length) === 1 ? "place" : "places"} within ${radiusLabel}`}
              </p>

              {isInitialLoading ? (
                <ul className="space-y-2" aria-hidden>
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="h-[64px] animate-pulse rounded-lg bg-neutral-100" />
                  ))}
                </ul>
              ) : hasError ? (
                <div role="alert" className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
                  <p className="text-sm text-neutral-900">{getFriendlyErrorMessage(nearby.error)}</p>
                  <button type="button" onClick={() => nearby.refetch()} className="mt-2 text-sm font-medium text-primary-600">
                    Try again
                  </button>
                </div>
              ) : showEmpty ? (
                <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center">
                  <p className="text-sm font-medium text-neutral-900">
                    {activeHasSchedule ? "No upcoming events found here" : "No Kampmax places found here"}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {searchText
                      ? `Nothing on Kampmax matches "${searchText}" within ${radiusLabel} of this location.`
                      : activeHasSchedule
                        ? `No events match the selected criteria within ${radiusLabel} of this location.`
                        : `Nothing on Kampmax matches within ${radiusLabel} of this location${hasAnyFilter ? " with these filters" : ""}.`}
                  </p>
                  <div className="mt-3 flex flex-wrap justify-center gap-2">
                    {nextRadius && (
                      <Button type="button" size="sm" variant="secondary" onClick={() => setRadius(nextRadius.value)}>
                        Search within {nextRadius.label}
                      </Button>
                    )}
                    {hasAnyFilter && (
                      <Button type="button" size="sm" variant="outline" onClick={clearAllFilters}>
                        Clear filters
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" onClick={() => setPickerOpen(true)}>
                      Change location
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <ul className={cn("space-y-2 lg:max-h-[calc(100vh-19rem)] lg:overflow-y-auto lg:pr-1", nearby.isFetching && !nearby.isFetchingNextPage && "opacity-70")}>
                    {items.map((item) => (
                      <NearbyResultCard
                        key={nearbyKey(item)}
                        item={item}
                        typeLabel={singular(item.entityType)}
                        selected={nearbyKey(item) === selectedKey}
                        onSelect={selectFromList}
                      />
                    ))}
                  </ul>
                  {nearby.hasNextPage && (
                    <Button
                      type="button"
                      variant="outline"
                      className="mt-3 w-full"
                      onClick={() => nearby.fetchNextPage()}
                      disabled={nearby.isFetchingNextPage}
                    >
                      {nearby.isFetchingNextPage ? "Loading…" : "Show more"}
                    </Button>
                  )}
                </>
              )}
            </section>

            {/* Map + preview */}
            <section aria-label="Map" className={cn("relative min-w-0 space-y-3", mobileView === "list" && "hidden lg:block")}>
              <div className="relative">
                {viewportBounds && viewportBounds !== activeViewportSearch && (
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      className="shadow-md bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-200 text-xs h-8 px-3"
                      onClick={() => setActiveViewportSearch(viewportBounds)}
                    >
                      <Search className="mr-1.5 h-3.5 w-3.5 text-neutral-500" aria-hidden />
                      Search this area
                    </Button>
                  </div>
                )}
                <MapView
                  className="h-[55vh] min-h-[320px] lg:sticky lg:top-4 lg:h-[calc(100vh-19rem)]"
                  ariaLabel="Map of nearby places. The results list has the same information."
                  marker={originMarker}
                  points={points}
                  selectedPointId={selectedKey}
                  onPointSelect={selectFromMap}
                  onBoundsChange={handleBoundsChange}
                  fitKey={fitKey}
                />
              </div>
              {selected && (
                <NearbyPreview item={selected} typeLabel={singular(selected.entityType)} onClose={() => setSelectedKey(null)} />
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
