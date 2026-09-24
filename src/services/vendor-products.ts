import { apiClient } from "@/lib/api-client";
import { getCurrentUser, getVendorByUserId } from "./users";
import {
  getProductsByVendor,
  getProductById,
  fetchProducts,
  fetchProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  mapBackendProductToFrontend,
  type BackendProductStatus,
  type BackendProductCondition,
  type BackendProductDetail,
} from "./products";
import { getCategories, fetchCategories } from "./categories";
import { getCampuses, fetchCampuses } from "./campus";
import { products } from "@/data/products";
import type { Product, ProductPublishStatus, ProductVariant, ProductVariantGroup } from "@/types";
import type {
  VendorProductQuery,
  VendorProductPage,
  ProductPublishResult,
  InventoryMovement,
  ProductStockStatus,
  ProductSortField,
} from "@/types/vendor-products";

const inventoryMovements: InventoryMovement[] = [
  {
    id: "im1",
    productId: "p25",
    type: "add",
    quantity: 5,
    reason: "Initial stock received",
    actorId: "u1",
    resultingStock: 5,
    previousStock: 0,
    createdAt: "2025-02-01T10:00:00Z",
  },
  {
    id: "im2",
    productId: "p25",
    type: "subtract",
    quantity: 2,
    reason: "Sold to customers",
    actorId: "u1",
    resultingStock: 3,
    previousStock: 5,
    createdAt: "2025-02-15T14:30:00Z",
  },
  {
    id: "im3",
    productId: "p26",
    type: "add",
    quantity: 3,
    reason: "Restock from supplier",
    actorId: "u1",
    resultingStock: 3,
    previousStock: 0,
    createdAt: "2025-02-03T09:00:00Z",
  },
  {
    id: "im4",
    productId: "p26",
    type: "subtract",
    quantity: 1,
    reason: "Sale",
    actorId: "u1",
    resultingStock: 2,
    previousStock: 3,
    createdAt: "2025-02-20T11:00:00Z",
  },
  {
    id: "im5",
    productId: "p30",
    type: "add",
    quantity: 2,
    reason: "Initial stock",
    actorId: "u1",
    resultingStock: 2,
    previousStock: 0,
    createdAt: "2025-02-12T10:00:00Z",
  },
  {
    id: "im6",
    productId: "p30",
    type: "subtract",
    quantity: 2,
    reason: "Sold out",
    actorId: "u1",
    resultingStock: 0,
    previousStock: 2,
    createdAt: "2025-02-25T16:00:00Z",
  },
];

function getOwnerVendorId(): string | null {
  const user = getCurrentUser();
  const vendor = getVendorByUserId(user.id);
  return vendor?.id ?? null;
}

function ensureOwnership(productId: string): Product {
  const vendorId = getOwnerVendorId();
  if (!vendorId) throw new Error("No vendor associated with current user");
  const product = getProductById(productId);
  if (!product) throw new Error("Product not found");
  if (product.vendorId !== vendorId) throw new Error("Product does not belong to this vendor");
  return product;
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

export function getVendorProducts(query: VendorProductQuery = {}): VendorProductPage<Product> {
  const vendorId = getOwnerVendorId();
  if (!vendorId) return { items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 };

  let items = getProductsByVendor(vendorId);

  if (query.search) {
    const q = query.search.toLowerCase();
    items = items.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.sku?.toLowerCase().includes(q) ||
        p.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }

  const statusFilter = query.status ?? "all";
  if (statusFilter !== "all") {
    items = items.filter((p) => (p.publishedStatus ?? "active") === statusFilter);
  }

  if (query.categoryId) {
    items = items.filter((p) => p.categoryId === query.categoryId);
  }

  if (query.stockStatus && query.stockStatus !== "all") {
    items = items.filter((p) => {
      const stock = p.stock ?? 0;
      const threshold = p.lowStockThreshold ?? 5;
      if (query.stockStatus === "out_of_stock") return stock === 0;
      if (query.stockStatus === "low_stock") return stock > 0 && stock <= threshold;
      return stock > threshold;
    });
  }

  if (query.minPrice !== undefined) {
    items = items.filter((p) => p.price >= query.minPrice!);
  }
  if (query.maxPrice !== undefined) {
    items = items.filter((p) => p.price <= query.maxPrice!);
  }

  const sort = query.sort ?? "newest";
  switch (sort) {
    case "oldest":
      items = [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      break;
    case "title":
      items = [...items].sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "price_asc":
      items = [...items].sort((a, b) => a.price - b.price);
      break;
    case "price_desc":
      items = [...items].sort((a, b) => b.price - a.price);
      break;
    case "stock":
      items = [...items].sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0));
      break;
    case "updated":
      items = [...items].sort((a, b) =>
        new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
      );
      break;
    case "newest":
    default:
      items = [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      break;
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, Math.min(100, query.pageSize ?? 20));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const start = (page - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);

  return { items: slice, total, page, pageSize, totalPages };
}

// ============================================================
// LIVE BACKEND API (products module)
// The backend has no separate "vendor products" endpoints: the vendor's
// catalogue is GET /products?vendorId=<my vendor id>, and writes go through
// POST/PATCH/DELETE /products. Backend has a single ProductStatus enum, so
// "inactive" is stored as DRAFT (unpublished) and "rejected" as SUSPENDED.
// ============================================================

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

export function getVendorProductById(productId: string): Product | null {
  try {
    return ensureOwnership(productId);
  } catch {
    return null;
  }
}

export function getVendorProductCounts(): Record<ProductPublishStatus | "all", number> {
  const vendorId = getOwnerVendorId();
  if (!vendorId) return { all: 0, draft: 0, pending_review: 0, active: 0, inactive: 0, rejected: 0, archived: 0 };

  const items = getProductsByVendor(vendorId);
  const counts: Record<ProductPublishStatus | "all", number> = {
    all: items.length,
    draft: 0,
    pending_review: 0,
    active: 0,
    inactive: 0,
    rejected: 0,
    archived: 0,
  };
  for (const p of items) {
    const status = (p.publishedStatus ?? "active") as ProductPublishStatus;
    counts[status] = (counts[status] ?? 0) + 1;
  }
  return counts;
}

export function getCategoriesForVendor(): { id: string; name: string }[] {
  return getCategories().map((c) => ({ id: c.id, name: c.name }));
}

export function getCampusesForVendor(): { id: string; name: string }[] {
  return getCampuses().map((c) => ({ id: c.id, name: c.name }));
}

interface CreateProductInput {
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

export function createVendorProduct(input: CreateProductInput): Product {
  const vendorId = getOwnerVendorId();
  if (!vendorId) throw new Error("No vendor associated with current user");

  const vendor = getVendorByUserId(getCurrentUser().id);
  if (!vendor) throw new Error("Vendor not found");

  const now = nowISO();
  const newProduct: Product = {
    id: generateId("p"),
    title: input.title.trim(),
    description: input.description.trim(),
    price: input.price,
    originalPrice: input.originalPrice,
    categoryId: input.categoryId,
    vendorId,
    campusId: input.campusId,
    condition: input.condition,
    status: input.publishedStatus === "active" ? "available" : "removed",
    createdAt: now,
    updatedAt: now,
    images: input.images.length > 0 ? input.images : ["/placeholder-product.svg"],
    location: input.location?.trim(),
    tags: input.tags?.map((t) => t.trim()).filter(Boolean),
    stock: input.stock,
    reservedStock: 0,
    lowStockThreshold: input.lowStockThreshold ?? 5,
    costPrice: input.costPrice,
    publishedStatus: input.publishedStatus ?? "draft",
    sku: input.sku?.trim().toUpperCase(),
    hasVariants: input.hasVariants ?? false,
    variants: input.variants,
    variantGroups: input.variantGroups,
  };

  products.push(newProduct);

  if (newProduct.stock && newProduct.stock > 0) {
    inventoryMovements.push({
      id: generateId("im"),
      productId: newProduct.id,
      type: "add",
      quantity: newProduct.stock,
      reason: "Initial stock on creation",
      actorId: getCurrentUser().id,
      resultingStock: newProduct.stock,
      previousStock: 0,
      createdAt: now,
    });
  }

  return newProduct;
}

interface UpdateProductInput {
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

export function updateVendorProduct(productId: string, input: UpdateProductInput): Product {
  const product = ensureOwnership(productId);
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error("Product not found");

  const now = nowISO();
  const updated = { ...product };

  if (input.title !== undefined) updated.title = input.title.trim();
  if (input.description !== undefined) updated.description = input.description.trim();
  if (input.price !== undefined) updated.price = input.price;
  if (input.originalPrice !== undefined) updated.originalPrice = input.originalPrice ?? undefined;
  if (input.categoryId !== undefined) updated.categoryId = input.categoryId;
  if (input.campusId !== undefined) updated.campusId = input.campusId;
  if (input.condition !== undefined) updated.condition = input.condition;
  if (input.images !== undefined) updated.images = input.images.length > 0 ? input.images : ["/placeholder-product.svg"];
  if (input.location !== undefined) updated.location = input.location?.trim() || undefined;
  if (input.tags !== undefined) updated.tags = input.tags?.map((t) => t.trim()).filter(Boolean);
  if (input.stock !== undefined) updated.stock = input.stock;
  if (input.lowStockThreshold !== undefined) updated.lowStockThreshold = input.lowStockThreshold;
  if (input.costPrice !== undefined) updated.costPrice = input.costPrice ?? undefined;
  if (input.sku !== undefined) updated.sku = input.sku?.trim().toUpperCase() || undefined;
  if (input.hasVariants !== undefined) updated.hasVariants = input.hasVariants;
  if (input.variants !== undefined) updated.variants = input.variants;
  if (input.variantGroups !== undefined) updated.variantGroups = input.variantGroups;

  updated.updatedAt = now;

  products[idx] = updated;
  return updated;
}

export function setProductPublishedStatus(productId: string, status: ProductPublishStatus): ProductPublishResult {
  const product = ensureOwnership(productId);
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error("Product not found");

  const now = nowISO();

  if (status === "active") {
    const errors: Record<string, string> = {};
    if (!product.title?.trim()) errors.title = "Title is required";
    if (!product.description?.trim()) errors.description = "Description is required";
    if (!product.price || product.price <= 0) errors.price = "Valid price is required";
    if (!product.categoryId) errors.categoryId = "Category is required";
    if (!product.campusId) errors.campusId = "Campus is required";
    if (!product.images?.length) errors.images = "At least one image is required";
    if (product.stock === undefined || product.stock < 0) errors.stock = "Stock quantity is required";

    if (Object.keys(errors).length > 0) {
      return { success: false, status: "draft", reason: "Missing required information", errors };
    }

    product.status = "available";
    product.publishedStatus = "active";
    product.updatedAt = now;
  } else if (status === "inactive") {
    product.status = "removed";
    product.publishedStatus = "inactive";
    product.updatedAt = now;
  } else if (status === "archived") {
    product.status = "removed";
    product.publishedStatus = "archived";
    product.archivedAt = now;
    product.updatedAt = now;
  } else if (status === "draft") {
    product.status = "removed";
    product.publishedStatus = "draft";
    product.updatedAt = now;
  } else if (status === "rejected") {
    product.status = "removed";
    product.publishedStatus = "rejected";
    product.updatedAt = now;
  } else if (status === "pending_review") {
    product.status = "removed";
    product.publishedStatus = "pending_review";
    product.updatedAt = now;
  }

  products[idx] = product;
  return { success: true, status: product.publishedStatus ?? "active" };
}

export function archiveVendorProduct(productId: string): Product {
  ensureOwnership(productId);
  setProductPublishedStatus(productId, "archived");
  return ensureOwnership(productId);
}

export function restoreVendorProduct(productId: string): Product {
  const product = ensureOwnership(productId);
  const result = setProductPublishedStatus(productId, "draft");
  return ensureOwnership(productId);
}

export function deleteVendorProduct(productId: string): { success: boolean; reason?: string } {
  const product = ensureOwnership(productId);
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error("Product not found");

  const hasOrders = product.soldCount && product.soldCount > 0;
  if (hasOrders) {
    product.status = "removed";
    product.publishedStatus = "archived";
    product.archivedAt = nowISO();
    product.updatedAt = nowISO();
    products[idx] = product;
    return { success: true, reason: "Product archived (has order history)" };
  }

  products.splice(idx, 1);
  return { success: true };
}

export function getInventoryMovements(productId: string): InventoryMovement[] {
  ensureOwnership(productId);
  return inventoryMovements
    .filter((m) => m.productId === productId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export interface AdjustInventoryInput {
  type: "add" | "subtract" | "set";
  quantity: number;
  reason: string;
  expectedStock?: number;
}

export function adjustInventory(productId: string, input: AdjustInventoryInput): {
  success: boolean;
  movement?: InventoryMovement;
  error?: string;
} {
  const product = ensureOwnership(productId);
  const idx = products.findIndex((p) => p.id === productId);
  if (idx === -1) throw new Error("Product not found");

  const currentStock = product.stock ?? 0;
  if (input.expectedStock !== undefined && input.expectedStock !== currentStock) {
    return { success: false, error: `Stock conflict: expected ${input.expectedStock}, current is ${currentStock}` };
  }

  let newStock: number;
  switch (input.type) {
    case "add":
      newStock = currentStock + input.quantity;
      break;
    case "subtract":
      newStock = Math.max(0, currentStock - input.quantity);
      break;
    case "set":
      newStock = Math.max(0, input.quantity);
      break;
    default:
      return { success: false, error: "Invalid adjustment type" };
  }

  const now = nowISO();
  const movement: InventoryMovement = {
    id: generateId("im"),
    productId,
    type: input.type,
    quantity: input.quantity,
    reason: input.reason.trim(),
    actorId: getCurrentUser().id,
    resultingStock: newStock,
    previousStock: currentStock,
    createdAt: now,
  };

  inventoryMovements.push(movement);

  product.stock = newStock;
  product.updatedAt = now;
  products[idx] = product;

  return { success: true, movement };
}

export function getStockStatus(product: Product): ProductStockStatus {
  const stock = product.stock ?? 0;
  const threshold = product.lowStockThreshold ?? 5;
  if (stock === 0) return "out_of_stock";
  if (stock <= threshold) return "low_stock";
  return "in_stock";
}