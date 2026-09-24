import type { PaymentMethod } from "@/types";

// ============================================================
// VENDOR ORDERS & FULFILLMENT DOMAIN  (Module 12)
// ============================================================
//
// Backend-authoritative model. The frontend never decides a status transition,
// expiry, escrow/refund/dispute outcome, or what another vendor may see. Every
// status, transition, event and permission below is reflected so the UI can
// render exactly what the backend reports (symbol {@link #authn}).
//
// Multi-vendor isolation: a customer checkout creates a PARENT order that can
// hold one or more VENDOR ORDERS (slices, one per seller). A vendor can only
// ever see the slice(s) owned by their own vendor record. Ownership is derived
// from the authenticated identity, never from client-supplied ids.

// ── Fulfillment status (delivery lifecycle) ──────────────────

export const VENDOR_FULFILLMENT_STATUS = {
  PENDING: "pending",
  ACCEPTED: "accepted",
  PROCESSING: "processing",
  READY_FOR_PICKUP: "ready_for_pickup",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type VendorFulfillmentStatus = ValuesOf<typeof VENDOR_FULFILLMENT_STATUS>;

// ── Payment status (escrow-backed, separate from fulfillment) ─

export const VENDOR_PAYMENT_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  PAID: "paid",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
  FAILED: "failed",
} as const;

export type VendorPaymentStatus = ValuesOf<typeof VENDOR_PAYMENT_STATUS>;

// ── Delivery method ──────────────────────────────────────────

export const VENDOR_DELIVERY_METHOD = {
  CAMPUS_PICKUP: "campus_pickup",
  DELIVERY: "delivery",
} as const;

export type VendorDeliveryMethod = ValuesOf<typeof VENDOR_DELIVERY_METHOD>;

// ── Escrow readiness (display-only; channeling handled by escrow engine) ─

export const VENDOR_ESCROW_STATE = {
  NONE: "none",
  FUNDS_HELD: "funds_held",
  AWAITING_FULFILLMENT: "awaiting_fulfillment",
  RELEASE_ELIGIBLE: "release_eligible",
  RELEASED: "released",
  REFUNDED: "refunded",
} as const;

export type VendorEscrowState = ValuesOf<typeof VENDOR_ESCROW_STATE>;

export interface VendorEscrowInfo {
  state: VendorEscrowState;
  /** Backend-reported working balance (display only; no withdrawal here). */
  displayAmount?: number;
  updatedAt?: string;
  note?: string;
}

// ── Dispute / issues (view + respond readiness, no resolution) ─

export const VENDOR_DISPUTE_STATUS = {
  NONE: "none",
  OPENED: "opened",
  UNDER_REVIEW: "under_review",
  REQUIREMENTS_SENT: "requirements_sent",
  RESOLVED: "resolved",
  CLOSED: "closed",
} as const;

export type VendorDisputeStatus = ValuesOf<typeof VENDOR_DISPUTE_STATUS>;

export interface VendorDisputeEvent {
  id: string;
  role: "customer" | "vendor" | "support";
  title: string;
  detail?: string;
  at: string;
}

export interface VendorDisputeInfo {
  status: VendorDisputeStatus;
  openedAt?: string;
  reason?: string;
  customerClaim?: string;
  timeline: VendorDisputeEvent[];
}

export const VENDOR_ISSUE_TYPE = {
  DELAY: "delay",
  STOCK_SHORTAGE: "stock_shortage",
  DELIVERY_EXCEPTION: "delivery_exception",
  DAMAGED_ITEM: "damaged_item",
  WRONG_ITEM: "wrong_item",
  DISPUTE_OPENED: "dispute_opened",
  PAYMENT_ISSUE: "payment_issue",
  OTHER: "other",
} as const;

export type VendorIssueType = ValuesOf<typeof VENDOR_ISSUE_TYPE>;
export type VendorIssueSeverity = "low" | "medium" | "high";
export type VendorIssueStatus = "open" | "info" | "escalated" | "resolved";

export interface VendorOrderFlag {
  id: string;
  type: VendorIssueType;
  title: string;
  detail?: string;
  severity: VendorIssueSeverity;
  status: VendorIssueStatus;
  createdAt: string;
}

// ── Refund readiness (read-only states) ──────────────────────

export const VENDOR_REFUND_STATUS = {
  NONE: "none",
  REQUESTED: "requested",
  PENDING: "pending",
  APPROVED: "approved",
  PROCESSING: "processing",
  REFUNDED: "refunded",
  REJECTED: "rejected",
} as const;

export type VendorRefundStatus = ValuesOf<typeof VENDOR_REFUND_STATUS>;

export interface VendorRefundInfo {
  status: VendorRefundStatus;
  amount?: number;
  reason?: string;
  requestedAt?: string;
  updatedAt?: string;
}

// ── Shipment / pickup / delivery details ─────────────────────

export interface VendorShipmentInfo {
  carrier: string;
  trackingNumber: string;
  shippedAt: string;
  deliveredAt?: string;
}

export interface VendorPickupInfo {
  location: string;
  instructions?: string;
  /** Backend-issued pickup code — only shown when backend reports it. */
  pickupCode?: string;
  readyForPickupAt?: string;
  collectedAt?: string;
}

// ── Internal notes (NEVER customer-visible) ──────────────────

export type VendorNoteAuthorRole = "vendor" | "staff";

export interface VendorOrderNote {
  id: string;
  scope: "internal";
  authorRole: VendorNoteAuthorRole;
  body: string;
  createdAt: string;
}

// ── Customer communication (messaging readiness) ─────────────

export interface VendorCustomerInfo {
  buyerId: string;
  displayName: string;
  /** Contact for fulfillment only when the buyer opted in. */
  phone?: string;
  campusLabel?: string;
}

export interface VendorConversationRef {
  channel: "kampmax_chat";
  /** Present when a chat thread already exists for this pair. */
  conversationId?: string;
  lastMessageAt?: string;
}

// ── Timeline (backend-provided; never fabricated by the UI) ──

export const VENDOR_ORDER_EVENT = {
  PLACED: "placed",
  PAYMENT_PAID: "payment_paid",
  PAYMENT_PROCESSING: "payment_processing",
  ACCEPTED: "accepted",
  PROCESSING: "processing",
  READY_FOR_PICKUP: "ready_for_pickup",
  SHIPPED: "shipped",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVERED: "delivered",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  REFUND_REQUESTED: "refund_requested",
  DISPUTE_OPENED: "dispute_opened",
  VENDOR_RESPONDED: "vendor_responded",
  NOTE_ADDED: "note_added",
  EXPIRED: "expired",
} as const;

export type VendorOrderEventKind = ValuesOf<typeof VENDOR_ORDER_EVENT>;

export interface VendorOrderTimelineEvent {
  id: string;
  kind: VendorOrderEventKind;
  title: string;
  detail?: string;
  actor?: string;
  at: string;
}

// ── Order line items / totals ────────────────────────────────

export interface VendorOrderItem {
  productId: string;
  title: string;
  quantity: number;
  unitPrice: number;
  sku?: string;
}

export interface VendorOrderTotals {
  itemsSubtotal: number;
  deliveryFee: number;
  platformFee: number;
  /** Money the vendor will receive after platform fee + delivery (escrow). */
  vendorSubtotal: number;
  customerTotal: number;
}

// ── Parent order (customer checkout) ─────────────────────────

export interface VendorParentOrder {
  id: string;
  buyerId: string;
  buyerDisplayName: string;
  createdAt: string;
  /** Sellers involved; names only — never another seller's rows/items. */
  vendorSellers: { vendorId: string; storeName: string }[];
  vendorOrderIds: string[];
  status: VendorFulfillmentStatus;
  customerTotal: number;
}

// ── The vendor order slice ───────────────────────────────────

export interface VendorOrder {
  id: string;
  /** Human-readable order reference (e.g. KMP-1042); `id` is the route key. */
  orderNumber?: string;
  parentOrderId: string;
  vendorId: string;
  storeName: string;
  customer: VendorCustomerInfo;
  items: VendorOrderItem[];
  totals: VendorOrderTotals;
  fulfillmentStatus: VendorFulfillmentStatus;
  paymentStatus: VendorPaymentStatus;
  paymentMethod: PaymentMethod;
  deliveryMethod: VendorDeliveryMethod;
  deliveryAddress?: string;
  pickup?: VendorPickupInfo;
  shipment?: VendorShipmentInfo;
  escrow: VendorEscrowInfo;
  dispute: VendorDisputeInfo;
  refund: VendorRefundInfo;
  flags: VendorOrderFlag[];
  notes: VendorOrderNote[];
  conversation?: VendorConversationRef;
  timeline: VendorOrderTimelineEvent[];
  /** When a stuck pending-payment order lapses. */
  expiredAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ── Permission model (presentation; backend stays authoritative) ─

export const VENDOR_ORDER_PERMISSION_KEYS = [
  "orders.view",
  "orders.accept",
  "orders.process",
  "orders.ready",
  "orders.ship",
  "orders.deliver",
  "orders.complete",
  "orders.cancel",
  "orders.message",
  "orders.note",
  "orders.resolve_issue",
] as const;

export type VendorOrderPermissionKey = (typeof VENDOR_ORDER_PERMISSION_KEYS)[number];
export type VendorOrderPermissions = Record<VendorOrderPermissionKey, boolean>;

export function getDefaultVendorOrderPermissions(): VendorOrderPermissions {
  return {
    "orders.view": true,
    "orders.accept": true,
    "orders.process": true,
    "orders.ready": true,
    "orders.ship": true,
    "orders.deliver": true,
    "orders.complete": true,
    "orders.cancel": true,
    "orders.message": true,
    "orders.note": true,
    "orders.resolve_issue": true,
  };
}

// ── Available action model ───────────────────────────────────

export const VENDOR_ORDER_ACTION = {
  ACCEPT: "accept",
  CANCEL: "cancel",
  PROCESS: "process",
  READY_FOR_PICKUP: "ready_for_pickup",
  SHIP: "ship",
  OUT_FOR_DELIVERY: "out_for_delivery",
  DELIVER: "deliver",
  COMPLETE: "complete",
  MESSAGE_CUSTOMER: "message_customer",
  RESPOND_DISPUTE: "respond_dispute",
} as const;

export type VendorOrderAction = ValuesOf<typeof VENDOR_ORDER_ACTION>;

export interface VendorOrderActionView {
  key: VendorOrderAction;
  label: string;
  variant: "primary" | "outline" | "destructive";
  description?: string;
  /** True when the action needs additional input (cancel reason / shipment). */
  requiresPayload?: boolean;
}

// ── Query / pagination ───────────────────────────────────────

export const VENDOR_ORDER_SORT = {
  NEWEST: "newest",
  OLDEST: "oldest",
  TOTAL_DESC: "total_desc",
  TOTAL_ASC: "total_asc",
} as const;

export type VendorOrderSortField = ValuesOf<typeof VENDOR_ORDER_SORT>;

export interface VendorOrderQuery {
  search?: string;
  fulfillmentStatus?: VendorFulfillmentStatus | "all";
  paymentStatus?: VendorPaymentStatus | "all";
  deliveryMethod?: VendorDeliveryMethod | "all";
  issues?: "all" | "with_issues";
  sort?: VendorOrderSortField;
  page?: number;
  pageSize?: number;
}

export interface VendorOrderPage<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface VendorOrderCounts {
  all: number;
  needsAction: number;
  pending: number;
  accepted: number;
  processing: number;
  readyForPickup: number;
  shipped: number;
  outForDelivery: number;
  delivered: number;
  completed: number;
  cancelled: number;
  paymentPending: number;
  withIssues: number;
}

// ── Transition result codes (backend-authoritative) ──────────

export type VendorOrderResultCode =
  | "ok"
  | "not_found"
  | "forbidden"
  | "invalid_transition"
  | "payment_pending"
  | "payment_processing"
  | "expired"
  | "cancelled"
  | "already_done"
  | "invalid_payload";

export interface VendorOrderResult {
  ok: boolean;
  code: VendorOrderResultCode;
  order?: VendorOrder;
  error?: string;
}

type ValuesOf<T> = T[keyof T];