import {
  Product,
  ProductCondition,
  ProductPublishStatus,
  ProductStatus,
  ProductVariant,
  ProductVariantGroup,
} from "@/types";
import { apiClient, ApiError } from "@/lib/api-client";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Products Module)
// ============================================================

export type BackendProductCondition = "NEW" | "USED" | "REFURBISHED";
export type BackendProductStatus =
  | "DRAFT"
  | "PENDING_REVIEW"
  | "ACTIVE"
  | "OUT_OF_STOCK"
  | "SUSPENDED"
  | "ARCHIVED";
export type BackendProductType = "PHYSICAL" | "DIGITAL" | "SERVICE";

export interface BackendProductListItem {
  id: string;
  vendorId: string;
  categoryId: string | null;
  campusId: string;
  name: string;
  slug: string;
  description: string | null;
  type: BackendProductType;
  condition: BackendProductCondition;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  sku: string | null;
  status: BackendProductStatus;
  images: string[];
  lowStockThreshold?: number;
  tags?: string[];
  location?: string | null;
  allowDelivery?: boolean;
  allowPickup?: boolean;
  deliveryFee?: number | string;
  createdAt: string | Date;
  /** Shown first in a search because an admin boosted it. */
  sponsored?: boolean;
}

export interface BackendProductDetail extends BackendProductListItem {
  attributes?: Record<string, string>;
  variations?: Array<{
    name: string;
    options: Array<{
      label: string;
      price?: number;
      stockQuantity?: number;
      sku?: string;
    }>;
  }>;
  updatedAt: string | Date;
  /** Only present on the owner-only GET /products/:id/manage response. */
  costPrice?: number | string | null;
  hasVariants?: boolean;
  variantConfig?: { variantGroups?: ProductVariantGroup[]; variants?: ProductVariant[] } | null;
}

export interface BackendPaginatedProducts {
  items: BackendProductListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ProductQueryParams {
  search?: string;
  campusId?: string;
  vendorId?: string;
  categoryId?: string;
  status?: BackendProductStatus;
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
}

export interface CreateProductPayload {
  vendorId: string;
  campusId: string;
  name: string;
  price: number;
  categoryId?: string;
  slug?: string;
  description?: string;
  type?: BackendProductType;
  condition?: BackendProductCondition;
  compareAtPrice?: number;
  stockQuantity?: number;
  sku?: string;
  images?: string[];
  attributes?: Record<string, string>;
  variations?: unknown[];
  lowStockThreshold?: number;
  costPrice?: number;
  tags?: string[];
  location?: string;
  allowDelivery?: boolean;
  allowPickup?: boolean;
  deliveryFee?: number;
  hasVariants?: boolean;
  variantConfig?: Record<string, unknown>;
}

export interface UpdateProductPayload {
  name?: string;
  price?: number;
  categoryId?: string;
  campusId?: string;
  slug?: string;
  description?: string;
  type?: BackendProductType;
  condition?: BackendProductCondition;
  compareAtPrice?: number;
  stockQuantity?: number;
  sku?: string;
  images?: string[];
  status?: BackendProductStatus;
  attributes?: Record<string, string>;
  variations?: unknown[];
  lowStockThreshold?: number;
  costPrice?: number;
  tags?: string[];
  location?: string;
  allowDelivery?: boolean;
  allowPickup?: boolean;
  deliveryFee?: number;
  hasVariants?: boolean;
  variantConfig?: Record<string, unknown>;
}

// In-memory cache for synchronous fallback access
let cachedProducts: Product[] = [];

const PUBLISHED_STATUS_FROM_BACKEND: Record<BackendProductStatus, ProductPublishStatus> = {
  DRAFT: "draft",
  PENDING_REVIEW: "pending_review",
  ACTIVE: "active",
  OUT_OF_STOCK: "active",
  SUSPENDED: "rejected",
  ARCHIVED: "archived",
};

/**
 * Maps a backend product entity into the frontend Product model.
 */
export function mapBackendProductToFrontend(
  raw: BackendProductListItem | BackendProductDetail
): Product {
  // Normalize condition
  let condition: ProductCondition = "New";
  if (raw.condition === "USED" || raw.condition === "REFURBISHED") {
    condition = "Used";
  } else {
    condition = "New";
  }

  // Normalize status. Only ACTIVE products are purchasable; everything else
  // (draft, pending review, out of stock, suspended, archived) must never
  // read as "available" to a customer.
  let status: ProductStatus = "available";
  if (raw.status === "OUT_OF_STOCK") {
    status = "sold";
  } else if (
    raw.status === "SUSPENDED" ||
    raw.status === "ARCHIVED" ||
    raw.status === "DRAFT" ||
    raw.status === "PENDING_REVIEW"
  ) {
    status = "removed";
  } else {
    status = "available";
  }

  return {
    id: raw.id,
    title: raw.name,
    description: raw.description || "",
    price: Number(raw.price),
    originalPrice: raw.compareAtPrice ? Number(raw.compareAtPrice) : undefined,
    categoryId: raw.categoryId || "",
    vendorId: raw.vendorId,
    campusId: raw.campusId,
    images: raw.images && raw.images.length > 0 ? raw.images : [],
    condition,
    status,
    publishedStatus: PUBLISHED_STATUS_FROM_BACKEND[raw.status],
    updatedAt:
      "updatedAt" in raw && raw.updatedAt
        ? (typeof raw.updatedAt === "string" ? raw.updatedAt : raw.updatedAt.toISOString())
        : undefined,
    stock: raw.stockQuantity ?? 0,
    sku: raw.sku || undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : (raw.createdAt?.toISOString?.() || new Date().toISOString()),
    location: raw.location ?? undefined,
    sponsored: raw.sponsored ? true : undefined,
    tags: raw.tags ?? [],
    lowStockThreshold: raw.lowStockThreshold,
    costPrice:
      "costPrice" in raw && raw.costPrice != null ? Number(raw.costPrice) : undefined,
    hasVariants: "hasVariants" in raw ? raw.hasVariants : undefined,
    variantGroups: "variantConfig" in raw ? raw.variantConfig?.variantGroups : undefined,
    variants: "variantConfig" in raw ? raw.variantConfig?.variants : undefined,
    allowDelivery: raw.allowDelivery ?? true,
    allowPickup: raw.allowPickup ?? true,
    deliveryFee: raw.deliveryFee != null ? Number(raw.deliveryFee) : 0,
  };
}

// ============================================================
// ASYNC API CLIENT METHODS
// ============================================================

/**
 * Fetch paginated products from the backend API with search/filtering.
 * GET /api/v1/products
 */
export async function fetchProducts(
  params: ProductQueryParams = {}
): Promise<{
  data: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.append("search", params.search);
  if (params.campusId) searchParams.append("campusId", params.campusId);
  if (params.vendorId) searchParams.append("vendorId", params.vendorId);
  if (params.categoryId) searchParams.append("categoryId", params.categoryId);
  if (params.status) searchParams.append("status", params.status);
  if (params.minPrice !== undefined) searchParams.append("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) searchParams.append("maxPrice", String(params.maxPrice));
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));

  const queryString = searchParams.toString();
  const path = `/products${queryString ? `?${queryString}` : ""}`;

  const { data, error } = await apiClient.get<BackendPaginatedProducts>(path);

  if (error || !data || !Array.isArray(data.items)) {
    // Filter fallback cache locally
    let fallback = [...cachedProducts];
    if (params.campusId) fallback = fallback.filter((p) => p.campusId === params.campusId);
    if (params.categoryId) fallback = fallback.filter((p) => p.categoryId === params.categoryId);
    if (params.vendorId) fallback = fallback.filter((p) => p.vendorId === params.vendorId);
    if (params.search) {
      const q = params.search.toLowerCase();
      fallback = fallback.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags?.some((t) => t.toLowerCase().includes(q))
      );
    }
    if (params.minPrice !== undefined) fallback = fallback.filter((p) => p.price >= params.minPrice!);
    if (params.maxPrice !== undefined) fallback = fallback.filter((p) => p.price <= params.maxPrice!);

    return {
      data: fallback,
      total: fallback.length,
      page: params.page || 1,
      limit: params.limit || 20,
      totalPages: Math.ceil(fallback.length / (params.limit || 20)) || 1,
      error,
    };
  }

  const mapped = data.items.map(mapBackendProductToFrontend);

  // Update in-memory cache with newly fetched items
  const mappedMap = new Map(mapped.map((p) => [p.id, p]));
  cachedProducts = [
    ...mapped,
    ...cachedProducts.filter((p) => !mappedMap.has(p.id)),
  ];

  return {
    data: mapped,
    total: data.meta.total,
    page: data.meta.page,
    limit: data.meta.limit,
    totalPages: data.meta.totalPages,
    error: null,
  };
}

/**
 * Fetch a single product by ID from the backend API.
 * GET /api/v1/products/:id
 */
export async function fetchProductById(
  id: string
): Promise<{ data: Product | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendProductDetail>(`/products/${id}`);

  if (error || !data) {
    const fallback = cachedProducts.find((p) => p.id === id) || null;
    return { data: fallback, error };
  }

  const mapped = mapBackendProductToFrontend(data);

  // Update cached copy
  const idx = cachedProducts.findIndex((p) => p.id === id);
  if (idx >= 0) {
    cachedProducts[idx] = mapped;
  } else {
    cachedProducts.unshift(mapped);
  }

  return { data: mapped, error: null };
}

/**
 * Fetch products filtered by campus.
 */
export async function fetchProductsByCampus(
  campusId: string,
  params: Omit<ProductQueryParams, "campusId"> = {}
) {
  return fetchProducts({ ...params, campusId });
}

/**
 * Fetch products filtered by category.
 */
export async function fetchProductsByCategory(
  categoryId: string,
  campusId?: string,
  params: Omit<ProductQueryParams, "categoryId" | "campusId"> = {}
) {
  return fetchProducts({ ...params, categoryId, campusId });
}

/**
 * Create a new product (Authenticated Vendor).
 * POST /api/v1/products
 */
export async function createProduct(
  payload: CreateProductPayload
): Promise<{ data: Product | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<CreateProductPayload, BackendProductDetail>("/products", payload);

  if (error || !data || !data.id) {
    return { data: null, error };
  }

  const mapped = mapBackendProductToFrontend(data);
  cachedProducts.unshift(mapped);

  return { data: mapped, error: null };
}

/**
 * Update an existing product (Authenticated Vendor/Admin).
 * PATCH /api/v1/products/:id
 */
export async function updateProduct(
  id: string,
  payload: UpdateProductPayload
): Promise<{ data: Product | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<UpdateProductPayload, BackendProductDetail>(`/products/${id}`, payload);

  if (error || !data || !data.id) {
    return { data: null, error };
  }

  const mapped = mapBackendProductToFrontend(data);
  const idx = cachedProducts.findIndex((p) => p.id === id);
  if (idx >= 0) {
    cachedProducts[idx] = mapped;
  } else {
    cachedProducts.unshift(mapped);
  }

  return { data: mapped, error: null };
}

/**
 * Delete / remove a product (Authenticated Vendor/Admin).
 * DELETE /api/v1/products/:id
 */
export async function deleteProduct(
  id: string
): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete<void>(`/products/${id}`);

  if (error) {
    return { success: false, error };
  }

  cachedProducts = cachedProducts.filter((p) => p.id !== id);
  return { success: true, error: null };
}

// ============================================================
// SYNCHRONOUS FALLBACK HELPERS (preserves backward compatibility)
// ============================================================

export function getProducts(): Product[] {
  return cachedProducts;
}

export function getProductById(id: string): Product | undefined {
  return cachedProducts.find((p) => p.id === id);
}

export function getProductsByCategory(categoryId: string): Product[] {
  return cachedProducts.filter((p) => p.categoryId === categoryId);
}

export function getProductsByVendor(vendorId: string): Product[] {
  return cachedProducts.filter((p) => p.vendorId === vendorId);
}

export function getFeaturedProducts(): Product[] {
  return cachedProducts.filter((p) => p.originalPrice && p.originalPrice > p.price);
}

export function getRecentProducts(): Product[] {
  return [...cachedProducts].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function searchProducts(query: string): Product[] {
  const q = query.toLowerCase();
  return cachedProducts.filter(
    (p) =>
      p.title.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q) ||
      p.tags?.some((t) => t.toLowerCase().includes(q))
  );
}

export function getProductsByCampus(campusId: string): Product[] {
  const found = cachedProducts.filter(
    (p) => p.campusId === campusId
  );
  return found;
}

export function getFeaturedProductsByCampus(campusId: string): Product[] {
  return cachedProducts.filter(
    (p) => p.campusId === campusId && p.originalPrice && p.originalPrice > p.price
  );
}

export function getPopularProductsByCampus(campusId: string): Product[] {
  return cachedProducts
    .filter((p) => p.campusId === campusId)
    .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0));
}

export function getRecentProductsByCampus(campusId: string): Product[] {
  return cachedProducts
    .filter((p) => p.campusId === campusId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getRecommendedProductsByCampus(campusId: string): Product[] {
  return cachedProducts
    .filter((p) => p.campusId === campusId)
    .sort((a, b) => (b.saveCount || 0) - (a.saveCount || 0));
}
