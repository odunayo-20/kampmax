import { apiClient, type ApiError } from "@/lib/api-client";
import { fetchCategories } from "@/services/categories";
import { fetchProducts } from "@/services/products";
import { getMyVendorIdApi } from "@/services/vendor-products";
import {
  VENDOR_PROMOTION_LIMITS,
  type VendorPromotion,
  type VendorPromotionCounts,
  type VendorPromotionInput,
  type VendorPromotionPage,
  type VendorPromotionQuery,
  type VendorPromotionRedemption,
  type VendorPromotionResult,
} from "@/types/vendor-promotions";

// ============================================================
// VENDOR PROMOTIONS — LIVE API LAYER
// ============================================================
//   GET   /vendor/promotions                 list (search, status, sort, page)
//   GET   /vendor/promotions/counts          counts by status + total usage
//   POST  /vendor/promotions                 create (draft)
//   GET   /vendor/promotions/:id
//   PUT   /vendor/promotions/:id             update
//   GET   /vendor/promotions/:id/redemptions
//   PATCH /vendor/promotions/:id/{activate|pause|resume|cancel}
//   POST  /vendor/promotions/:id/duplicate
//
// The vendor is derived from the JWT on the server; every row is owner-scoped.

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

// ── Queries ──────────────────────────────────────────────────

export async function fetchVendorPromotions(
  query: VendorPromotionQuery = {}
): Promise<VendorPromotionPage<VendorPromotion>> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.sort) params.set("sort", query.sort);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.pageSize ?? 12));

  const page = await unwrap(
    apiClient.get<BackendPage<VendorPromotion>>(`/vendor/promotions?${params}`)
  );
  return {
    items: page.items,
    total: page.meta.total,
    page: page.meta.page,
    pageSize: page.meta.limit,
    totalPages: Math.max(1, page.meta.totalPages),
  };
}

export type VendorPromotionStats = VendorPromotionCounts & { totalUsage: number };

export function fetchVendorPromotionCounts(): Promise<VendorPromotionStats> {
  return unwrap(apiClient.get<VendorPromotionStats>("/vendor/promotions/counts"));
}

export function fetchVendorPromotion(id: string): Promise<VendorPromotion> {
  return unwrap(apiClient.get<VendorPromotion>(`/vendor/promotions/${id}`));
}

export function fetchVendorPromotionRedemptions(
  id: string
): Promise<VendorPromotionRedemption[]> {
  return unwrap(
    apiClient.get<VendorPromotionRedemption[]>(`/vendor/promotions/${id}/redemptions`)
  );
}

export interface VendorPromotionFormContext {
  products: { id: string; title: string; price: number }[];
  categories: { id: string; name: string }[];
  limits: typeof VENDOR_PROMOTION_LIMITS;
  vendorId: string | null;
}

/** Products (active, own store) and categories the promotion form can target. */
export async function fetchVendorPromotionFormContext(): Promise<VendorPromotionFormContext> {
  const vendorId = await getMyVendorIdApi();
  const [products, categories] = await Promise.all([
    fetchProducts({ vendorId, status: "ACTIVE", limit: 100 }),
    fetchCategories({ limit: 100 }),
  ]);
  if (products.error) throw products.error;
  return {
    products: products.data.map((p) => ({ id: p.id, title: p.title, price: p.price })),
    categories: categories.data.map((c) => ({ id: c.id, name: c.name })),
    limits: VENDOR_PROMOTION_LIMITS,
    vendorId,
  };
}

// ── Commands (return the app's result shape so forms can show errors) ──

async function command(
  request: Promise<{ data: VendorPromotion; error: ApiError | null }>
): Promise<VendorPromotionResult> {
  const { data, error } = await request;
  if (error || !data) {
    return {
      ok: false,
      code: error?.status === 404 ? "not_found" : "validation_failed",
      error: error?.message ?? "Something went wrong.",
    };
  }
  return { ok: true, code: "ok", promotion: data };
}

export const createVendorPromotionApi = (input: VendorPromotionInput) =>
  command(apiClient.post<VendorPromotionInput, VendorPromotion>("/vendor/promotions", input));

export const updateVendorPromotionApi = (id: string, input: VendorPromotionInput) =>
  command(apiClient.put<VendorPromotionInput, VendorPromotion>(`/vendor/promotions/${id}`, input));

export const activateVendorPromotionApi = (id: string) =>
  command(apiClient.patch<undefined, VendorPromotion>(`/vendor/promotions/${id}/activate`));

export const pauseVendorPromotionApi = (id: string) =>
  command(apiClient.patch<undefined, VendorPromotion>(`/vendor/promotions/${id}/pause`));

export const resumeVendorPromotionApi = (id: string) =>
  command(apiClient.patch<undefined, VendorPromotion>(`/vendor/promotions/${id}/resume`));

export const cancelVendorPromotionApi = (id: string) =>
  command(apiClient.patch<undefined, VendorPromotion>(`/vendor/promotions/${id}/cancel`));

export const duplicateVendorPromotionApi = (id: string) =>
  command(apiClient.post<undefined, VendorPromotion>(`/vendor/promotions/${id}/duplicate`));
