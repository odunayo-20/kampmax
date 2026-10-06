import type { Product } from "@/types";
import { getVendorById } from "@/services/users";
import { getProductById } from "@/services/products";
import { getStockForSelection } from "@/components/marketplace/product-detail/types";
import { apiClient, ApiError } from "@/lib/api-client";
import {
  type CartLineItem,
  type CartVendorGroup,
  type CartPricingSummary,
  type CartMergeResult,
  type CartItemValidationStatus,
  type AvailabilityStatus,
} from "@/types/cart";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Cart Module)
// ============================================================

export interface BackendSelectedVariation {
  name: string;
  option: string;
  price?: number;
  sku?: string;
  /** The exact pick per group when the product has several variant groups. */
  choices?: Array<{ name: string; option: string }>;
}

export interface BackendCartItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  categoryId?: string | null;
  campusId?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedVariation: BackendSelectedVariation | null;
  inStock: boolean;
  isActive: boolean;
  availableStock: number;
}

export interface BackendCartItemGroup {
  vendorId: string;
  vendorName: string;
  items: BackendCartItemResponse[];
  subtotal: number;
}

export interface BackendCartResponse {
  id: string;
  items: BackendCartItemGroup[];
  itemCount: number;
  grandTotal: number;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AddCartItemPayload {
  productId: string;
  quantity: number;
  /** One chosen option per variant group; the server prices and checks stock from these. */
  selectedVariations?: Array<{ name: string; option: string }>;
}

export interface UpdateCartItemPayload {
  quantity: number;
}

// ── Local helpers (no I/O) ────────────────────────────────────────────────

const DELIVERY_FEE_HOSTEL = 500;

export function buildPricingSummary(items: CartLineItem[]): CartPricingSummary {
  const itemsSubtotal = items.reduce(
    (sum, i) => sum + (i.unitPrice ?? i.product.price) * i.quantity,
    0
  );
  const hasItems = items.length > 0;
  const deliveryFee = hasItems ? DELIVERY_FEE_HOSTEL : 0;
  const discountTotal = 0; // established at checkout / coupon application
  const total = itemsSubtotal + deliveryFee - discountTotal;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  return { itemsSubtotal, deliveryFee, discountTotal, total, itemCount };
}

const DELIVERY_ESTIMATES: Record<string, string> = {
  v1: "1-2 hours",
  v2: "1-3 hours",
  v3: "30-60 minutes",
  v4: "2-4 hours",
  v5: "2-4 hours",
  v6: "1-2 hours",
  v7: "2-3 hours",
};

export function estimateDelivery(vendorId: string): string {
  return DELIVERY_ESTIMATES[vendorId] || "1-3 hours";
}

export function groupItemsByVendor(
  items: CartLineItem[]
): CartVendorGroup[] {
  const map = new Map<string, CartLineItem[]>();
  for (const item of items) {
    const vid = item.vendorId;
    if (!map.has(vid)) map.set(vid, []);
    map.get(vid)!.push(item);
  }
  return Array.from(map.entries()).map(([vendorId, groupItems]) => {
    const vendor = getVendorById(vendorId);
    return {
      vendorId,
      vendorName: vendor?.storeName,
      verified: vendor?.verified,
      items: groupItems,
      subtotal: groupItems.reduce(
        (sum, i) => sum + (i.unitPrice ?? i.product.price) * i.quantity,
        0
      ),
      delivery: {
        deliveryAvailable: true,
        deliveryMethod: "campus_pickup",
        deliveryFee: 0,
        estimatedDelivery: estimateDelivery(vendorId),
        status: "available",
      },
    };
  });
}

export function makeLineId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `line_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Maps backend CartResponse items into frontend CartLineItem[]
 */
export function mapBackendCartToFrontend(cart: BackendCartResponse): CartLineItem[] {
  if (!cart || !Array.isArray(cart.items)) return [];

  const lines: CartLineItem[] = [];

  for (const group of cart.items) {
    for (const item of group.items) {
      const existingProduct = getProductById(item.productId);

      const product: Product = existingProduct || {
        id: item.productId,
        title: item.productName,
        description: "",
        price: Number(item.unitPrice),
        categoryId: item.categoryId ?? "",
        vendorId: group.vendorId,
        campusId: item.campusId ?? "",
        images: item.productImage ? [item.productImage] : ["/placeholder-product.svg"],
        condition: "New",
        status: item.isActive ? (item.inStock ? "available" : "sold") : "removed",
        createdAt: new Date().toISOString(),
        stock: item.availableStock,
      };

      const picks = item.selectedVariation
        ? item.selectedVariation.choices?.length
          ? item.selectedVariation.choices
          : [{ name: item.selectedVariation.name, option: item.selectedVariation.option }]
        : [];
      const selectedVariants = picks.length
        ? Object.fromEntries(picks.map((p) => [p.name, p.option]))
        : undefined;

      const variantLabel = picks.length
        ? picks.map((p) => `${p.name}: ${p.option}`).join(" · ")
        : undefined;

      const availabilityStatus: AvailabilityStatus =
        !item.isActive
          ? "unavailable"
          : !item.inStock
          ? "out_of_stock"
          : "available";

      lines.push({
        id: item.id,
        productId: item.productId,
        vendorId: group.vendorId,
        product,
        quantity: item.quantity,
        variantLabel,
        selectedVariants,
        savedForLater: false,
        availableStock: item.availableStock,
        maxPurchaseQuantity: Math.min(10, item.availableStock || 10),
        availabilityStatus,
        validationStatus: "valid",
        unitPrice: Number(item.unitPrice),
      });
    }
  }

  return lines;
}

/**
 * Turn a selected product + quantity into a cart line, enriching it with
 * stock/availability computed from the current catalog.
 */
export function buildCartLine(
  product: Product,
  quantity: number,
  options?: {
    variantLabel?: string;
    selectedVariants?: Record<string, string>;
    unitPrice?: number;
  }
): CartLineItem {
  const selectedVariants = options?.selectedVariants;
  const stock = selectedVariants
    ? getStockForSelection(product, selectedVariants)
    : undefined;

  const availabilityStatus: AvailabilityStatus =
    product.status !== "available"
      ? "unavailable"
      : stock === 0
      ? "out_of_stock"
      : "available";

  const maxPurchaseQuantity =
    availabilityStatus === "available" ? Math.min(10, stock ?? 10) : 0;

  return {
    id: makeLineId(),
    productId: product.id,
    vendorId: product.vendorId,
    product,
    quantity: Math.max(1, quantity),
    variantLabel: options?.variantLabel,
    selectedVariants,
    savedForLater: false,
    availableStock: stock,
    maxPurchaseQuantity,
    availabilityStatus,
    validationStatus: "valid",
    unitPrice: options?.unitPrice ?? product.price,
  };
}

/**
 * Merge a guest cart with an authenticated (server) cart.
 */
export function mergeCarts(
  guest: CartLineItem[],
  server: CartLineItem[]
): CartMergeResult {
  const adjustments: CartMergeResult["adjustments"] = [];
  const removedItems: string[] = [];

  const key = (i: CartLineItem) =>
    `${i.productId}::${JSON.stringify(i.selectedVariants ?? {})}`;

  const byKey = new Map<string, CartLineItem>();
  for (const item of server) byKey.set(key(item), { ...item });

  for (const g of guest) {
    const k = key(g);
    const existing = byKey.get(k);
    if (existing) {
      const combinedQty = existing.quantity + g.quantity;
      const cap = Math.max(
        1,
        (g.maxPurchaseQuantity ?? Number.POSITIVE_INFINITY) <
          (existing.maxPurchaseQuantity ?? Number.POSITIVE_INFINITY)
          ? g.maxPurchaseQuantity ?? existing.maxPurchaseQuantity ?? 1
          : existing.maxPurchaseQuantity ?? g.maxPurchaseQuantity ?? 1
      );
      const finalQty = Math.min(combinedQty, cap);
      existing.quantity = finalQty;
      if (finalQty !== combinedQty) {
        adjustments.push({
          productId: g.productId,
          from: combinedQty,
          to: finalQty,
          reason: "Quantity adjusted to respect the maximum purchase limit.",
        });
      }
    } else {
      byKey.set(k, { ...g, quantity: Math.min(g.quantity, g.maxPurchaseQuantity ?? g.quantity) });
    }
  }

  // Retain ordering of the server cart, then append new guest lines.
  const mergedItems = Array.from(byKey.values());

  return { mergedItems, adjustments, removedItems };
}

// ============================================================
// ASYNC API CLIENT METHODS (Connecting to NestJS /cart)
// ============================================================

/**
 * Fetch authenticated server cart.
 * GET /api/v1/cart
 */
export async function fetchServerCart(): Promise<{
  cart: BackendCartResponse | null;
  items: CartLineItem[];
  error: ApiError | null;
}> {
  const { data, error } = await apiClient.get<BackendCartResponse>("/cart");

  if (error || !data || !data.id) {
    return { cart: null, items: [], error };
  }

  const items = mapBackendCartToFrontend(data);
  return { cart: data, items, error: null };
}

/**
 * Add an item to authenticated server cart.
 * POST /api/v1/cart/items
 */
export async function addToServerCart(
  payload: AddCartItemPayload
): Promise<{ cart: BackendCartResponse | null; items: CartLineItem[]; error: ApiError | null }> {
  const { data, error } = await apiClient.post<AddCartItemPayload, BackendCartResponse>(
    "/cart/items",
    payload
  );

  if (error || !data || !data.id) {
    return { cart: null, items: [], error };
  }

  const items = mapBackendCartToFrontend(data);
  return { cart: data, items, error: null };
}

/**
 * Update quantity of a cart item in authenticated server cart.
 * PATCH /api/v1/cart/items/:id
 */
export async function updateServerCartItem(
  itemId: string,
  payload: UpdateCartItemPayload
): Promise<{ cart: BackendCartResponse | null; items: CartLineItem[]; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<UpdateCartItemPayload, BackendCartResponse>(
    `/cart/items/${itemId}`,
    payload
  );

  if (error || !data || !data.id) {
    return { cart: null, items: [], error };
  }

  const items = mapBackendCartToFrontend(data);
  return { cart: data, items, error: null };
}

/**
 * Remove an item from authenticated server cart.
 * DELETE /api/v1/cart/items/:id
 */
export async function removeServerCartItem(
  itemId: string
): Promise<{ cart: BackendCartResponse | null; items: CartLineItem[]; error: ApiError | null }> {
  const { data, error } = await apiClient.delete<BackendCartResponse>(`/cart/items/${itemId}`);

  if (error || !data || !data.id) {
    return { cart: null, items: [], error };
  }

  const items = mapBackendCartToFrontend(data);
  return { cart: data, items, error: null };
}

/**
 * Clear entire authenticated server cart.
 * DELETE /api/v1/cart
 */
export async function clearServerCart(): Promise<{ success: boolean; error: ApiError | null }> {
  const { error } = await apiClient.delete<{ message: string }>("/cart");

  if (error) {
    return { success: false, error };
  }

  return { success: true, error: null };
}

/**
 * Backward-compatible synchronous placeholder.
 */
export function getServerCart(customerId?: string): CartLineItem[] {
  void customerId;
  return [];
}

/**
 * Validate cart lines against the current catalog (product status, stock).
 */
export function validateCartItems(
  items: CartLineItem[]
): Array<{
  id: string;
  status: CartItemValidationStatus;
  message?: string;
}> {
  return items.map((item) => {
    const product = getProductById(item.productId);

    if (!product) {
      return {
        id: item.id,
        status: "unavailable",
        message: "This product is no longer available.",
      };
    }

    if (product.status !== "available") {
      return {
        id: item.id,
        status: "unavailable",
        message: "This product is no longer available.",
      };
    }

    const vendor = getVendorById(product.vendorId);
    if (!vendor) {
      return {
        id: item.id,
        status: "vendor_unavailable",
        message: "This vendor is currently unavailable.",
      };
    }

    const stock = item.selectedVariants
      ? getStockForSelection(product, item.selectedVariants)
      : undefined;
    if (stock === 0) {
      return {
        id: item.id,
        status: "out_of_stock",
        message: "Sorry, this item is out of stock.",
      };
    }

    const stored = item.unitPrice ?? product.price;
    if (stored !== product.price && item.unitPrice !== undefined) {
      const increased = product.price > stored;
      return {
        id: item.id,
        status: "price_changed",
        message: increased
          ? "This item's price increased since you added it to your cart."
          : "This item's price changed since you added it to your cart.",
      };
    }

    return { id: item.id, status: "valid" };
  });
}
