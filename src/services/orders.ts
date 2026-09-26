import { Order, OrderStatus, DeliveryMethod, PaymentMethod, PaymentStatus, OrderTimelineEntry, CartItem, Product } from "@/types";
import { getProductById } from "@/services/products";
import { apiClient, ApiError } from "@/lib/api-client";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Orders Module)
// ============================================================

export type BackendOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export interface BackendOrderItemResponse {
  id: string;
  productId: string;
  productName: string;
  productSlug: string;
  productImage: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedVariation: { name: string; option: string } | null;
}

export interface BackendOrderAddressResponse {
  id: string;
  fullName: string;
  phone: string;
  address: string;
  city: string;
  campus: string | null;
  locationNote: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface BackendOrderStatusHistoryResponse {
  id: string;
  status: BackendOrderStatus;
  note: string | null;
  changedBy: string | null;
  createdAt: string | Date;
}

export interface BackendOrderListItem {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  campusId: string;
  status: BackendOrderStatus;
  subtotal: number;
  deliveryFee: number;
  discountAmount?: number | string;
  promotionCode?: string | null;
  totalAmount: number;
  itemCount: number;
  createdAt: string | Date;
}

export interface BackendOrderDetail extends BackendOrderListItem {
  notes: string | null;
  items: BackendOrderItemResponse[];
  address: BackendOrderAddressResponse;
  statusHistory: BackendOrderStatusHistoryResponse[];
  updatedAt: string | Date;
}

export interface BackendPaginatedOrders {
  items: BackendOrderListItem[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CheckoutAddressPayload {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  campus?: string;
  locationNote?: string;
  latitude?: number;
  longitude?: number;
}

export interface CheckoutPayload {
  vendorId?: string;
  address: CheckoutAddressPayload;
  notes?: string;
  deliveryFee?: number;
  /** Promotion code to apply; the server re-validates and prices it. */
  promotionCode?: string;
}

// In-memory cache for fast lookups and sync fallbacks
let cachedOrders: Order[] = [];

/**
 * Maps backend OrderStatus enum to frontend OrderStatus union.
 */
export function mapBackendOrderStatusToFrontend(status: BackendOrderStatus | string): OrderStatus {
  switch (status) {
    case "PENDING":
      return "placed";
    case "CONFIRMED":
      return "confirmed";
    case "PROCESSING":
      return "preparing";
    case "SHIPPED":
      return "out_for_delivery";
    case "DELIVERED":
      return "delivered";
    case "CANCELLED":
    case "REFUNDED":
      return "cancelled";
    default:
      return "placed";
  }
}

/**
 * Maps frontend OrderStatus union to backend OrderStatus enum.
 */
export function mapFrontendOrderStatusToBackend(status: OrderStatus): BackendOrderStatus {
  switch (status) {
    case "placed":
      return "PENDING";
    case "confirmed":
      return "CONFIRMED";
    case "preparing":
      return "PROCESSING";
    case "ready":
      return "PROCESSING";
    case "out_for_delivery":
      return "SHIPPED";
    case "delivered":
      return "DELIVERED";
    case "cancelled":
      return "CANCELLED";
    default:
      return "PENDING";
  }
}

/**
 * Maps backend OrderListItem or OrderDetail to frontend Order model.
 */
export function mapBackendOrderToFrontend(
  raw: BackendOrderDetail | (BackendOrderListItem & Partial<BackendOrderDetail>)
): Order {
  const subtotal = Number(raw.subtotal || 0);
  const deliveryFee = Number(raw.deliveryFee || 0);
  const totalAmount = Number(raw.totalAmount || subtotal + deliveryFee);
  const discountAmount = Number(raw.discountAmount || 0);
  // The platform fee is charged to the vendor and is not part of the customer's total.
  const platformFee = 0;

  const items: CartItem[] = (raw.items || []).map((item) => {
    const existingProduct = getProductById(item.productId);
    const product: Product = existingProduct || {
      id: item.productId,
      title: item.productName || "Product",
      description: item.productName || "",
      price: Number(item.unitPrice || 0),
      categoryId: "general",
      vendorId: raw.vendorId,
      campusId: raw.campusId || "",
      images: item.productImage ? [item.productImage] : [],
      condition: "New",
      status: "available",
      createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    };

    return {
      product,
      quantity: Number(item.quantity || 1),
    };
  });

  const timeline: OrderTimelineEntry[] = (raw.statusHistory || []).map((sh) => ({
    status: mapBackendOrderStatusToFrontend(sh.status),
    timestamp: typeof sh.createdAt === "string" ? sh.createdAt : new Date(sh.createdAt).toISOString(),
    message: sh.note || `Order status updated to ${sh.status.toLowerCase()}`,
  }));

  if (timeline.length === 0) {
    timeline.push({
      status: mapBackendOrderStatusToFrontend(raw.status),
      timestamp: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString(),
      message: "Order placed successfully",
    });
  }

  const deliveryAddress = raw.address
    ? [raw.address.address, raw.address.campus, raw.address.city].filter(Boolean).join(", ")
    : undefined;

  const createdAtStr = typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString();
  const updatedAtStr = raw.updatedAt
    ? typeof raw.updatedAt === "string"
      ? raw.updatedAt
      : new Date(raw.updatedAt).toISOString()
    : undefined;

  let paymentStatus: PaymentStatus = "pending";
  if (raw.status === "CONFIRMED" || raw.status === "PROCESSING" || raw.status === "SHIPPED" || raw.status === "DELIVERED") {
    paymentStatus = "paid";
  } else if (raw.status === "REFUNDED") {
    paymentStatus = "refunded";
  }

  return {
    id: raw.orderNumber || raw.id,
    backendId: raw.id,
    buyerId: "", // authorized user
    vendorId: raw.vendorId,
    items: items,
    subtotal,
    platformFee,
    deliveryFee,
    discountAmount,
    total: totalAmount,
    status: mapBackendOrderStatusToFrontend(raw.status),
    deliveryMethod: "delivery",
    deliveryAddress,
    paymentMethod: "paystack",
    paymentStatus,
    createdAt: createdAtStr,
    updatedAt: updatedAtStr,
    notes: raw.notes || undefined,
    timeline,
  };
}

// ============================================================
// ASYNC API CLIENT METHODS
// ============================================================

export interface FetchOrdersParams {
  page?: number;
  limit?: number;
}

/**
 * Fetch authenticated user orders from backend API.
 * GET /api/v1/orders
 */
export async function fetchOrders(
  params: FetchOrdersParams = {}
): Promise<{ data: Order[]; total: number; page: number; limit: number; totalPages: number; error: ApiError | null }> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));

  const queryString = searchParams.toString();
  const path = `/orders${queryString ? `?${queryString}` : ""}`;

  const { data, error } = await apiClient.get<BackendPaginatedOrders>(path);

  if (error || !data || !Array.isArray(data.items)) {
    return {
      data: cachedOrders,
      total: cachedOrders.length,
      page: 1,
      limit: params.limit || 20,
      totalPages: 1,
      error,
    };
  }

  const mapped = data.items.map(mapBackendOrderToFrontend);
  // Update cache
  cachedOrders = mapped;

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
 * Fetch single order detail from backend API.
 * GET /api/v1/orders/:id
 */
export async function fetchOrderById(
  id: string
): Promise<{ data: Order | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendOrderDetail>(`/orders/${id}`);

  if (error || !data || !data.id) {
    const fallback = cachedOrders.find((o) => o.id === id) || null;
    return { data: fallback, error };
  }

  const mapped = mapBackendOrderToFrontend(data);

  // Update in cache
  const idx = cachedOrders.findIndex((o) => o.id === mapped.id || o.id === id);
  if (idx >= 0) {
    cachedOrders[idx] = mapped;
  } else {
    cachedOrders.unshift(mapped);
  }

  return { data: mapped, error: null };
}

/**
 * Checkout active cart and create orders.
 * POST /api/v1/orders/checkout
 */
export async function checkoutOrdersApi(
  payload: CheckoutPayload
): Promise<{ data: Order[]; error: ApiError | null }> {
  const { data, error } = await apiClient.post<CheckoutPayload, BackendOrderDetail[]>(
    "/orders/checkout",
    payload
  );

  if (error || !data || !Array.isArray(data)) {
    return { data: [], error };
  }

  const mapped = data.map(mapBackendOrderToFrontend);
  mapped.forEach((order) => {
    cachedOrders.unshift(order);
  });

  return { data: mapped, error: null };
}

/**
 * Cancel a pending order.
 * PATCH /api/v1/orders/:id/cancel
 */
export async function cancelOrderApi(
  id: string
): Promise<{ data: Order | null; error: ApiError | null }> {
  const { data, error } = await apiClient.patch<Record<string, never>, BackendOrderDetail>(
    `/orders/${id}/cancel`,
    {}
  );

  if (error || !data || !data.id) {
    return { data: null, error };
  }

  const mapped = mapBackendOrderToFrontend(data);
  const idx = cachedOrders.findIndex((o) => o.id === id || o.id === mapped.id);
  if (idx >= 0) {
    cachedOrders[idx] = mapped;
  }

  return { data: mapped, error: null };
}

// ============================================================
// SYNCHRONOUS FALLBACK GETTERS (for non-async components)
// ============================================================

export function getOrders(): Order[] {
  return cachedOrders;
}

export function getOrderById(id: string): Order | undefined {
  return cachedOrders.find((o) => o.id === id);
}

export function getOrdersByUser(userId: string): Order[] {
  return cachedOrders.filter((o) => !o.buyerId || o.buyerId === userId);
}

export function getActiveOrders(userId: string): Order[] {
  return getOrdersByUser(userId).filter(
    (o) =>
      o.status === "placed" ||
      o.status === "confirmed" ||
      o.status === "preparing" ||
      o.status === "ready" ||
      o.status === "out_for_delivery"
  );
}

export function getCompletedOrders(userId: string): Order[] {
  return getOrdersByUser(userId).filter((o) => o.status === "delivered");
}

export function getCancelledOrders(userId: string): Order[] {
  return getOrdersByUser(userId).filter((o) => o.status === "cancelled");
}
