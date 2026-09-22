import { apiClient } from "@/lib/api-client";
import {
  getVendorOrderSlice,
  getVendorParentOrder,
  vendorOrderSlices,
} from "@/data/vendor-orders";
import { notificationsMock } from "@/data/vendor-dashboard";
import { getCurrentUser, getVendorByUserId } from "@/services/users";
import { getVendorAccess, getVendorPermissions } from "@/services/vendor-dashboard";
import type {
  VendorOrder,
  VendorOrderQuery,
  VendorOrderPage,
  VendorOrderCounts,
  VendorOrderResult,
  VendorOrderResultCode,
  VendorOrderActionView,
  VendorOrderPermissionKey,
  VendorOrderPermissions,
  VendorParentOrder,
  VendorFulfillmentStatus,
} from "@/types/vendor-orders";
import {
  VENDOR_DASHBOARD_GATE,
  type VendorNotification,
} from "@/types/vendor-dashboard";

// ============================================================
// VENDOR ORDERS SERVICE LAYER  (Module 12)
// ============================================================
//
// Maps 1:1 to a future backend API:
//   GET    /vendor/orders            → list (search / filter / sort / paginate)
//   GET    /vendor/orders/counts     → status / issue counts
//   GET    /vendor/orders/{id}       → owner-scoped detail (+ parent context)
//   POST   /vendor/orders/{id}/accept
//   POST   /vendor/orders/{id}/cancel       { reason }
//   POST   /vendor/orders/{id}/process
//   POST   /vendor/orders/{id}/ready
//   POST   /vendor/orders/{id}/ship         { carrier, trackingNumber }
//   POST   /vendor/orders/{id}/out-for-delivery
//   POST   /vendor/orders/{id}/deliver
//   POST   /vendor/orders/{id}/complete
//   POST   /vendor/orders/{id}/dispute/respond   { response }
//   POST   /vendor/orders/{id}/notes             { body }
//
// AUTHORIZATION: ownership is ALWAYS derived from the authenticated identity
// (getCurrentUser().id → vendor). We never trust vendorId / orderId supplied by
// the client to authorize access. A vendor only ever sees slices owned by their
// own vendor record (multi-vendor parent rows belonging to other sellers are
// filtered out). All transitions are validated here; the UI merely reflects the
// backend's decision, so result codes are authoritative.

const PAGE_SIZE_DEFAULT = 12;

function nowIso(): string {
  return new Date().toISOString();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

// ── Ownership / access ────────────────────────────────────────

export interface VendorOrderContext {
  authorized: boolean;
  vendorId?: string;
  storeName?: string;
  reason?: string;
}

function resolveVendorContext(): VendorOrderContext {
  const user = getCurrentUser();
  const vendor = getVendorByUserId(user.id);
  const access = getVendorAccess();
  if (!vendor || !access.canUseDashboard || access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    return { authorized: false, reason: "You don't have an approved vendor account." };
  }
  return { authorized: true, vendorId: vendor.id, storeName: vendor.storeName };
}

// ── Permissions (presentation only) ──────────────────────────

export function getVendorOrderPermissions(): VendorOrderPermissions {
  const base = getVendorPermissions();
  return {
    "orders.view": base.canManageOrders,
    "orders.accept": base.canManageOrders,
    "orders.process": base.canManageOrders,
    "orders.ready": base.canManageOrders,
    "orders.ship": base.canManageOrders,
    "orders.deliver": base.canManageOrders,
    "orders.complete": base.canManageOrders,
    "orders.cancel": base.canManageOrders,
    "orders.message": base.canManageOrders,
    "orders.note": base.canManageOrders,
    "orders.resolve_issue": base.canManageOrders,
  } satisfies Record<VendorOrderPermissionKey, boolean>;
}

// ── List / counts ─────────────────────────────────────────────

export function listVendorOrders(query: VendorOrderQuery = {}): VendorOrderPage<VendorOrder> {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) {
    return { items: [], total: 0, page: 1, pageSize: 1, totalPages: 0 };
  }
  const {
    search = "",
    fulfillmentStatus = "all",
    paymentStatus = "all",
    deliveryMethod = "all",
    issues = "all",
    sort = "newest",
    page = 1,
    pageSize = PAGE_SIZE_DEFAULT,
  } = query;

  const normalizedPage = Math.max(1, Math.floor(page));
  const normalizedSize = Math.max(1, Math.floor(pageSize));

  const filtered = vendorOrderSlices.filter((o) => {
    if (o.vendorId !== ctx.vendorId) return false;
    if (fulfillmentStatus !== "all" && o.fulfillmentStatus !== fulfillmentStatus) return false;
    if (paymentStatus !== "all" && o.paymentStatus !== paymentStatus) return false;
    if (deliveryMethod !== "all" && o.deliveryMethod !== deliveryMethod) return false;
    if (issues === "with_issues" && !o.flags.some((f) => f.status !== "resolved")) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const haystack = [o.id, o.customer.displayName, o.customer.buyerId, ...o.items.map((i) => i.title)].join(" ").toLowerCase();
    return haystack.includes(q);
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case "total_desc":
        return b.totals.customerTotal - a.totals.customerTotal;
      case "total_asc":
        return a.totals.customerTotal - b.totals.customerTotal;
      case "newest":
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / normalizedSize));
  const safePage = Math.min(normalizedPage, totalPages);
  const start = (safePage - 1) * normalizedSize;
  const items = sorted.slice(start, start + normalizedSize).map(clone);

  return {
    items,
    total: sorted.length,
    page: safePage,
    pageSize: normalizedSize,
    totalPages,
  };
}

export async function listVendorOrdersApi(query: VendorOrderQuery = {}): Promise<VendorOrderPage<VendorOrder>> {
  const params = new URLSearchParams();
  if (query.search) params.append("search", query.search);
  if (query.fulfillmentStatus && query.fulfillmentStatus !== "all") params.append("status", query.fulfillmentStatus);
  if (query.page) params.append("page", String(query.page));
  if (query.pageSize) params.append("pageSize", String(query.pageSize));

  const { data, error } = await apiClient.get<VendorOrderPage<VendorOrder>>(`/orders/vendor?${params.toString()}`);
  if (!error && data && Array.isArray(data.items)) {
    return data;
  }
  return listVendorOrders(query);
}

export function getVendorOrderCounts(): VendorOrderCounts {
  const ctx = resolveVendorContext();
  const empty: VendorOrderCounts = {
    all: 0, needsAction: 0, pending: 0, accepted: 0, processing: 0,
    readyForPickup: 0, shipped: 0, outForDelivery: 0, delivered: 0,
    completed: 0, cancelled: 0, paymentPending: 0, withIssues: 0,
  };
  if (!ctx.authorized || !ctx.vendorId) return empty;

  const owned = vendorOrderSlices.filter((o) => o.vendorId === ctx.vendorId);
  const needsAction = owned.filter((o) =>
    (o.fulfillmentStatus === "pending" || o.fulfillmentStatus === "accepted" || o.fulfillmentStatus === "processing") &&
    !o.expiredAt
  ).length;

  return {
    all: owned.length,
    needsAction,
    pending: owned.filter((o) => o.fulfillmentStatus === "pending").length,
    accepted: owned.filter((o) => o.fulfillmentStatus === "accepted").length,
    processing: owned.filter((o) => o.fulfillmentStatus === "processing").length,
    readyForPickup: owned.filter((o) => o.fulfillmentStatus === "ready_for_pickup").length,
    shipped: owned.filter((o) => o.fulfillmentStatus === "shipped").length,
    outForDelivery: owned.filter((o) => o.fulfillmentStatus === "out_for_delivery").length,
    delivered: owned.filter((o) => o.fulfillmentStatus === "delivered").length,
    completed: owned.filter((o) => o.fulfillmentStatus === "completed").length,
    cancelled: owned.filter((o) => o.fulfillmentStatus === "cancelled").length,
    paymentPending: owned.filter((o) => o.paymentStatus === "pending" || o.paymentStatus === "processing").length,
    withIssues: owned.filter((o) => o.flags.some((f) => f.status !== "resolved")).length,
  };
}

// ── Detail (owner-scoped + parent context) ────────────────────

export interface VendorOrderDetail {
  order: VendorOrder;
  parent: VendorParentOrder | null;
  /** Other sellers in the same parent order (names only). */
  siblingSellers: { vendorId: string; storeName: string }[];
}

export async function getVendorOrderByIdApi(id: string): Promise<VendorOrder | null> {
  const { data, error } = await apiClient.get<VendorOrder>(`/orders/vendor/${id}`);
  if (!error && data && data.id) {
    return data;
  }
  return getVendorOrderById(id);
}

export function getVendorOrderById(id: string): VendorOrder | null {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return null;
  const slice = getVendorOrderSlice(id);
  if (!slice || slice.vendorId !== ctx.vendorId) return null;
  return clone(slice);
}

export function getVendorOrderDetail(id: string): VendorOrderDetail | null {
  const order = getVendorOrderById(id);
  if (!order) return null;
  const parent = getVendorParentOrder(order.parentOrderId) ?? null;
  const siblingSellers =
    parent?.vendorSellers.filter((s) => s.vendorId !== order.vendorId) ?? [];
  return { order, parent, siblingSellers };
}

// ── Permitted actions for an order ────────────────────────────

export function getVendorOrderActions(
  order: VendorOrder,
  permissions: VendorOrderPermissions = getVendorOrderPermissions()
): VendorOrderActionView[] {
  const actions: VendorOrderActionView[] = [];
  const { fulfillmentStatus, paymentStatus, deliveryMethod } = order;
  const can = (key: VendorOrderPermissionKey) => permissions[key];

  const expired = Boolean(order.expiredAt) && fulfillmentStatus === "pending";
  const paid = paymentStatus === "paid";
  // Escrow-backed note: money is only in escrow once payment is captured.
  if (!paid) {
    return [];
  }

  switch (fulfillmentStatus) {
    case "pending":
      if (expired) return [];
      if (can("orders.accept")) {
        actions.push({
          key: "accept",
          label: "Accept order",
          variant: "primary",
          description: "Confirm you can fulfill this order.",
        });
      }
      break;
    case "accepted":
      if (can("orders.process")) {
        actions.push({
          key: "process",
          label: "Start processing",
          variant: "primary",
          description: "Begin preparing the items.",
        });
      }
      break;
    case "processing":
      if (can("orders.ready") && deliveryMethod === "campus_pickup") {
        actions.push({
          key: "ready_for_pickup",
          label: "Ready for pickup",
          variant: "primary",
          description: "Mark the order as ready; the buyer gets a pickup code.",
        });
      }
      if (can("orders.ship") && deliveryMethod === "delivery") {
        actions.push({
          key: "ship",
          label: "Mark as shipped",
          variant: "primary",
          description: "Record carrier and tracking number.",
          requiresPayload: true,
        });
      }
      break;
    case "shipped":
      if (can("orders.deliver")) {
        actions.push({
          key: "out_for_delivery",
          label: "Out for delivery",
          variant: "primary",
          description: "Confirm the order is on its way.",
        });
      }
      break;
    case "ready_for_pickup":
      if (can("orders.deliver")) {
        actions.push({
          key: "deliver",
          label: "Mark collected",
          variant: "primary",
          description: "Confirm the buyer picked the order up.",
        });
      }
      break;
    case "out_for_delivery":
      if (can("orders.deliver")) {
        actions.push({
          key: "deliver",
          label: "Mark delivered",
          variant: "primary",
          description: "Confirm the buyer received the order.",
        });
      }
      break;
    case "delivered":
      if (can("orders.complete")) {
        actions.push({
          key: "complete",
          label: "Complete order",
          variant: "primary",
          description: "Move the order to completed; escrow shows as released when the backend says so.",
        });
      }
      break;
    case "completed":
    case "cancelled":
      break;
  }

  const cancels: VendorOrderActionView[] =
    fulfillmentStatus === "pending" || fulfillmentStatus === "accepted" || fulfillmentStatus === "processing"
      ? [{
          key: "cancel",
          label: "Cancel order",
          variant: "destructive",
          description: "Cancel and trigger a refund back to the buyer.",
          requiresPayload: true,
        }]
      : [];

  const active =
    fulfillmentStatus !== "completed" && fulfillmentStatus !== "cancelled" && !expired;

  const messaging: VendorOrderActionView[] =
    active && can("orders.message")
      ? [{
          key: "message_customer",
          label: "Message buyer",
          variant: "outline",
          description: "Continue the conversation in Kampmax Chat.",
        }]
      : [];

  return [...actions, ...cancels, ...messaging];
}

// ── Transition primitives (authoritative) ─────────────────────

function fail(code: VendorOrderResultCode, error: string): VendorOrderResult {
  return { ok: false, code, error };
}

function notOwned(): VendorOrderResult {
  return fail("not_found", "Order not found.");
}

function forbidden(): VendorOrderResult {
  return fail("forbidden", "You don't have permission for this action.");
}

function applyTransition(
  id: string,
  kind: VendorOrderEventKind_type,
  title: string,
  detail: string | undefined,
  mutate: (s: VendorOrder) => void
): VendorOrderResult {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return forbidden();
  const idx = vendorOrderSlices.findIndex((o) => o.id === id);
  if (idx === -1) return notOwned();
  const order = vendorOrderSlices[idx];
  if (order.vendorId !== ctx.vendorId) return notOwned();
  try {
    mutate(order);
  } catch (e) {
    return parseApplyError(e);
  }
  pushTimelineEvent(order, kind, title, detail);
  order.updatedAt = nowIso();
  pushOrderNotification(kind, order);
  return { ok: true, code: "ok", order: clone(order) };
}

type VendorOrderEventKind_type = VendorOrder["timeline"][number]["kind"];

function pushTimelineEvent(
  order: VendorOrder,
  kind: VendorOrderEventKind_type,
  title: string,
  detail?: string
) {
  order.timeline.push({
    id: `vo-ev-${Date.now()}-${order.timeline.length}`,
    kind,
    title,
    detail,
    actor: "Store owner",
    at: nowIso(),
  });
}

function isOpenDispute(order: VendorOrder): boolean {
  return (
    order.dispute.status === "opened" ||
    order.dispute.status === "under_review" ||
    order.dispute.status === "requirements_sent"
  );
}

// ── Public transitions ────────────────────────────────────────

export function acceptVendorOrder(id: string): VendorOrderResult {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return forbidden();
  const order = getVendorOwned(id);
  if (!order) return notOwned();
  if (order.expiredAt && order.fulfillmentStatus === "pending") {
    return fail("expired", "This order expired before payment was completed.");
  }
  if (order.paymentStatus === "pending") {
    return fail("payment_pending", "The buyer's payment hasn't been captured yet.");
  }
  if (order.paymentStatus === "processing") {
    return fail("payment_processing", "Payment is still processing. Try again in a moment.");
  }
  if (order.fulfillmentStatus !== "pending") {
    return order.fulfillmentStatus === "cancelled"
      ? fail("cancelled", "This order was already cancelled.")
      : fail("invalid_transition", "Only pending orders can be accepted.");
  }
  order.fulfillmentStatus = "accepted";
  order.escrow.state = "funds_held";
  order.escrow.updatedAt = nowIso();
  return applyTransitionBody(order, "accepted", "Order accepted", "Order accepted and confirmed.");
}

export function cancelVendorOrder(id: string, reason: string): VendorOrderResult {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return forbidden();
  const order = getVendorOwned(id);
  if (!order) return notOwned();
  if (!reason || !reason.trim()) {
    return fail("invalid_payload", "A cancellation reason is required.");
  }
  const cancellable: VendorFulfillmentStatus[] = ["pending", "accepted", "processing"];
  if (!cancellable.includes(order.fulfillmentStatus)) {
    return order.fulfillmentStatus === "cancelled"
      ? fail("cancelled", "This order was already cancelled.")
      : fail("invalid_transition", "This order can no longer be cancelled.");
  }
  order.fulfillmentStatus = "cancelled";
  if (order.paymentStatus === "paid") {
    order.paymentStatus = "refund_pending";
    order.refund = {
      status: "pending",
      amount: order.totals.vendorSubtotal,
      reason,
      requestedAt: nowIso(),
    };
    order.escrow.state = "funds_held";
  } else if (order.paymentStatus === "refunded") {
    order.escrow.state = "refunded";
  }
  return applyTransitionBody(
    order,
    "cancelled",
    "Cancelled by store",
    `Order cancelled: ${reason.trim()}`
  );
}

export function processVendorOrder(id: string): VendorOrderResult {
  return applyTransition(
    id,
    "processing",
    "Preparing order",
    "The store began preparing the items.",
    (s) => {
      if (s.fulfillmentStatus !== "accepted") {
        throwTransition("invalid_transition", "Only accepted orders can start processing.");
      }
      s.fulfillmentStatus = "processing";
    }
  );
}

export function readyVendorOrder(id: string): VendorOrderResult {
  return applyTransition(
    id,
    "ready_for_pickup",
    "Ready for pickup",
    "Order is ready; a pickup code was issued to the buyer.",
    (s) => {
      if (s.deliveryMethod !== "campus_pickup") {
        throwTransition("invalid_transition", "Pickup readiness only applies to pickup orders.");
      }
      if (s.fulfillmentStatus !== "processing") {
        throwTransition("invalid_transition", "Only processing pickup orders can be marked ready.");
      }
      s.fulfillmentStatus = "ready_for_pickup";
      s.escrow.state = "release_eligible";
      s.escrow.updatedAt = nowIso();
      s.pickup = {
        ...(s.pickup ?? { location: "Engineering Block, RUGIPO" }),
        pickupCode: s.pickup?.pickupCode ?? `PK-${Math.floor(1000 + Math.random() * 9000)}`,
        readyForPickupAt: s.pickup?.readyForPickupAt ?? nowIso(),
      };
    }
  );
}

export function shipVendorOrder(
  id: string,
  payload: { carrier: string; trackingNumber: string }
): VendorOrderResult {
  if (!payload.carrier || !payload.carrier.trim()) {
    return fail("invalid_payload", "Carrier is required.");
  }
  if (!payload.trackingNumber || !payload.trackingNumber.trim()) {
    return fail("invalid_payload", "Tracking number is required.");
  }
  return applyTransition(
    id,
    "shipped",
    "Order shipped",
    `Shipped via ${payload.carrier.trim()} — ${payload.trackingNumber.trim()}.`,
    (s) => {
      if (s.deliveryMethod !== "delivery") {
        throwTransition("invalid_transition", "Shipping only applies to delivery orders.");
      }
      if (s.fulfillmentStatus !== "processing") {
        throwTransition("invalid_transition", "Only processing delivery orders can be shipped.");
      }
      s.fulfillmentStatus = "shipped";
      s.escrow.state = "awaiting_fulfillment";
      s.escrow.updatedAt = nowIso();
      s.shipment = {
        carrier: payload.carrier.trim(),
        trackingNumber: payload.trackingNumber.trim(),
        shippedAt: nowIso(),
      };
    }
  );
}

export function outForDeliveryVendorOrder(id: string): VendorOrderResult {
  return applyTransition(
    id,
    "out_for_delivery",
    "Out for delivery",
    "The order is with the rider / carrier.",
    (s) => {
      if (s.deliveryMethod !== "delivery") {
        throwTransition("invalid_transition", "Out-for-delivery only applies to delivery orders.");
      }
      if (s.fulfillmentStatus !== "shipped") {
        throwTransition("invalid_transition", "Only shipped delivery orders can go out for delivery.");
      }
      s.fulfillmentStatus = "out_for_delivery";
    }
  );
}

export function deliverVendorOrder(id: string): VendorOrderResult {
  return applyTransition(id, "delivered", "Delivered", "Buyer confirmed delivery.", (s) => {
    if (s.deliveryMethod === "campus_pickup") {
      if (s.fulfillmentStatus !== "ready_for_pickup") {
        throwTransition("invalid_transition", "Only ready pickup orders can be marked collected.");
      }
      s.pickup = { ...(s.pickup ?? { location: "Engineering Block, RUGIPO" }), collectedAt: nowIso() };
    } else {
      if (s.fulfillmentStatus !== "out_for_delivery") {
        throwTransition("invalid_transition", "Only out-for-delivery orders can be marked delivered.");
      }
      s.shipment = { ...(s.shipment ?? { carrier: "", trackingNumber: "", shippedAt: "" }), deliveredAt: nowIso() };
    }
    s.fulfillmentStatus = "delivered";
    s.escrow.state = "release_eligible";
    s.escrow.updatedAt = nowIso();
  });
}

export function completeVendorOrder(id: string): VendorOrderResult {
  return applyTransition(id, "completed", "Order completed", "Order marked complete.", (s) => {
    if (s.fulfillmentStatus !== "delivered") {
      throwTransition("invalid_transition", "Only delivered orders can be completed.");
    }
    s.fulfillmentStatus = "completed";
    s.escrow.state = "released";
    s.escrow.updatedAt = nowIso();
    s.escrow.note = "Funds released to your payout balance. Withdrawals are available in financials.";
  });
}

export function respondToDispute(id: string, response: string): VendorOrderResult {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return forbidden();
  const order = getVendorOwned(id);
  if (!order) return notOwned();
  if (!response || !response.trim()) {
    return fail("invalid_payload", "Your response can't be empty.");
  }
  if (!isOpenDispute(order)) {
    return fail("invalid_transition", "There's no open dispute to respond to.");
  }
  order.dispute.timeline.push({
    id: `dp-${Date.now()}`,
    role: "vendor",
    title: "Vendor response submitted",
    detail: response.trim(),
    at: nowIso(),
  });
  order.updatedAt = nowIso();
  return { ok: true, code: "ok", order: clone(order) };
}

export function addVendorOrderNote(id: string, body: string): VendorOrderResult {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return forbidden();
  const order = getVendorOwned(id);
  if (!order) return notOwned();
  if (!body || !body.trim()) {
    return fail("invalid_payload", "Note can't be empty.");
  }
  order.notes.push({
    id: `nt-${Date.now()}-${order.notes.length}`,
    scope: "internal",
    authorRole: "vendor",
    body: body.trim(),
    createdAt: nowIso(),
  });
  order.updatedAt = nowIso();
  return { ok: true, code: "ok", order: clone(order) };
}

// ── Helpers ───────────────────────────────────────────────────

function getVendorOwned(id: string): VendorOrder | undefined {
  const ctx = resolveVendorContext();
  if (!ctx.authorized || !ctx.vendorId) return undefined;
  const slice = getVendorOrderSlice(id);
  if (!slice || slice.vendorId !== ctx.vendorId) return undefined;
  return slice;
}

function applyTransitionBody(
  order: VendorOrder,
  kind: VendorOrderEventKind_type,
  title: string,
  detail?: string
): VendorOrderResult {
  pushTimelineEvent(order, kind, title, detail);
  order.updatedAt = nowIso();
  pushOrderNotification(kind, order);
  return { ok: true, code: "ok", order: clone(order) };
}

function throwTransition(code: VendorOrderResultCode, error: string): never {
  throw new Error(`${code}::${error}`);
}

/** Re-throw the coded errors produced inside `applyTransition` mutations. */
function parseApplyError(e: unknown): VendorOrderResult {
  if (e instanceof Error && e.message.includes("::")) {
    const [code, error] = e.message.split("::");
    return fail(code as VendorOrderResultCode, error);
  }
  return fail("invalid_transition", "This action could not be completed.");
}

// ── Notifications (backend-sourced; echo important transitions) ─

function pushOrderNotification(kind: VendorOrderEventKind_type, order: VendorOrder) {
  const map: Partial<Record<VendorOrderEventKind_type, { title: string; body: string }>> = {
    accepted: {
      title: `Order ${order.id} accepted`,
      body: "You accepted this order. Start preparing it when ready.",
    },
    ready_for_pickup: {
      title: `Order ${order.id} ready for pickup`,
      body: `Pickup code ${order.pickup?.pickupCode ?? "—"}. Contact the buyer to collect.`,
    },
    shipped: {
      title: `Order ${order.id} shipped`,
      body: `${order.shipment?.carrier ?? "Carrier"} — ${order.shipment?.trackingNumber ?? ""}`,
    },
    delivered: {
      title: `Order ${order.id} delivered`,
      body: "The buyer confirmed delivery. Escrow is ready for release.",
    },
    completed: {
      title: `Order ${order.id} completed`,
      body: "Order completed and escrow released.",
    },
    cancelled: {
      title: `Order ${order.id} cancelled`,
      body: "The order was cancelled and a refund has been initiated.",
    },
  };
  const entry = map[kind];
  if (!entry || !isNotifSupported(kind)) return;

  const item: VendorNotification = {
    id: `vo-n-${Date.now()}`,
    kind: kind === "accepted" || kind === "cancelled" ? "order_update" : "new_order",
    title: entry.title,
    body: entry.body,
    href: `/vendor/orders/${order.id}`,
    read: false,
    createdAt: nowIso(),
  };
  const box = notificationsMock.notifications;
  box.items.unshift(item);
  box.unreadCount += 1;
}

function isNotifSupported(kind: VendorOrderEventKind_type): boolean {
  return kind !== "processing" && kind !== "out_for_delivery";
}