// ============================================================
// UNIFIED GLOBAL SEARCH SERVICE  (Module 31)
// ============================================================
//
// Federated discovery over the canonical mock stores. This module is the
// client-side projection of a future NestJS `GET /search` endpoint — it
// does NOT create new stores or duplicate the vertical search systems;
// every entity is sourced from the SAME store the owning module reads,
// and applies the SAME visibility rules that module enforces:
//
//   - products  → only `status === "available"`  (matches the marketplace list)
//   - jobs      → only `OPPORTUNITY_STATUS.OPEN` (matches Find Work / Jobs)
//   - services  → only `isActive` services whose provider exists (matches /services)
//   - providers → only providers with ≥1 active service (no empty providers)
//   - vendors/categories/posts/events → their public store as-is
//
// SECURITY: result URLs are built only from public slugs/ids (never the
// authenticated user, never a userId query param). All text is escaped by
// React at render time — this module never returns HTML. Counts are real
// store counts; there are no fabricated totals.
//
// The real backend gap is documented in MODULE-31-REPORT.md: the current
// backend exposes per-vertical search (jobs, services) but no unified
// search index; suggestions and relevance ranking are local heuristics
// until a real search API exists.

import {
  SearchFilterType,
  SearchResultItem,
  SearchSortOption,
  SearchSuggestion,
  SearchPage,
  TrendingSearch,
} from "@/types";
import { getProducts } from "@/services/products";
import { getVendors } from "@/services/users";
import { getCategories } from "@/services/categories";
import { getAllOpportunities } from "@/data/opportunity";
import {
  marketplaceServices,
  marketplaceServiceProviders,
} from "@/data/service-marketplace";
import { OPPORTUNITY_STATUS } from "@/types/opportunity";
import { getServiceCategoryName } from "@/services/service-marketplace";
import { getCampusById } from "@/services/campus";

const RECENT_KEY = "kampmax_recent_searches";
const MAX_RECENT = 10;

// ── Helpers ──────────────────────────────────────────────

function matchesQuery(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

function scoreMatch(text: string, query: string): number {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower === q) return 100;
  if (lower.startsWith(q)) return 80;
  if (lower.split(" ").some((w) => w.startsWith(q))) return 60;
  if (lower.includes(q)) return 40;
  return 0;
}

function campusLabel(campusId?: string): string {
  if (!campusId) return "";
  return getCampusById(campusId)?.abbreviation ?? campusId.toUpperCase();
}

function providerMatchesCampus(
  provider: { primaryCampusId: string; additionalCampusIds: string[] },
  campusId: string
): boolean {
  return (
    provider.primaryCampusId === campusId ||
    provider.additionalCampusIds.includes(campusId)
  );
}

function toTimestamp(value: string | number | undefined): number {
  const t = value ? +new Date(value) : Number.NaN;
  return Number.isFinite(t) ? t : 0;
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
// Local heuristic type-ahead over the same public stores. The real backend
// has no suggestion API yet — documented in MODULE-31-REPORT.md.

function providersById(): Record<string, (typeof marketplaceServiceProviders)[number]> {
  return Object.fromEntries(marketplaceServiceProviders.map((p) => [p.id, p]));
}

export function getSuggestions(query: string): SearchSuggestion[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  const suggestions: SearchSuggestion[] = [];
  const seen = new Set<string>();

  for (const cat of getCategories()) {
    if (matchesQuery(cat.name, q) && !seen.has(cat.name)) {
      seen.add(cat.name);
      suggestions.push({ text: cat.name, type: "entity", entityType: "category", entityId: cat.id });
    }
  }

  for (const p of getProducts()) {
    if (p.status === "available" && matchesQuery(p.title, q) && !seen.has(p.title)) {
      seen.add(p.title);
      suggestions.push({ text: p.title, type: "entity", entityType: "product", entityId: p.id });
    }
  }

  for (const o of getAllOpportunities()) {
    if (o.status === OPPORTUNITY_STATUS.OPEN && matchesQuery(o.title, q) && !seen.has(o.title)) {
      seen.add(o.title);
      suggestions.push({ text: o.title, type: "entity", entityType: "job", entityId: o.id });
    }
  }

  const providers = providersById();
  for (const s of marketplaceServices) {
    if (s.isActive && providers[s.providerId] && matchesQuery(s.name, q) && !seen.has(s.name)) {
      seen.add(s.name);
      suggestions.push({ text: s.name, type: "entity", entityType: "service", entityId: s.id });
    }
  }

  for (const p of marketplaceServiceProviders) {
    if (matchesQuery(p.displayName, q) && !seen.has(p.displayName)) {
      seen.add(p.displayName);
      suggestions.push({ text: p.displayName, type: "entity", entityType: "provider", entityId: p.id });
    }
  }

  for (const v of getVendors()) {
    if (matchesQuery(v.storeName, q) && !seen.has(v.storeName)) {
      seen.add(v.storeName);
      suggestions.push({ text: v.storeName, type: "entity", entityType: "vendor", entityId: v.id });
    }
  }

  for (const p of getProducts()) {
    if (p.status === "available" && p.tags) {
      for (const tag of p.tags) {
        if (matchesQuery(tag, q) && !seen.has(tag)) {
          seen.add(tag);
          suggestions.push({ text: tag, type: "query" });
        }
      }
    }
  }

  return suggestions.slice(0, 8);
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

const PUBLIC_PRODUCT_STATUS = "available";

export function search(query: string, filters: SearchFiltersInput = {}): SearchPage {
  const q = (query || "").trim();
  const typeFilter = filters.type || "all";
  const page = Math.max(1, filters.page || 1);
  const pageSize = Math.min(Math.max(filters.pageSize || 12, 1), 30);

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

  const candidates: Candidate[] = [];
  const providers = providersById();

  // Products — available only (mirrors the marketplace list).
  if (typeFilter === "all" || typeFilter === "product") {
    for (const p of getProducts()) {
      if (p.status !== PUBLIC_PRODUCT_STATUS) continue;
      if (filters.campusId && p.campusId !== filters.campusId) continue;
      const score =
        scoreMatch(p.title, q) +
        scoreMatch(p.description, q) +
        (p.tags?.reduce((s, t) => s + scoreMatch(t, q), 0) || 0);
      if (score <= 0) continue;
      candidates.push({
        item: {
          id: p.id,
          type: "product",
          title: p.title,
          subtitle: `${p.condition} · ${p.location || campusLabel(p.campusId)}`,
          description: p.description.slice(0, 120),
          image: p.images[0],
          url: `/marketplace/${p.id}`,
          rating: p.rating,
          ratingCount: p.ratingCount,
          price: p.price,
          campusId: p.campusId,
          tags: p.tags,
        },
        score,
        date: toTimestamp(p.createdAt),
        price: p.price,
      });
    }
  }

  // Vendors (public storefront records).
  if (typeFilter === "all" || typeFilter === "vendor") {
    for (const v of getVendors()) {
      if (filters.campusId && v.campusId !== filters.campusId) continue;
      const score = scoreMatch(v.storeName, q) + scoreMatch(v.description, q);
      if (score <= 0) continue;
      candidates.push({
        item: {
          id: v.id,
          type: "vendor",
          title: v.storeName,
          subtitle: `${v.specialties.join(" · ")} · ${campusLabel(v.campusId)}`,
          description: v.description.slice(0, 120),
          image: v.coverImage,
          url: v.slug ? `/store/${v.slug}` : `/marketplace?vendor=${v.id}`,
          rating: v.rating,
          ratingCount: undefined,
          campusId: v.campusId,
        },
        score,
        date: v.joinDate ? toTimestamp(v.joinDate) : 0,
      });
    }
  }

  // Jobs — OPEN only (mirrors Find Work / Jobs discovery).
  if (typeFilter === "all" || typeFilter === "job") {
    for (const o of getAllOpportunities()) {
      if (o.status !== OPPORTUNITY_STATUS.OPEN) continue;
      const skillScore = o.skills.slice(0, 6).reduce((s, t) => s + scoreMatch(t, q), 0);
      const score = scoreMatch(o.title, q) + scoreMatch(o.summary, q) + skillScore;
      if (score <= 0) continue;
      candidates.push({
        item: {
          id: o.id,
          type: "job",
          title: o.title,
          subtitle: `${o.categoryName ?? "Other"} · ${o.employer.name}${o.employer.verified ? " · Verified" : ""}`,
          description: o.summary.slice(0, 120),
          url: `/jobs/${o.id}`,
          campusId: o.location.campusId,
          tags: o.skills.slice(0, 6),
        },
        score,
        date: toTimestamp(o.postedAt),
      });
    }
  }

  // Services — ACTIVE only, provider must exist (mirrors /services).
  if (typeFilter === "all" || typeFilter === "service") {
    for (const s of marketplaceServices) {
      if (!s.isActive || !providers[s.providerId]) continue;
      const provider = providers[s.providerId];
      if (filters.campusId && !providerMatchesCampus(provider, filters.campusId)) continue;
      const score =
        scoreMatch(s.name, q) +
        scoreMatch(s.description, q) +
        (s.tags?.reduce((a, t) => a + scoreMatch(t, q), 0) || 0) +
        scoreMatch(provider.displayName, q);
      if (score <= 0) continue;
      const price = s.pricingModel === "quote" ? undefined : s.price;
      candidates.push({
        item: {
          id: s.id,
          type: "service",
          title: s.name,
          subtitle: `${provider.displayName} · ${getServiceCategoryName(s.categoryId)}`,
          description: s.description.slice(0, 120),
          image: s.imageUrl,
          url: `/services/${s.id}`,
          rating: provider.rating,
          ratingCount: provider.ratingCount,
          price,
          campusId: provider.primaryCampusId,
          tags: s.tags,
        },
        score,
        date: toTimestamp(s.createdAt),
        price,
      });
    }
  }

  // Providers — only those with ≥1 active service (no empty providers).
  if (typeFilter === "all" || typeFilter === "provider") {
    for (const p of marketplaceServiceProviders) {
      const active =
        marketplaceServices.some((s) => s.providerId === p.id && s.isActive);
      if (!active) continue;
      if (filters.campusId && !providerMatchesCampus(p, filters.campusId)) continue;
      const score =
        scoreMatch(p.displayName, q) +
        scoreMatch(p.tagline ?? "", q) +
        p.specialties.reduce((a, t) => a + scoreMatch(t, q), 0);
      if (score <= 0) continue;
      candidates.push({
        item: {
          id: p.id,
          type: "provider",
          title: p.displayName,
          subtitle: `${p.primaryCampusId.toUpperCase()} · ${p.specialties.slice(0, 2).join(" · ")}`,
          description: p.tagline?.slice(0, 120) ?? "",
          image: p.logoUrl ?? undefined,
          url: `/services/providers/${p.id}`,
          rating: p.rating,
          ratingCount: p.ratingCount,
          campusId: p.primaryCampusId,
        },
        score,
        date: p.joinedYear ? toTimestamp(`${p.joinedYear}-01-01`) : 0,
      });
    }
  }

  // Marketplace category taxonomy.
  if (typeFilter === "all" || typeFilter === "category") {
    for (const c of getCategories()) {
      const score = scoreMatch(c.name, q);
      if (score <= 0) continue;
      candidates.push({
        item: {
          id: c.id,
          type: "category",
          title: c.name,
          subtitle: "Category",
          url: `/marketplace/category/${c.id}`,
        },
        score,
        date: 0,
      });
    }
  }

  // Price range filter — applies to priced entities only (products &
  // services). Unpriced entities (jobs, vendors, providers, categories,
  // posts, events) drop out when a range is set — honest, documented.
  let filtered = candidates;
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
    suggestions: getSuggestions(q),
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