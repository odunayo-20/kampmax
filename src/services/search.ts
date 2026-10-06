// ============================================================
// UNIFIED GLOBAL SEARCH SERVICE  (Module 31)
// ============================================================
//
// Federated discovery over the live public APIs. There is no unified search
// endpoint yet, so one search asks each vertical's own endpoint in parallel
// and merges the answers, ranking them with a local relevance score. Each
// vertical applies its own visibility rules on the server (live products
// only, open jobs, active services, published posts, upcoming events), so a
// result here is always something that vertical would show on its own page.
//
// Nothing is read from caches or bundled demo data. If one vertical can't be
// reached, the others still show and the page is told which one is missing;
// if all of them fail, the search fails.
//
// SECURITY: result URLs are built only from public slugs/ids (never the
// authenticated user, never a userId query param). All text is escaped by
// React at render time — this module never returns HTML.
//

import {
  SearchEntityType,
  SearchFilterType,
  SearchResultItem,
  SearchSortOption,
  SearchSuggestion,
  SearchPage,
  TrendingSearch,
} from "@/types";
import { fetchProducts } from "@/services/products";
import { fetchVendors } from "@/services/users";
import { fetchCategories } from "@/services/categories";
import { fetchCampuses } from "@/services/campus";
import { listPublicJobs } from "@/services/jobs";
import { listPublicServices, searchProviders } from "@/services/service-marketplace";
import { listEventsApi } from "@/services/event-tickets";
import { listArticles } from "@/services/blog";
import { fetchTaxonomyTree, cachedTaxonomyName } from "@/services/taxonomy";
import { jobToOpportunity } from "@/lib/job-api-mapping";

const RECENT_KEY = "kampmax_recent_searches";
const MAX_RECENT = 10;

/** How many results each vertical contributes to one search. */
const PER_TYPE_LIMIT = 30;
const SUGGESTION_LIMIT = 8;

// ── Helpers ──────────────────────────────────────────────

function scoreMatch(text: string, query: string): number {
  const lower = (text ?? "").toLowerCase();
  const q = query.toLowerCase();
  if (!lower) return 0;
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  if (lower.split(" ").some((w) => w.startsWith(q))) return 60;
  if (lower.includes(q)) return 40;
  return 0;
}

function toTimestamp(value: string | number | undefined | null): number {
  const t = value ? +new Date(value) : Number.NaN;
  return Number.isFinite(t) ? t : 0;
}

/** campus id → short name, from the live campus list (never shows a raw id). */
async function loadCampusNames(): Promise<Map<string, string>> {
  const { data } = await fetchCampuses({ limit: 100 });
  return new Map(data.map((c) => [c.id, c.abbreviation || c.name]));
}

// ── Trending ─────────────────────────────────────────────

// No trending-search endpoint exists yet; never fabricate counts.
const trendingSearches: TrendingSearch[] = [];

export function getTrendingSearches(): TrendingSearch[] {
  return trendingSearches;
}

// ── Recent Searches (local-only; not sent anywhere) ──────

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const recent = getRecentSearches().filter((r) => r !== trimmed);
    recent.unshift(trimmed);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

export function removeRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentSearches().filter((r) => r !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // localStorage unavailable
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // localStorage unavailable
  }
}

// ── Suggestions ──────────────────────────────────────────
// Type-ahead from live results. The backend has no suggestion endpoint, so
// this asks a few verticals for their top matches and dedupes the titles.

export async function getSuggestions(query: string): Promise<SearchSuggestion[]> {
  const q = query.trim();
  if (!q) return [];

  const [products, vendors, categories, services, jobs] = await Promise.allSettled([
    fetchProducts({ search: q, status: "ACTIVE", limit: 5 }),
    fetchVendors({ search: q, limit: 3 }),
    fetchCategories({ search: q, limit: 5 }),
    listPublicServices({ q, limit: 3 }),
    listPublicJobs({ search: q, limit: 3 }),
  ]);

  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();
  const add = (suggestion: SearchSuggestion) => {
    const key = suggestion.text.toLowerCase();
    if (!suggestion.text || seen.has(key)) return;
    seen.add(key);
    suggestions.push(suggestion);
  };

  if (categories.status === "fulfilled" && !categories.value.error) {
    categories.value.data.forEach((c) =>
      add({ text: c.name, type: "entity", entityType: "category", entityId: c.id })
    );
  }
  if (products.status === "fulfilled" && !products.value.error) {
    products.value.data.forEach((p) =>
      add({ text: p.title, type: "entity", entityType: "product", entityId: p.id })
    );
  }
  if (jobs.status === "fulfilled" && !jobs.value.error) {
    jobs.value.jobs.forEach((j) =>
      add({ text: j.title, type: "entity", entityType: "job", entityId: j.id })
    );
  }
  if (services.status === "fulfilled") {
    services.value.forEach((svc) =>
      add({ text: svc.name, type: "entity", entityType: "service", entityId: svc.id })
    );
  }
  if (vendors.status === "fulfilled" && !vendors.value.error) {
    vendors.value.data.forEach((v) =>
      add({ text: v.storeName, type: "entity", entityType: "vendor", entityId: v.id })
    );
  }
  if (products.status === "fulfilled" && !products.value.error) {
    const lower = q.toLowerCase();
    products.value.data.forEach((p) =>
      p.tags?.forEach((tag) => {
        if (tag.toLowerCase().includes(lower)) add({ text: tag, type: "query" });
      })
    );
  }

  return suggestions.slice(0, SUGGESTION_LIMIT);
}

// ── Search ───────────────────────────────────────────────

export interface SearchFiltersInput {
  type?: SearchFilterType;
  sort?: SearchSortOption;
  campusId?: string;
  priceMin?: number;
  priceMax?: number;
  page?: number;
  pageSize?: number;
}

interface Candidate {
  item: SearchResultItem;
  score: number;
  date: number;
  price?: number;
}

/** Real campus ids are UUIDs; anything else can't be sent to the API. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Boosted (sponsored) matches keep their lead in relevance order. */
const SPONSORED_BONUS = 1000;

/** What one vertical found, or why it couldn't be asked. */
type Vertical = { type: SearchEntityType; run: () => Promise<Candidate[]> };

export async function search(query: string, filters: SearchFiltersInput = {}): Promise<SearchPage> {
  const q = (query || "").trim();
  const typeFilter = filters.type || "all";
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(Math.max(filters.pageSize || 12, 1), 30);
  const wants = (type: SearchEntityType) => typeFilter === "all" || typeFilter === type;
  const campusId = filters.campusId && UUID_RE.test(filters.campusId) ? filters.campusId : undefined;

  const empty: SearchPage = {
    query: q,
    items: [],
    total: 0,
    page: 1,
    pageSize,
    totalPages: 1,
    suggestions: [],
  };
  if (!q) return empty;

  // Names for campuses and service categories, so subtitles never show ids.
  const [campusNames] = await Promise.all([
    loadCampusNames().catch(() => new Map<string, string>()),
    wants("service") ? fetchTaxonomyTree("SERVICE").catch(() => []) : Promise.resolve([]),
  ]);
  const campusLabel = (id?: string) => (id ? (campusNames.get(id) ?? "") : "");
  const join = (...parts: Array<string | undefined | null | false>) =>
    parts.filter(Boolean).join(" · ");

  const verticals: Vertical[] = [];

  if (wants("product")) {
    verticals.push({
      type: "product",
      run: async () => {
        const res = await fetchProducts({
          search: q,
          campusId,
          status: "ACTIVE",
          minPrice: filters.priceMin,
          maxPrice: filters.priceMax,
          limit: PER_TYPE_LIMIT,
        });
        if (res.error) throw res.error;
        return res.data.map((p) => ({
          item: {
            id: p.id,
            type: "product" as const,
            title: p.title,
            subtitle: join(p.condition, p.location || campusLabel(p.campusId)),
            description: p.description.slice(0, 120),
            image: p.images[0],
            url: `/marketplace/${p.id}`,
            price: p.price,
            campusId: p.campusId,
            tags: p.tags,
          },
          score:
            scoreMatch(p.title, q) +
            scoreMatch(p.description, q) +
            (p.tags?.reduce((sum, t) => sum + scoreMatch(t, q), 0) || 0) +
            (p.sponsored ? SPONSORED_BONUS : 0),
          date: toTimestamp(p.createdAt),
          price: p.price,
        }));
      },
    });
  }

  if (wants("vendor")) {
    verticals.push({
      type: "vendor",
      run: async () => {
        const res = await fetchVendors({ search: q, campusId, limit: PER_TYPE_LIMIT });
        if (res.error) throw res.error;
        return res.data.map((v) => ({
          item: {
            id: v.id,
            type: "vendor" as const,
            title: v.storeName,
            subtitle: join(v.specialties.join(" · "), campusLabel(v.campusId)),
            description: v.description.slice(0, 120),
            image: v.logo ?? v.coverImage,
            url: v.slug ? `/store/${v.slug}` : `/marketplace?vendor=${v.id}`,
            rating: v.rating > 0 ? v.rating : undefined,
            campusId: v.campusId,
          },
          score: scoreMatch(v.storeName, q) + scoreMatch(v.description, q),
          date: toTimestamp(v.joinDate),
        }));
      },
    });
  }

  if (wants("job")) {
    verticals.push({
      type: "job",
      run: async () => {
        const res = await listPublicJobs({ search: q, campusId, limit: PER_TYPE_LIMIT });
        if (res.error) throw res.error;
        return res.jobs.map(jobToOpportunity).map((o) => ({
          item: {
            id: o.id,
            type: "job" as const,
            title: o.title,
            subtitle: join(o.categoryName ?? "Other", o.employer.name, o.employer.verified && "Verified"),
            description: o.summary.slice(0, 120),
            url: `/jobs/${o.id}`,
            campusId: o.location.campusId,
            tags: o.skills.slice(0, 6),
          },
          score:
            scoreMatch(o.title, q) +
            scoreMatch(o.summary, q) +
            o.skills.slice(0, 6).reduce((sum, t) => sum + scoreMatch(t, q), 0),
          date: toTimestamp(o.postedAt),
        }));
      },
    });
  }

  if (wants("service")) {
    verticals.push({
      type: "service",
      run: async () => {
        const services = await listPublicServices({ q, campusId, limit: PER_TYPE_LIMIT });
        return services
          .map((svc) => {
            const price = svc.pricingModel === "quote" ? undefined : svc.price;
            return {
              item: {
                id: svc.id,
                type: "service" as const,
                title: svc.name,
                subtitle: join(svc.provider?.displayName, cachedTaxonomyName(svc.categoryId) ?? "Service"),
                description: svc.description.slice(0, 120),
                image: svc.imageUrl,
                url: `/services/${svc.id}`,
                price,
                tags: svc.tags,
              },
              score:
                scoreMatch(svc.name, q) +
                scoreMatch(svc.description, q) +
                (svc.tags?.reduce((sum, t) => sum + scoreMatch(t, q), 0) || 0),
              date: toTimestamp(svc.createdAt),
              price,
            };
          })
          .filter(
            (c) =>
              (filters.priceMin === undefined || (c.price ?? 0) >= filters.priceMin) &&
              (filters.priceMax === undefined || (c.price ?? 0) <= filters.priceMax || c.price === undefined)
          );
      },
    });
  }

  if (wants("provider")) {
    verticals.push({
      type: "provider",
      run: async () => {
        const providers = await searchProviders({ q, limit: 20 });
        return providers.map((p) => ({
          item: {
            id: p.id,
            type: "provider" as const,
            title: p.displayName,
            subtitle: "Service provider",
            description: p.bio?.slice(0, 120),
            url: `/services/providers/${p.id}`,
          },
          score: scoreMatch(p.displayName, q) + scoreMatch(p.bio ?? "", q),
          date: 0,
        }));
      },
    });
  }

  if (wants("category")) {
    verticals.push({
      type: "category",
      run: async () => {
        const res = await fetchCategories({ search: q, limit: 20 });
        if (res.error) throw res.error;
        return res.data.map((c) => ({
          item: {
            id: c.id,
            type: "category" as const,
            title: c.name,
            subtitle: "Category",
            url: `/marketplace?category=${c.id}`,
          },
          score: scoreMatch(c.name, q),
          date: 0,
        }));
      },
    });
  }

  if (wants("event")) {
    verticals.push({
      type: "event",
      run: async () => {
        const page = await listEventsApi({ q, campusId, limit: 20 });
        return page.items.map((e) => ({
          item: {
            id: e.id,
            type: "event" as const,
            title: e.title,
            subtitle: join(
              new Date(e.startsAt).toLocaleDateString("en-NG", { day: "numeric", month: "short" }),
              e.location
            ),
            description: e.description.slice(0, 120),
            image: e.coverImageUrl ?? undefined,
            url: `/events/${e.id}`,
            price: e.minPrice > 0 ? e.minPrice : undefined,
            campusId: e.campusId,
          },
          score: scoreMatch(e.title, q) + scoreMatch(e.description, q),
          date: toTimestamp(e.startsAt),
          price: e.minPrice > 0 ? e.minPrice : undefined,
        }));
      },
    });
  }

  if (wants("post")) {
    verticals.push({
      type: "post",
      run: async () => {
        const articles = await listArticles({ q, limit: 10 });
        return articles.items.map((a) => ({
          item: {
            id: a.id,
            type: "post" as const,
            title: a.title,
            subtitle: join(a.category?.name, `${a.readingTimeMinutes} min read`),
            description: a.excerpt?.slice(0, 120),
            image: a.coverImage ?? undefined,
            url: `/blog/${a.slug}`,
          },
          score: scoreMatch(a.title, q) + scoreMatch(a.excerpt ?? "", q),
          date: toTimestamp(a.publishedAt),
        }));
      },
    });
  }

  const settled = await Promise.allSettled(verticals.map((v) => v.run()));
  const candidates: Candidate[] = [];
  const unavailable: SearchEntityType[] = [];
  let firstError: unknown;
  settled.forEach((outcome, i) => {
    if (outcome.status === "fulfilled") candidates.push(...outcome.value);
    else {
      unavailable.push(verticals[i].type);
      firstError ??= outcome.reason;
    }
  });
  // Nothing at all could be asked: that is an error, not "no results".
  if (verticals.length > 0 && unavailable.length === verticals.length) {
    throw firstError instanceof Error ? firstError : new Error("Search is unavailable right now.");
  }

  // The server already matched on text; keep what it matched and rank it.
  let filtered = candidates.filter((c) => c.score > 0 || c.item.type === "category");

  // Price range applies to priced entities only (products, services, events).
  // Unpriced ones (jobs, vendors, categories, posts) drop out when a range is set.
  if (filters.priceMin !== undefined || filters.priceMax !== undefined) {
    filtered = filtered.filter((c) => {
      if (!c.price) return false;
      if (filters.priceMin !== undefined && c.price < filters.priceMin) return false;
      if (filters.priceMax !== undefined && c.price > filters.priceMax) return false;
      return true;
    });
  }

  const items = sortCandidates(filtered, filters.sort || "relevance");

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * pageSize;

  return {
    query: q,
    items: items.slice(start, start + pageSize).map((c) => c.item),
    total,
    page: safePage,
    pageSize,
    totalPages,
    suggestions: [],
    unavailable: unavailable.length ? unavailable : undefined,
  };
}

function sortCandidates(candidates: Candidate[], sort: SearchSortOption): Candidate[] {
  switch (sort) {
    case "recent":
      return [...candidates].sort((a, b) => b.date - a.date);
    case "popular":
      return [...candidates].sort(
        (a, b) =>
          (b.item.rating || 0) - (a.item.rating || 0) ||
          (b.item.ratingCount || 0) - (a.item.ratingCount || 0) ||
          b.date - a.date
      );
    case "price_low":
    case "price_high": {
      const priced = candidates.filter((c) => c.price !== undefined);
      const unpriced = candidates.filter((c) => c.price === undefined);
      priced.sort((a, b) =>
        sort === "price_low"
          ? (a.price as number) - (b.price as number)
          : (b.price as number) - (a.price as number)
      );
      return [...priced, ...unpriced];
    }
    case "relevance":
    default:
      return [...candidates].sort((a, b) => b.score - a.score || b.date - a.date);
  }
}
