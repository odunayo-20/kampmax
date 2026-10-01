import { apiClient, type ApiError } from "@/lib/api-client";

// ============================================================
// NEARBY — LIVE API
// ============================================================
//   GET /nearby         eligible, discoverable Kampmax entities near a point
//   GET /nearby/types   entity types that can appear in Nearby
// The backend owns eligibility, privacy and distance. This client only
// forwards the origin and filters and renders what comes back.

export interface NearbyItem {
  entityType: string;
  entityId: string;
  title: string;
  subtitle: string | null;
  image: string | null;
  /** In-app path to the entity's own page. */
  detailPath: string;
  campusId: string | null;
  /** Category from the entity's own taxonomy, when it has one. */
  category: { id: string; name: string } | null;
  /** Only present for types with a schedule (currently events). ISO 8601. */
  schedule: { startsAt: string; endsAt: string | null } | null;
  /** Canonical distance from the search origin, computed by the backend. */
  distanceMeters: number;
  /** Public (reduced-precision) location. Never the exact stored coordinates. */
  location: { latitude: number; longitude: number; precision: "APPROXIMATE" | "DISCOVERABLE" };
}

export interface NearbyPage {
  items: NearbyItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  radiusMeters: number;
}

export interface NearbyType {
  type: string;
  label: string;
  /** Taxonomy whose categories can filter this type (see services/taxonomy), or null. */
  categoryTaxonomy: string | null;
  /** Whether this type has a schedule (date filters, "upcoming" sort) — currently events only. */
  hasSchedule: boolean;
}

/** Only entities located AT ("WITHIN") or explicitly NOT at ("OUTSIDE") `campusId`. */
export type NearbyCampusScope = "WITHIN" | "OUTSIDE";

/** Kept in sync with the backend's NearbySort. Only offer a sort that makes sense for the active filters. */
export type NearbySort = "nearest" | "newest" | "upcoming";
export const SORT_OPTIONS: { value: NearbySort; label: string }[] = [
  { value: "nearest", label: "Nearest" },
  { value: "newest", label: "Newest" },
  { value: "upcoming", label: "Upcoming" },
];

export interface NearbyParams {
  latitude: number;
  longitude: number;
  radiusMeters: number;
  /** Optional viewport bounding box (minLng,minLat,maxLng,maxLat) */
  bounds?: string;
  /** Single type filter; omit for all types. */
  entityType?: string;
  /** Category id (includes its direct subcategories); only meaningful with a taxonomy-bearing entityType. */
  categoryId?: string;
  campusId?: string;
  campusScope?: NearbyCampusScope;
  /** ISO 8601. Only matches types with a schedule (events) — see hasSchedule. */
  dateFrom?: string;
  dateTo?: string;
  sort?: NearbySort;
  q?: string;
  page?: number;
  limit?: number;
}

/** Selectable radii. The backend enforces the real limits (100 m – 25 km). */
export const RADIUS_OPTIONS: { value: number; label: string }[] = [
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 10000, label: "10 km" },
];
export const DEFAULT_RADIUS_METERS = 5000;
export const NEARBY_PAGE_SIZE = 20;

/** Origin is rounded to ~11 m before it leaves the device: enough for ranking, and it keeps precise positions out of URLs and logs. */
export const roundCoordinate = (v: number) => Math.round(v * 1e4) / 1e4;

export function buildNearbyQuery(p: NearbyParams): string {
  const qs = new URLSearchParams({
    latitude: String(roundCoordinate(p.latitude)),
    longitude: String(roundCoordinate(p.longitude)),
    radiusMeters: String(p.radiusMeters),
    page: String(p.page ?? 1),
    limit: String(p.limit ?? NEARBY_PAGE_SIZE),
  });
  if (p.bounds) qs.set("bounds", p.bounds);
  if (p.entityType) qs.set("entityTypes", p.entityType);
  if (p.categoryId) qs.set("categoryId", p.categoryId);
  if (p.campusId) {
    qs.set("campusId", p.campusId);
    if (p.campusScope) qs.set("campusScope", p.campusScope);
  }
  if (p.dateFrom) qs.set("dateFrom", p.dateFrom);
  if (p.dateTo) qs.set("dateTo", p.dateTo);
  if (p.sort && p.sort !== "nearest") qs.set("sort", p.sort);
  const q = p.q?.trim();
  if (q) qs.set("q", q.slice(0, 100));
  return qs.toString();
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

/** Defensive: a detail path must be a same-site path. */
export function isSafeDetailPath(path: unknown): path is string {
  return typeof path === "string" && path.startsWith("/") && !path.startsWith("//");
}

export async function fetchNearby(params: NearbyParams, signal?: AbortSignal): Promise<NearbyPage> {
  const page = await unwrap(apiClient.get<NearbyPage>(`/nearby?${buildNearbyQuery(params)}`, { signal }));
  return { ...page, items: (page.items ?? []).filter((i) => isSafeDetailPath(i.detailPath)) };
}

export async function fetchNearbyTypes(): Promise<NearbyType[]> {
  return (await unwrap(apiClient.get<NearbyType[]>("/nearby/types"))) ?? [];
}

/** "250 m away", "1.2 km away". Display only — the value itself comes from the backend. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return "";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m away`;
  return `${(meters / 1000).toFixed(1)} km away`;
}

// ============================================================
// EVENT DATE PRESETS
// ============================================================
// The only date arithmetic in Nearby lives here: local calendar boundaries
// are computed once, on the device, and sent to the backend as absolute UTC
// instants (`Date#toISOString`). The backend does a plain timestamptz
// comparison against that instant — no second, independent date calculation.

export type NearbyDatePreset = "today" | "tomorrow" | "week" | "weekend";
export const DATE_PRESET_OPTIONS: { value: NearbyDatePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This week" },
  { value: "weekend", label: "This weekend" },
];

const startOfLocalDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
};

/** `{ dateFrom, dateTo }` (ISO, UTC) for a preset, in the viewer's own timezone. */
export function datePresetRange(preset: NearbyDatePreset, now: Date = new Date()): { dateFrom: string; dateTo: string } {
  const startOfToday = startOfLocalDay(now);
  switch (preset) {
    case "today":
      return { dateFrom: now.toISOString(), dateTo: addDays(startOfToday, 1).toISOString() };
    case "tomorrow":
      return { dateFrom: addDays(startOfToday, 1).toISOString(), dateTo: addDays(startOfToday, 2).toISOString() };
    case "week":
      return { dateFrom: now.toISOString(), dateTo: addDays(startOfToday, 7).toISOString() };
    case "weekend": {
      const day = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekendNow = day === 0 || day === 6;
      const weekendStart = isWeekendNow ? startOfToday : addDays(startOfToday, 6 - day);
      const weekendEnd = addDays(weekendStart, day === 0 ? 1 : 2); // Sunday: rest of today+; else Sat 00:00 -> Mon 00:00
      return { dateFrom: isWeekendNow ? now.toISOString() : weekendStart.toISOString(), dateTo: weekendEnd.toISOString() };
    }
  }
}
