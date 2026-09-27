// ============================================================
// ADMIN TRANSACTIONS & PAYMENTS DATA (Module 44)
// ============================================================
//
// ONE financial ledger over REAL records only. Two Kampmax stores own
// money movements and both are read verbatim here:
//
//   - orders             → the payment a customer makes for an order
//                          (id, buyer, vendor, paymentMethod/paymentStatus,
//                          real fee/total breakdown, real timeline)
//   - walletTransactions → customer wallet funding (`deposit`) and the
//                          explicit `refund` records
//
// There is NO seeded/PRNG generation in this module. Statuses you see in
// the admin console are LABELS over the owning store's real value; rows
// never carry invented references, gateway ids or settlement states.
//
// INTENTIONAL EXCLUSIONS (each has a real home elsewhere — no duplication):
//   - wallet `purchase` debits   → the funded leg of an order; surfaced in
//                                  the Wallet console, not double-counted here
//   - `vendor_payout` credits    → payout domain (Module 45)
//   - `withdrawal` / `transfer`  → personal wallet movements; Wallet console
//   - `loyalty_reward`           → Wallet console
//
// KNOWN SEED AUTHORING GAPS (documented, not papered over): wallet purchase
// debits reference orders but their amounts do not reconcile with the order
// totals (e.g. ORD-KMP-4215 debits ₦8,500 for an order totalling ₦92,500),
// and refund record REF-2025-001 references order #KMP-3901 which does not
// exist in the orders store. Those records are shown at face value.
// ============================================================

import type {
  ManagedTransaction,
  ManagedTransactionActivity,
  ManagedTransactionActivityKind,
  ManagedTransactionDetail,
  ManagedTransactionFacets,
  ManagedTransactionListQuery,
  ManagedTransactionMethod,
  ManagedTransactionOrderSummary,
  ManagedTransactionSortField,
  ManagedTransactionStatus,
  ManagedTransactionType,
  ManagedTransactionStatusCounts,
} from "@/types/admin";
import {
  MANAGED_TRANSACTION_METHODS,
  MANAGED_TRANSACTION_STATUSES,
  MANAGED_TRANSACTION_TYPES,
} from "@/types/admin";
import { getOrderById, mockOrders } from "@/data/orders";
import { walletTransactions, wallets } from "@/data/wallet";
import { getUserById, getVendorById } from "@/data/users";
import type { Order, PaymentStatus } from "@/types";
import type { WalletTransaction, WalletTransactionStatus } from "@/types";

// ============================================================
// CONSOLE STATUS DERIVATION (real source value → label)
// ============================================================

function orderConsoleStatus(status: PaymentStatus): ManagedTransactionStatus {
  switch (status) {
    case "paid":
      return "successful";
    case "pending":
      return "pending";
    case "failed":
      return "failed";
    case "refunded":
      return "refunded";
  }
}

function walletConsoleStatus(
  status: WalletTransactionStatus
): ManagedTransactionStatus {
  switch (status) {
    case "completed":
      return "successful";
    case "pending":
      return "pending";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
  }
}

// ============================================================
// METHOD / CHANNEL DERIVATION
// ============================================================

function fundingMethod(tx: WalletTransaction): ManagedTransactionMethod {
  if (tx.type === "refund") return "wallet"; // credited back to the wallet
  const metaMethod = tx.metadata?.method;
  if (metaMethod === "paystack") return "paystack";
  if (metaMethod === "wallet") return "wallet";
  if (metaMethod === "cod") return "cod";
  if (tx.bankName) return "bank_transfer";
  if (tx.type === "deposit") return "bank_transfer";
  return "wallet";
}

function walletChannelLabel(tx: WalletTransaction): string | null {
  if (tx.type === "refund") return "Wallet balance";
  if (tx.bankName) {
    return [tx.bankName, tx.bankAccount ?? ""].filter(Boolean).join(" ");
  }
  const card = tx.metadata?.card;
  if (card) return `Card ${card}`;
  return null;
}

function walletOwnerUser(walletId: string): {
  customerId: string;
  customerName: string;
} {
  const wallet = wallets.find((w) => w.id === walletId);
  const user = wallet ? getUserById(wallet.userId) : undefined;
  return {
    customerId: user?.id ?? wallet?.userId ?? "unknown",
    customerName: user?.name ?? wallet?.userId ?? "Wallet",
  };
}

// ============================================================
// ROW BUILDERS
// ============================================================

function orderRow(o: Order): ManagedTransaction {
  const customer = getUserById(o.buyerId);
  const vendor = getVendorById(o.vendorId);
  return {
    id: o.id,
    type: "order_payment",
    status: orderConsoleStatus(o.paymentStatus),
    sourceStatus: o.paymentStatus,
    statusNote: `Order payment status: ${o.paymentStatus}`,
    direction: "debit",
    customerId: o.buyerId,
    customerName: customer?.name ?? o.buyerId,
    vendorId: o.vendorId,
    vendorName: vendor?.storeName ?? null,
    orderId: o.id,
    amount: o.total,
    platformFee: o.platformFee,
    method: o.paymentMethod,
    channelLabel: null,
    reference: null,
    gatewayRef: null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt ?? o.createdAt,
  };
}

/** Only deposit (funding) and refund wallet moves belong on this ledger. */
function walletRow(tx: WalletTransaction): ManagedTransaction | null {
  const category =
    tx.type === "deposit"
      ? ("wallet_funding" as const)
      : tx.type === "refund"
        ? ("refund" as const)
        : null;
  if (!category) return null;
  const owner = walletOwnerUser(tx.walletId);
  const order = tx.orderId ? getOrderById(tx.orderId) : undefined;
  return {
    id: tx.id,
    type: category,
    status: walletConsoleStatus(tx.status),
    sourceStatus: tx.status,
    statusNote: `Wallet transaction status: ${tx.status} (${tx.type})`,
    direction: tx.direction,
    customerId: owner.customerId,
    customerName: owner.customerName,
    vendorId: order?.vendorId ?? null,
    vendorName: order ? (getVendorById(order.vendorId)?.storeName ?? null) : null,
    orderId: tx.orderId ?? null,
    amount: tx.amount,
    platformFee: 0,
    method: fundingMethod(tx),
    channelLabel: walletChannelLabel(tx),
    reference: tx.reference ?? null,
    gatewayRef: null,
    createdAt: tx.createdAt,
    updatedAt: tx.completedAt ?? tx.createdAt,
  };
}

// ============================================================
// DETAIL BUILDERS
// ============================================================

function orderSummaryOf(o: Order): ManagedTransactionOrderSummary {
  return {
    id: o.id,
    status: o.status,
    itemCount: o.items.reduce((n, it) => n + it.quantity, 0),
    subtotal: o.subtotal,
    platformFee: o.platformFee,
    deliveryFee: o.deliveryFee,
    discountAmount: o.discountAmount,
    total: o.total,
    paymentMethod: o.paymentMethod,
    createdAt: o.createdAt,
    cancelledAt: o.cancelledAt ?? null,
    cancelReason: o.cancelReason ?? null,
  };
}

function activityKindFor(status: Order["status"], refunded: boolean): ManagedTransactionActivityKind {
  switch (status) {
    case "placed":
      return "initiated";
    case "delivered":
      return "completed";
    case "cancelled":
      return refunded ? "refunded" : "cancelled";
    default:
      return "note";
  }
}

function orderActivity(o: Order, row: ManagedTransaction): ManagedTransactionActivity[] {
  return o.timeline.map((t, i) => ({
    id: `${row.id}-evt-${i}`,
    kind: activityKindFor(t.status, row.status === "refunded"),
    title: t.message,
    meta: `Order event: ${t.status}`,
    at: t.timestamp,
  }));
}

function walletActivity(
  tx: WalletTransaction,
  row: ManagedTransaction
): ManagedTransactionActivity[] {
  const items: ManagedTransactionActivity[] = [
    {
      id: `${row.id}-initiated`,
      kind: "initiated",
      title: "Transaction initiated",
      meta: `Wallet ${tx.type} · ${tx.direction}`,
      at: tx.createdAt,
    },
  ];
  if (tx.completedAt) {
    items.push({
      id: `${row.id}-completed`,
      kind: "completed",
      title: "Transaction completed",
      meta: tx.description || "Wallet movement settled",
      at: tx.completedAt,
    });
  }
  return items;
}

// Honest, shared gateway / action status — nothing to fabricate.
const GATEWAY_STATUS: ManagedTransactionDetail["gateway"] = {
  tracked: false,
  note: "Payment provider verification is not wired into the prototype backend. No record on this ledger carries a gateway reference or provider verification event.",
};

const ACTION_SUPPORT: ManagedTransactionDetail["actions"] = {
  refundable: false,
  note: "No refund endpoint exists in the prototype backend. Refunds are recorded at the order level (paymentStatus) and as wallet refund transactions only.",
};

// ============================================================
// DATASET
// ============================================================

export interface ManagedTransactionDataset {
  rows: ManagedTransaction[];
  byId: Map<string, ManagedTransactionDetail>;
}

export function buildTransactionDataset(): ManagedTransactionDataset {
  const rows: ManagedTransaction[] = [];
  const byId = new Map<string, ManagedTransactionDetail>();

  for (const o of mockOrders) {
    const row = orderRow(o);
    rows.push(row);
    byId.set(row.id, {
      transaction: row,
      order: orderSummaryOf(o),
      activity: orderActivity(o, row),
      gateway: GATEWAY_STATUS,
      actions: ACTION_SUPPORT,
    });
  }

  for (const tx of walletTransactions) {
    const row = walletRow(tx);
    if (!row) continue;
    rows.push(row);
    byId.set(row.id, {
      transaction: row,
      order:
        tx.orderId && getOrderById(tx.orderId)
          ? orderSummaryOf(getOrderById(tx.orderId)!)
          : null,
      activity: walletActivity(tx, row),
      gateway: GATEWAY_STATUS,
      actions: ACTION_SUPPORT,
    });
  }

  // Stable default order: newest first (matches the real-store chronology).
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { rows, byId };
}

export const transactionDataset: ManagedTransactionDataset = buildTransactionDataset();

// ============================================================
// QUERY HELPERS (data layer; the service adds delay + pagination)
// ============================================================

export function filterTransactionRows(
  rows: ManagedTransaction[],
  query: ManagedTransactionListQuery
): ManagedTransaction[] {
  const search = query.search?.trim().toLowerCase();
  const status = query.status ?? "all";
  const type = query.type ?? "all";
  const method = query.method ?? "all";
  const from = query.dateFrom ? new Date(`${query.dateFrom}T00:00:00`).getTime() : NaN;
  const to = query.dateTo ? new Date(`${query.dateTo}T23:59:59.999`).getTime() : NaN;

  return rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (type !== "all" && r.type !== type) return false;
    if (method !== "all" && r.method !== method) return false;
    if (!Number.isNaN(from) || !Number.isNaN(to)) {
      const at = new Date(r.createdAt).getTime();
      if (!Number.isNaN(from) && at < from) return false;
      if (!Number.isNaN(to) && at > to) return false;
    }
    if (search) {
      const haystack = [
        r.id,
        r.customerName,
        r.vendorName ?? "",
        r.orderId ?? "",
        r.reference ?? "",
        r.sourceStatus,
        r.statusNote,
        r.method,
        r.type,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function sortTransactionRows(
  rows: ManagedTransaction[],
  sortBy: ManagedTransactionSortField | undefined,
  sortDir: ManagedTransactionListQuery["sortDir"]
): ManagedTransaction[] {
  const dir = sortDir === "asc" ? 1 : -1;
  const sorted = [...rows];
  switch (sortBy) {
    case "amount":
      sorted.sort((a, b) => (a.amount - b.amount) * dir);
      break;
    case "createdAt":
    default:
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt) * dir);
      break;
  }
  return sorted;
}

export function computeTransactionCounts(
  rows: ManagedTransaction[]
): ManagedTransactionStatusCounts {
  const byStatus = Object.fromEntries(
    MANAGED_TRANSACTION_STATUSES.map((s) => [s, 0])
  ) as Record<ManagedTransactionStatus, number>;
  const byType = Object.fromEntries(
    MANAGED_TRANSACTION_TYPES.map((t) => [t, 0])
  ) as Record<ManagedTransactionType, number>;

  let totalVolume = 0;
  let successfulVolume = 0;
  let pendingVolume = 0;
  let refundedVolume = 0;

  for (const r of rows) {
    byStatus[r.status] += 1;
    byType[r.type] += 1;
    totalVolume += r.amount;
    if (r.status === "successful") successfulVolume += r.amount;
    if (r.status === "pending") pendingVolume += r.amount;
    if (r.status === "refunded") refundedVolume += r.amount;
  }

  return {
    all: rows.length,
    byStatus,
    byType,
    totalVolume,
    successfulVolume,
    pendingVolume,
    refundedVolume,
  };
}

const TYPE_NAMES: Record<ManagedTransactionType, string> = {
  order_payment: "Order payment",
  wallet_funding: "Wallet funding",
  refund: "Refund",
};

const METHOD_NAMES: Record<ManagedTransactionMethod, string> = {
  paystack: "Paystack",
  flutterwave: "Flutterwave",
  wallet: "Wallet",
  cod: "Cash on delivery",
  bank_transfer: "Bank transfer",
};

/** Only facets that actually occur in the data (never invented options). */
export function transactionFacets(rows: ManagedTransaction[]): ManagedTransactionFacets {
  const methods = MANAGED_TRANSACTION_METHODS.filter((m) =>
    rows.some((r) => r.method === m)
  ).map((m) => ({ id: m, name: METHOD_NAMES[m] }));
  const types = MANAGED_TRANSACTION_TYPES.filter((t) =>
    rows.some((r) => r.type === t)
  ).map((t) => ({ id: t, name: TYPE_NAMES[t] }));
  return { methods, types };
}