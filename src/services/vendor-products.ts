import { apiClient } from "@/lib/api-client";
import { getCurrentUser, getVendorByUserId } from "./users";
import { getProductsByVendor, getProductById } from "./products";
import { getCategories } from "./categories";
import { getCampuses } from "./campus";
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

export async function getVendorProductsApi(query: VendorProductQuery = {}): Promise<VendorProductPage<Product>> {
  const params = new URLSearchParams();
  if (query.search) params.append("search", query.search);
  if (query.status && query.status !== "all") params.append("status", query.status);
  if (query.page) params.append("page", String(query.page));
  if (query.pageSize) params.append("pageSize", String(query.pageSize));

  const { data, error } = await apiClient.get<VendorProductPage<Product>>(`/products/vendor?${params.toString()}`);
  if (!error && data && Array.isArray(data.items)) {
    return data;
  }
  return getVendorProducts(query);
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