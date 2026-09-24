import { apiClient } from "@/lib/api-client";
import {
  fetchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  mapBackendProductToFrontend,
  type BackendProductStatus,
  type BackendProductCondition,
  type BackendProductDetail,
} from "./products";
import { fetchCategories } from "./categories";
import { fetchCampuses } from "./campus";
import type { Product, ProductPublishStatus, ProductVariant, ProductVariantGroup } from "@/types";
import type {
  VendorProductQuery,
  VendorProductPage,
  ProductPublishResult,
  InventoryMovement,
  ProductStockStatus,
  ProductSortField,
} from "@/types/vendor-products";

const BACKEND_STATUS: Record<ProductPublishStatus, BackendProductStatus> = {
  draft: "DRAFT",
  inactive: "DRAFT",
  pending_review: "PENDING_REVIEW",
  active: "ACTIVE",
  rejected: "SUSPENDED",
  archived: "ARCHIVED",
};

let cachedVendorId: string | null = null;

/** Resolve the current user's vendor id from GET /vendors/me. */
export async function getMyVendorIdApi(): Promise<string> {
  if (cachedVendorId) return cachedVendorId;
  const { data, error } = await apiClient.get<{ id: string }>("/vendors/me");
  if (error || !data?.id) throw error ?? new Error("No vendor store found for this account");
  cachedVendorId = data.id;
  return data.id;
}

function stockStatusOf(p: Product): ProductStockStatus {
  return getStockStatus(p);
}

export async function getVendorProductsApi(query: VendorProductQuery = {}): Promise<VendorProductPage<Product>> {
  const vendorId = await getMyVendorIdApi();
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
  const stockFilter = query.stockStatus && query.stockStatus !== "all" ? query.stockStatus : null;
  const sort = query.sort ?? "newest";
  // Backend can't filter by stock level or sort (createdAt DESC only), so when
  // either is requested we pull the vendor's full catalogue and do it here.
  const clientSide = stockFilter !== null || sort !== "newest";

  const base = {
    vendorId,
    search: query.search || undefined,
    categoryId: query.categoryId,
    status: query.status && query.status !== "all" ? BACKEND_STATUS[query.status] : undefined,
    minPrice: query.minPrice,
    maxPrice: query.maxPrice,
  };

  if (!clientSide) {
    const page = Math.max(1, query.page ?? 1);
    const res = await fetchProducts({ ...base, page, limit: pageSize });
    if (res.error) throw res.error;
    return { items: res.data, total: res.total, page: res.page, pageSize, totalPages: Math.max(1, res.totalPages) };
  }

  let items: Product[] = [];
  for (let p = 1; ; p++) {
    const res = await fetchProducts({ ...base, page: p, limit: 100 });
    if (res.error) throw res.error;
    items = items.concat(res.data);
    if (p >= res.totalPages) break;
  }
  if (stockFilter) items = items.filter((p) => stockStatusOf(p) === stockFilter);
  items = sortProducts(items, sort);

  const page = Math.max(1, query.page ?? 1);
  const total = items.length;
  return {
    items: items.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function sortProducts(items: Product[], sort: ProductSortField): Product[] {
  const time = (p: Product) => new Date(p.updatedAt ?? p.createdAt).getTime();
  const created = (p: Product) => new Date(p.createdAt).getTime();
  const sorted = [...items];
  switch (sort) {
    case "oldest": return sorted.sort((a, b) => created(a) - created(b));
    case "title": return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "price_asc": return sorted.sort((a, b) => a.price - b.price);
    case "price_desc": return sorted.sort((a, b) => b.price - a.price);
    case "stock": return sorted.sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
    case "updated": return sorted.sort((a, b) => time(b) - time(a));
    default: return sorted.sort((a, b) => created(b) - created(a));
  }
}

export async function getVendorProductCountsApi(): Promise<Record<ProductPublishStatus | "all", number>> {
  const vendorId = await getMyVendorIdApi();
  const [all, draft, pending, active, suspended, archived] = await Promise.all(
    [undefined, "DRAFT", "PENDING_REVIEW", "ACTIVE", "SUSPENDED", "ARCHIVED"].map((status) =>
      fetchProducts({ vendorId, status: status as BackendProductStatus | undefined, limit: 1 })
    )
  );
  return {
    all: all.total,
    draft: draft.total,
    pending_review: pending.total,
    active: active.total,
    inactive: 0, // stored as DRAFT on the backend
    rejected: suspended.total,
    archived: archived.total,
  };
}

/** Owner view (includes cost price + variant editor data) from GET /products/:id/manage. */
export async function getVendorProductByIdApi(productId: string): Promise<Product | null> {
  const vendorId = await getMyVendorIdApi();
  const { data, error } = await apiClient.get<BackendProductDetail>(`/products/${productId}/manage`);
  if (error || !data) return null;
  const product = mapBackendProductToFrontend(data);
  return product.vendorId === vendorId ? product : null;
}

export async function getCategoriesForVendorApi(): Promise<{ id: string; name: string }[]> {
  const { data } = await fetchCategories({ limit: 100 });
  return data.map((c) => ({ id: c.id, name: c.name }));
}

export async function getCampusesForVendorApi(): Promise<{ id: string; name: string }[]> {
  const { data } = await fetchCampuses({ limit: 100 });
  return data.map((c) => ({ id: c.id, name: c.name }));
}

function realImages(images: string[] | undefined): string[] {
  return (images ?? []).filter((src) => src && !src.includes("placeholder-product"));
}

function toBackendCondition(c: Product["condition"]): BackendProductCondition {
  return c === "New" ? "NEW" : "USED";
}

type VendorFieldsInput = Pick<
  UpdateProductInput,
  | "lowStockThreshold" | "costPrice" | "tags" | "location" | "allowDelivery" | "allowPickup"
  | "deliveryFee" | "hasVariants" | "variants" | "variantGroups"
>;

/**
 * Backend-side shape for the vendor-managed fields. `variantConfig` keeps the
 * editor's groups + SKU combinations verbatim; `variations` is derived from
 * the groups in the shape the cart resolves selections against (group name +
 * option label, priced as base price + modifier).
 */
function vendorFieldsPayload(input: VendorFieldsInput, basePrice: number | undefined) {
  const groups = input.variantGroups;
  return {
    lowStockThreshold: input.lowStockThreshold,
    costPrice: input.costPrice ?? undefined,
    tags: input.tags?.map((t) => t.trim()).filter(Boolean),
    location: input.location?.trim() || undefined,
    allowDelivery: input.allowDelivery,
    allowPickup: input.allowPickup,
    deliveryFee: input.deliveryFee,
    hasVariants: input.hasVariants,
    variantConfig:
      input.variantGroups !== undefined || input.variants !== undefined
        ? { variantGroups: input.variantGroups ?? [], variants: input.variants ?? [] }
        : undefined,
    variations:
      groups !== undefined && basePrice !== undefined
        ? (input.hasVariants === false ? [] : groups).map((g) => ({
            name: g.name,
            options: g.options.map((o) => ({
              label: o.value,
              price: basePrice + (o.priceModifier ?? 0),
              stockQuantity: o.stock ?? 0,
              sku: null,
            })),
          }))
        : undefined,
  };
}

export async function createVendorProductApi(input: CreateProductInput): Promise<Product> {
  const vendorId = await getMyVendorIdApi();
  const { data, error } = await createProduct({
    vendorId,
    campusId: input.campusId,
    categoryId: input.categoryId || undefined,
    name: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    compareAtPrice: input.originalPrice,
    condition: toBackendCondition(input.condition),
    stockQuantity: input.stock,
    sku: input.sku?.trim().toUpperCase() || undefined,
    images: realImages(input.images),
    ...vendorFieldsPayload(input, input.price),
  });
  if (error || !data) throw error ?? new Error("Could not create product");

  // New products start as DRAFT on the backend; apply any other requested status.
  const wanted = input.publishedStatus ?? "draft";
  if (BACKEND_STATUS[wanted] !== "DRAFT") {
    const result = await setProductPublishedStatusApi(data.id, wanted);
    if (!result.success) return data;
    return (await getVendorProductByIdApi(data.id)) ?? data;
  }
  return data;
}

export async function updateVendorProductApi(productId: string, input: UpdateProductInput): Promise<Product> {
  const { data, error } = await updateProduct(productId, {
    name: input.title?.trim(),
    description: input.description?.trim(),
    price: input.price,
    compareAtPrice: input.originalPrice ?? undefined,
    categoryId: input.categoryId || undefined,
    campusId: input.campusId,
    condition: input.condition ? toBackendCondition(input.condition) : undefined,
    stockQuantity: input.stock,
    sku: input.sku?.trim().toUpperCase() || undefined,
    images: input.images ? realImages(input.images) : undefined,
    ...vendorFieldsPayload(input, input.price),
  });
  if (error || !data) throw error ?? new Error("Could not update product");
  return data;
}

export async function setProductPublishedStatusApi(
  productId: string,
  status: ProductPublishStatus
): Promise<ProductPublishResult> {
  if (status === "active") {
    const product = await getVendorProductByIdApi(productId);
    if (!product) return { success: false, status: "draft", reason: "Product not found" };
    const errors: Record<string, string> = {};
    if (!product.title?.trim()) errors.title = "Title is required";
    if (!product.description?.trim()) errors.description = "Description is required";
    if (!product.price || product.price <= 0) errors.price = "Valid price is required";
    if (!product.categoryId) errors.categoryId = "Category is required";
    if (!product.campusId) errors.campusId = "Campus is required";
    if (!product.images?.length) errors.images = "At least one image is required";
    if (Object.keys(errors).length > 0) {
      return { success: false, status: "draft", reason: "Missing required information", errors };
    }
  }
  const { data, error } = await updateProduct(productId, { status: BACKEND_STATUS[status] });
  if (error || !data) {
    return { success: false, status: "draft", reason: error?.message ?? "Could not update product status" };
  }
  return { success: true, status: data.publishedStatus ?? status };
}

interface BackendInventoryMovement {
  id: string;
  productId: string;
  type: "add" | "subtract" | "set";
  quantity: number;
  previousStock: number;
  resultingStock: number;
  reason: string;
  actorId: string | null;
  createdAt: string;
}

export async function getInventoryMovementsApi(productId: string): Promise<InventoryMovement[]> {
  const { data, error } = await apiClient.get<BackendInventoryMovement[]>(`/products/${productId}/inventory/movements`);
  if (error) throw error;
  return (data ?? []).map((m) => ({ ...m, actorId: m.actorId ?? "" }));
}

/** Throws on failure (including a 409 stock conflict) so the panel can show the message. */
export async function adjustInventoryApi(productId: string, input: AdjustInventoryInput): Promise<void> {
  const { error } = await apiClient.post<AdjustInventoryInput, unknown>(`/products/${productId}/inventory`, input);
  if (error) throw error;
}

export async function archiveVendorProductApi(productId: string): Promise<void> {
  const result = await setProductPublishedStatusApi(productId, "archived");
  if (!result.success) throw new Error(result.reason ?? "Could not archive product");
}

export async function restoreVendorProductApi(productId: string): Promise<void> {
  const result = await setProductPublishedStatusApi(productId, "draft");
  if (!result.success) throw new Error(result.reason ?? "Could not restore product");
}

export async function deleteVendorProductApi(productId: string): Promise<void> {
  const { success, error } = await deleteProduct(productId);
  if (!success) throw error ?? new Error("Could not delete product");
}

export interface CreateProductInput {
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  categoryId: string;
  campusId: string;
  condition: Product["condition"];
  images: string[];
  location?: string;
  tags?: string[];
  stock: number;
  lowStockThreshold?: number;
  costPrice?: number;
  sku?: string;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  variantGroups?: ProductVariantGroup[];
  publishedStatus?: ProductPublishStatus;
  allowDelivery?: boolean;
  allowPickup?: boolean;
  deliveryFee?: number;
}

export interface UpdateProductInput {
  title?: string;
  description?: string;
  price?: number;
  originalPrice?: number | null;
  categoryId?: string;
  campusId?: string;
  condition?: Product["condition"];
  images?: string[];
  location?: string | null;
  tags?: string[];
  stock?: number;
  lowStockThreshold?: number;
  costPrice?: number | null;
  sku?: string | null;
  hasVariants?: boolean;
  variants?: ProductVariant[];
  variantGroups?: ProductVariantGroup[];
  allowDelivery?: boolean;
  allowPickup?: boolean;
  deliveryFee?: number;
}

export interface AdjustInventoryInput {
  type: "add" | "subtract" | "set";
  quantity: number;
  reason: string;
  expectedStock?: number;
}

export function getStockStatus(product: Product): ProductStockStatus {
  const stock = product.stock ?? 0;
  const threshold = product.lowStockThreshold ?? 5;
  if (stock === 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}