import { Category } from "@/types";
import { getProductsByCategory } from "./products";
import { apiClient, ApiError } from "@/lib/api-client";

// ============================================================
// BACKEND RESPONSE TYPES (from NestJS Categories Module)
// ============================================================

export interface BackendCategoryTreeItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  children?: BackendCategoryTreeItem[];
}

export interface BackendCategoryDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  children: Array<{
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    image: string | null;
    sortOrder: number;
  }>;
}

export interface BackendPaginatedCategories {
  items: BackendCategoryTreeItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// In-memory cache for synchronous fallback access
let cachedCategories: Category[] = [];

/**
 * Fallback icon dictionary for categories based on name keywords.
 */
function getIconForCategory(name: string, backendIcon: string | null): string {
  if (backendIcon) return backendIcon;
  const lower = name.toLowerCase();
  if (lower.includes("book") || lower.includes("text")) return "📚";
  if (lower.includes("elect") || lower.includes("tech") || lower.includes("gadget") || lower.includes("phone")) return "💻";
  if (lower.includes("fash") || lower.includes("cloth") || lower.includes("wear")) return "👕";
  if (lower.includes("game") || lower.includes("play")) return "🎮";
  if (lower.includes("hostel") || lower.includes("home") || lower.includes("furn")) return "🏠";
  if (lower.includes("food") || lower.includes("snack") || lower.includes("meal")) return "🍔";
  if (lower.includes("beauty") || lower.includes("hair") || lower.includes("cosmetic")) return "💇";
  if (lower.includes("service") || lower.includes("repair") || lower.includes("fix")) return "🔧";
  return "🏷️";
}

/**
 * Maps a backend category item to frontend Category model.
 */
export function mapBackendCategoryToFrontend(raw: BackendCategoryTreeItem): Category {
  return {
    id: raw.id,
    name: raw.name,
    icon: getIconForCategory(raw.name, raw.icon || null),
    productCount: 0,
  };
}

// ============================================================
// ASYNC API CLIENT METHODS
// ============================================================

export interface FetchCategoriesParams {
  search?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Fetch flat or paginated categories from the backend API.
 * GET /api/v1/categories
 */
export async function fetchCategories(
  params: FetchCategoriesParams = {}
): Promise<{ data: Category[]; total: number; page: number; limit: number; totalPages: number; error: ApiError | null }> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("search", params.search);
  if (params.isActive !== undefined) searchParams.append("isActive", String(params.isActive));
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));

  const queryString = searchParams.toString();
  const path = `/categories${queryString ? `?${queryString}` : ""}`;

  const { data, error } = await apiClient.get<BackendPaginatedCategories>(path);

  if (error || !data || !Array.isArray(data.items)) {
    return {
      data: cachedCategories,
      total: cachedCategories.length,
      page: 1,
      limit: cachedCategories.length,
      totalPages: 1,
      error,
    };
  }

  const mapped = data.items.map(mapBackendCategoryToFrontend);
  if (mapped.length > 0 && !params.search) {
    cachedCategories = mapped;
  }

  return {
    data: mapped,
    total: data.meta?.total ?? mapped.length,
    page: data.meta?.page ?? 1,
    limit: data.meta?.limit ?? mapped.length,
    totalPages: data.meta?.totalPages ?? 1,
    error: null,
  };
}

/**
 * Fetch full category tree hierarchy from the backend API.
 * GET /api/v1/categories/tree
 */
export async function fetchCategoryTree(): Promise<{ data: BackendCategoryTreeItem[]; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendCategoryTreeItem[]>("/categories/tree");

  if (error || !data || !Array.isArray(data)) {
    return { data: [], error };
  }

  return { data, error: null };
}

/**
 * Fetch category details by slug or ID.
 * GET /api/v1/categories/:slug
 */
export async function fetchCategoryBySlug(
  slug: string
): Promise<{ data: Category | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendCategoryDetail>(`/categories/${slug}`);

  if (error || !data) {
    const fallback = cachedCategories.find((c) => c.id === slug || c.name.toLowerCase() === slug.toLowerCase());
    return { data: fallback || null, error };
  }

  return {
    data: {
      id: data.id,
      name: data.name,
      icon: getIconForCategory(data.name, data.icon),
      productCount: getProductsByCategory(data.id).length,
    },
    error: null,
  };
}

// ============================================================
// SYNCHRONOUS CONVENIENCE HELPERS (Backward compatibility)
// ============================================================

export function getCategories(): Category[] {
  return cachedCategories;
}

export function getCategoryById(id: string): Category | undefined {
  return cachedCategories.find((c) => c.id === id);
}
