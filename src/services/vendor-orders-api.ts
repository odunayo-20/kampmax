import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  VendorFulfillmentStatus,
  VendorOrder,
  VendorOrderActionView,
  VendorOrderCounts,
  VendorOrderPage,
  VendorOrderQuery,
  VendorPaymentStatus,
} from "@/types/vendor-orders";

// ============================================================
// VENDOR ORDERS — LIVE API LAYER
// ============================================================
//   GET   /orders/vendor            → paginated list (status, search, page, limit)
//   GET   /orders/vendor/:id        → owner-scoped detail
//   PATCH /orders/:id/status        → fulfillment transition { status, note? }
//   GET   /analytics/vendor/orders/status → per-status counts
//
// The backend owns authorization (vendor resolved from the JWT) and validates
// every transition; the UI only reflects what it allows.

type BackendOrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

interface BackendOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number | string;
}

interface BackendVendorOrderBase {
  id: string;
  orderNumber: string;
  vendorId: string;
  vendorName: string;
  customerName: string;
  status: BackendOrderStatus;
  subtotal: number | string;
  deliveryFee: number | string;
  discountAmount?: number | string;
  platformFee?: number | string;
  vendorPayout?: number | string;
  totalAmount: number | string;
  createdAt: string;
}

interface BackendVendorOrderListItem extends BackendVendorOrderBase {
  paymentStatus: string | null;
  items: { productName: string; quantity: number }[];
}

interface BackendVendorOrderDetail extends BackendVendorOrderBase {
  updatedAt: string;
  notes: string | null;
  customerPhone: string;
  settledAt?: string | null;
  paymentStatus: string | null;
  items: (BackendOrderItem & { id: string })[];
  address: {
    address: string;
    city: string;
    campus: string | null;
    locationNote: string | null;
  };
  statusHistory: {
    id: string;
    status: BackendOrderStatus;
    note: string | null;
    createdAt: string;
  }[];
}

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

// ── Status mapping ───────────────────────────────────────────

const TO_FULFILLMENT: Record<BackendOrderStatus, VendorFulfillmentStatus> = {
  PENDING: "pending",
  CONFIRMED: "accepted",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "cancelled",
};

const TO_BACKEND: Partial<Record<VendorFulfillmentStatus, BackendOrderStatus>> = {
  pending: "PENDING",
  accepted: "CONFIRMED",
  processing: "PROCESSING",
  shipped: "SHIPPED",
  delivered: "DELIVERED",
  cancelled: "CANCELLED",
};

const TO_PAYMENT: Record<string, VendorPaymentStatus> = {
  SUCCESS: "paid",
  PENDING: "processing",
  INITIALIZED: "pending",
  FAILED: "failed",
  ABANDONED: "failed",
  REFUNDED: "refunded",
};

function toPayment(status: string | null | undefined): VendorPaymentStatus {
  return (status && TO_PAYMENT[status]) || "pending";
}

const STATUS_TITLE: Record<BackendOrderStatus, string> = {
  PENDING: "Order placed",
  CONFIRMED: "Order accepted",
  PROCESSING: "Processing",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

const STATUS_EVENT: Record<BackendOrderStatus, VendorOrder["timeline"][number]["kind"]> = {
  PENDING: "placed",
  CONFIRMED: "accepted",
  PROCESSING: "processing",
  SHIPPED: "shipped",
  DELIVERED: "delivered",
  CANCELLED: "cancelled",
  REFUNDED: "cancelled",
};

// ── Mapping ──────────────────────────────────────────────────

const NO_DISPUTE: VendorOrder["dispute"] = { status: "none", timeline: [] };
const NO_REFUND: VendorOrder["refund"] = { status: "none" };

function mapBase(raw: BackendVendorOrderBase): Omit<VendorOrder, "items" | "timeline" | "updatedAt"> {
  const itemsSubtotal = Number(raw.subtotal);
  const deliveryFee = Number(raw.deliveryFee);
  const discount = Number(raw.discountAmount ?? 0);
  // The platform fee is charged to the vendor and deducted from the payout;
  // the customer's total never includes it.
  const platformFee = Number(raw.platformFee ?? 0);
  const vendorPayout = Number(raw.vendorPayout ?? Number(raw.totalAmount) - platformFee);
  return {
    id: raw.id,
    parentOrderId: raw.id,
    vendorId: raw.vendorId,
    storeName: raw.vendorName,
    customer: { buyerId: "", displayName: raw.customerName },
    totals: {
      itemsSubtotal,
      deliveryFee,
      platformFee,
      discount,
      vendorPayout,
      vendorSubtotal: vendorPayout + platformFee,
      customerTotal: Number(raw.totalAmount),
    },
    fulfillmentStatus: TO_FULFILLMENT[raw.status],
    paymentStatus: "pending",
    paymentMethod: "paystack",
    deliveryMethod: "campus_pickup",
    escrow: { state: "none" },
    dispute: NO_DISPUTE,
    refund: NO_REFUND,
    flags: [],
    notes: [],
    createdAt: raw.createdAt,
  };
}

export function mapVendorOrderListItem(raw: BackendVendorOrderListItem): VendorOrder {
  return {
    ...mapBase(raw),
    // The list endpoint reports the order number; the UUID stays the route id.
    items: raw.items.map((i, idx) => ({
      productId: `${raw.id}-${idx}`,
      title: i.productName,
      quantity: i.quantity,
      unitPrice: 0,
    })),
    paymentStatus: toPayment(raw.paymentStatus),
    timeline: [],
    updatedAt: raw.createdAt,
    orderNumber: raw.orderNumber,
  };
}

export function mapVendorOrderDetail(raw: BackendVendorOrderDetail): VendorOrder {
  const base = mapBase(raw);
  const payment = toPayment(raw.paymentStatus);
  const deliveryAddress = [raw.address.address, raw.address.city, raw.address.campus]
    .filter(Boolean)
    .join(", ");
  return {
    ...base,
    customer: {
      buyerId: "",
      displayName: raw.customerName,
      phone: raw.customerPhone || undefined,
      campusLabel: raw.address.campus ?? undefined,
    },
    items: raw.items.map((i) => ({
      productId: i.productId,
      title: i.productName,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
    })),
    paymentStatus: payment,
    deliveryAddress: deliveryAddress || undefined,
    escrow: raw.settledAt
      ? {
          state: "released",
          displayAmount: Number(raw.vendorPayout ?? 0),
          updatedAt: raw.settledAt,
          note: "Released to your wallet after delivery.",
        }
      : {
          state: payment === "paid" ? "funds_held" : "none",
          displayAmount: payment === "paid" ? Number(raw.vendorPayout ?? raw.totalAmount) : undefined,
        },
    timeline: raw.statusHistory.map((h) => ({
      id: h.id,
      kind: STATUS_EVENT[h.status],
      title: STATUS_TITLE[h.status],
      detail: h.note ?? undefined,
      at: h.createdAt,
    })),
    updatedAt: raw.updatedAt,
    orderNumber: raw.orderNumber,
  };
}

// ── Fetchers ─────────────────────────────────────────────────

export async function fetchVendorOrders(
  query: VendorOrderQuery = {}
): Promise<VendorOrderPage<VendorOrder>> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  const status = query.fulfillmentStatus && query.fulfillmentStatus !== "all"
    ? TO_BACKEND[query.fulfillmentStatus]
    : undefined;
  if (status) params.set("status", status);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.pageSize ?? 12));

  const page = await unwrap(
    apiClient.get<BackendPage<BackendVendorOrderListItem>>(`/orders/vendor?${params}`)
  );
  return {
    items: page.items.map(mapVendorOrderListItem),
    total: page.meta.total,
    page: page.meta.page,
    pageSize: page.meta.limit,
    totalPages: Math.max(1, page.meta.totalPages),
  };
}

export async function fetchVendorOrder(id: string): Promise<VendorOrder> {
  const raw = await unwrap(apiClient.get<BackendVendorOrderDetail>(`/orders/vendor/${id}`));
  return mapVendorOrderDetail(raw);
}

export async function fetchVendorOrderCounts(): Promise<VendorOrderCounts> {
  const rows = await unwrap(
    apiClient.get<{ status: string; count: number }[]>("/analytics/vendor/orders/status")
  );
  const n = (s: string) => rows.find((r) => r.status === s)?.count ?? 0;
  const pending = n("PENDING");
  const accepted = n("CONFIRMED");
  const processing = n("PROCESSING");
  return {
    all: rows.reduce((sum, r) => sum + r.count, 0),
    needsAction: pending + accepted + processing,
    pending,
    accepted,
    processing,
    readyForPickup: 0,
    shipped: n("SHIPPED"),
    outForDelivery: 0,
    delivered: n("DELIVERED"),
    completed: 0,
    cancelled: n("CANCELLED") + n("REFUNDED"),
    paymentPending: 0,
    withIssues: 0,
  };
}

/** Moves an order to `status`; the backend validates the transition. */
export async function transitionVendorOrder(
  id: string,
  status: BackendOrderStatus,
  note?: string
): Promise<void> {
  await unwrap(apiClient.patch<{ status: BackendOrderStatus; note?: string }, unknown>(
    `/orders/${id}/status`,
    { status, note }
  ));
}

// ── Available actions (real transitions only) ────────────────

export type VendorOrderTransitionKey = "accept" | "process" | "ship" | "deliver" | "cancel";

export const TRANSITION_TARGET: Record<VendorOrderTransitionKey, BackendOrderStatus> = {
  accept: "CONFIRMED",
  process: "PROCESSING",
  ship: "SHIPPED",
  deliver: "DELIVERED",
  cancel: "CANCELLED",
};

export function getRealVendorOrderActions(order: VendorOrder): VendorOrderActionView[] {
  if (order.paymentStatus !== "paid") return [];
  const actions: VendorOrderActionView[] = [];
  const s = order.fulfillmentStatus;

  if (s === "pending") {
    actions.push({ key: "accept", label: "Accept order", variant: "primary", description: "Confirm you can fulfill this order." });
  } else if (s === "accepted") {
    actions.push({ key: "process", label: "Start processing", variant: "primary", description: "Begin preparing the items." });
  } else if (s === "processing") {
    actions.push({ key: "ship", label: "Mark as shipped", variant: "primary", description: "The order is on its way to the buyer." });
  } else if (s === "shipped") {
    actions.push({ key: "deliver", label: "Mark delivered", variant: "primary", description: "Confirm the buyer received the order." });
  }
  if (s === "pending" || s === "accepted" || s === "processing") {
    actions.push({
      key: "cancel",
      label: "Cancel order",
      variant: "destructive",
      description: "Cancel the order and restore stock.",
      requiresPayload: true,
    });
  }
  return actions;
}
