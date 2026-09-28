// ============================================================
// ADMIN VENDOR / FREELANCER PAYOUTS DATA (Module 45)
// ============================================================
//
// Recipient payout console over REAL records ONLY. Three Kampmax stores
// own payout records and all of them are read verbatim here:
//
//   - walletTransactions with `type: "vendor_payout"`  → the wallet store
//     records the credit side of releasing earnings into wallet w1
//     (wt8 = completed PAY-2025-001, wt23 = pending PAY-2025-002).
//   - vendor-financials INITIAL_PAYOUTS → vendor v8's bank-transferred
//     payouts (POUT-2001 successful, POUT-2000 processing).
//   - freelancer-financials INITIAL_FL_PAYOUTS → u1's freelancer payouts
//     (FLPOUT-4003/4002 completed, FLPOUT-4001 failed).
//
// There is NO seeded/PRNG generation in this module. The statuses you see
// are LABELS over the owning store's real value; rows never carry invented
// references, disbursement-provider ids or settlement states. Payout
// account numbers are consumed exactly as the owning stores mask them and
// are never unmasked.
//
// DOMAIN SEPARATION (no duplication):
//   - customer funding/refunds > /admin/transactions (Module 44)
//   - customer withdrawals        > /admin/withdrawals   (no Module 45 row)
//   - reconciliation / statements > Module 46 (NOT built here)
//   - `purchase` / `loyalty` / `transfer` wallet moves > Wallet console
//
// KNOWN SEED AUTHORING GAPS (documented, not papered over): wt8 references
// orders KMP-3848/KMP-3849 that do not exist in the orders store, and wt23
// references two orders belonging to two different vendors (KMP-4102 → v2,
// KMP-4215 → v3). Rows are shown at face value: referenced orders are listed
// verbatim and the primary recipient is resolved from the FIRST referenced
// order present in the orders store.
// ============================================================

import type {
  ManagedPayout,
  ManagedPayoutActivity,
  ManagedPayoutActivityKind,
  ManagedPayoutDetail,
  ManagedPayoutFacets,
  ManagedPayoutListQuery,
  ManagedPayoutMethod,
  ManagedPayoutRecipientSummary,
  ManagedPayoutRecipientType,
  ManagedPayoutReferencedOrder,
  ManagedPayoutSortField,
  ManagedPayoutStatus,
  ManagedPayoutStatusCounts,
  ManagedPayoutWalletInfo,
} from "@/types/admin";
import {
  MANAGED_PAYOUT_METHODS,
  MANAGED_PAYOUT_RECIPIENT_TYPES,
  MANAGED_PAYOUT_STATUSES,
} from "@/types/admin";
import { getOrderById } from "@/data/orders";
import { walletTransactions, wallets } from "@/data/wallet";
import { getVendorById, getUserById } from "@/data/users";
import { INITIAL_PAYOUTS, INITIAL_PAYOUT_ACCOUNT } from "@/data/vendor-financials";
import { INITIAL_FL_PAYOUTS, INITIAL_FL_PAYOUT_ACCOUNT } from "@/data/freelancer-financials";
import { marketplaceServiceProviders } from "@/data/service-marketplace";
import type { WalletTransaction, WalletTransactionStatus } from "@/types";
import type { VendorPayout, VendorPayoutStatus } from "@/types/vendor-financials";
import type { FlPayout, FlPayoutStatus } from "@/types/freelancer-financials";

// ============================================================
// CONSOLE STATUS DERIVATION (real source value → label)
// ============================================================

function walletPayoutStatus(status: WalletTransactionStatus): ManagedPayoutStatus {
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

function vendorPayoutStatus(status: VendorPayoutStatus): ManagedPayoutStatus {
  switch (status) {
    case "successful":
      return "successful";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
  }
}

function freelancerPayoutStatus(status: FlPayoutStatus): ManagedPayoutStatus {
  switch (status) {
    case "completed":
      return "successful";
    case "requested":
      return "pending";
    case "processing":
      return "processing";
    case "failed":
      return "failed";
    case "reversed":
      return "reversed";
    case "cancelled":
      return "cancelled";
  }
}

// ============================================================
// RECIPIENT RESOLUTION
// ============================================================

function getWallet(walletId: string): { walletId: string; ownerId: string; ownerName: string; balance: number; pendingAmount: number } | null {
  const wallet = wallets.find((w) => w.id === walletId);
  if (!wallet) return null;
  const user = getUserById(wallet.userId);
  return {
    walletId: wallet.id,
    ownerId: user?.id ?? wallet.userId,
    ownerName: user?.name ?? wallet.userId,
    balance: wallet.balance,
    pendingAmount: wallet.pendingAmount,
  };
}

/** Every order referenced (verbatim) by a wallet payout record. */
function ordersReferencedBy(tx: WalletTransaction): ManagedPayoutReferencedOrder[] {
  const rawIds = (tx.metadata?.orders ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!rawIds.length) return [];
  return rawIds.map((id) => {
    const order = getOrderById(id);
    return {
      id,
      existsInOrdersStore: Boolean(order),
      vendorId: order?.vendorId ?? null,
      vendorName: order ? (getVendorById(order.vendorId)?.storeName ?? null) : null,
      status: order?.status ?? null,
      total: order?.total ?? null,
    };
  });
}

const FL_RECIPIENT_PROVIDER_ID = "sp1";

/** u1's approved marketplace provider mirrors the freelancer dashboard seed. */
function freelancerRecipient(): { recipientId: string; recipientName: string; verified: boolean } {
  const provider = marketplaceServiceProviders.find((p) => p.id === FL_RECIPIENT_PROVIDER_ID);
  return {
    recipientId: provider?.id ?? FL_RECIPIENT_PROVIDER_ID,
    recipientName: provider?.displayName ?? "Adebayo Tech Services",
    verified: provider?.verificationStatus === "approved",
  };
}

// ============================================================
// ROW BUILDERS
// ============================================================

/** Only wallet `vendor_payout` records belong on this console. */
function walletPayoutRow(tx: WalletTransaction): ManagedPayout | null {
  if (tx.type !== "vendor_payout") return null;
  const orders = ordersReferencedBy(tx);
  const primary = orders.find((o) => o.existsInOrdersStore) ?? null;
  const vendor = primary?.vendorId ? getVendorById(primary.vendorId) : undefined;
  const wallet = getWallet(tx.walletId);
  const recipientName =
    primary?.vendorName ?? vendor?.storeName ?? "Unknown recipient";
  return {
    id: tx.id,
    reference: tx.reference ?? null,
    source: "wallet_transaction",
    sourceRecordId: tx.id,
    recipientType: "vendor",
    recipientId: primary?.vendorId ?? "unknown",
    recipientName,
    recipientSub: wallet
      ? `Wallet ${tx.walletId} · owner ${wallet.ownerName}`
      : `Wallet ${tx.walletId}`,
    recipientHref: primary?.vendorId ? `/admin/vendors/${primary.vendorId}` : null,
    status: walletPayoutStatus(tx.status),
    sourceStatus: tx.status,
    statusNote: `Wallet transaction status: ${tx.status} (${tx.type})`,
    method: "wallet",
    bankName: null,
    maskedAccountNumber: null,
    amount: tx.amount,
    fee: 0,
    currency: "NGN",
    provider: null,
    gatewayRef: null,
    createdAt: tx.createdAt,
    processedAt: tx.completedAt ?? null,
    expectedAt: null,
    failedReason: null,
    reversalReason: null,
  };
}

function vendorPayoutRow(p: VendorPayout): ManagedPayout {
  const vendor = getVendorById("v8");
  return {
    id: p.id,
    reference: p.reference,
    source: "vendor_financials",
    sourceRecordId: p.id,
    recipientType: "vendor",
    recipientId: "v8",
    recipientName: vendor?.storeName ?? "Adebayo's Gadgets",
    recipientSub: `${vendor?.verified ? "Verified store" : "Store on platform"} · account name ${INITIAL_PAYOUT_ACCOUNT.accountName}`,
    recipientHref: "/admin/vendors/v8",
    status: vendorPayoutStatus(p.status),
    sourceStatus: p.status,
    statusNote: `Vendor payout status: ${p.status}`,
    method: "bank_transfer",
    bankName: p.bankName,
    maskedAccountNumber: p.maskedAccountNumber,
    amount: p.amount,
    fee: p.fee,
    currency: "NGN",
    provider: null,
    gatewayRef: null,
    createdAt: p.requestedAt,
    processedAt: p.processedAt ?? null,
    expectedAt: p.expectedAt ?? null,
    failedReason: p.failedReason ?? null,
    reversalReason: null,
  };
}

function freelancerPayoutRow(p: FlPayout): ManagedPayout {
  const recipient = freelancerRecipient();
  return {
    id: p.id,
    reference: p.reference,
    source: "freelancer_financials",
    sourceRecordId: p.id,
    recipientType: "freelancer",
    recipientId: recipient.recipientId,
    recipientName: recipient.recipientName,
    recipientSub: `Account name ${INITIAL_FL_PAYOUT_ACCOUNT.accountName} · Provider ${recipient.verified ? "verified" : "not verified"}`,
    recipientHref: `/admin/freelancers/${recipient.recipientId}`,
    status: freelancerPayoutStatus(p.status),
    sourceStatus: p.status,
    statusNote: `Freelancer payout status: ${p.status}`,
    method: "bank_transfer",
    bankName: p.bankName,
    maskedAccountNumber: p.maskedAccountNumber,
    amount: p.amount,
    fee: p.fee,
    currency: "NGN",
    provider: null,
    gatewayRef: null,
    createdAt: p.requestedAt,
    processedAt: p.processedAt ?? null,
    expectedAt: p.expectedAt ?? null,
    failedReason: p.failedReason ?? null,
    reversalReason: p.reversalReason ?? null,
  };
}

// ============================================================
// TIMELINE BUILDERS (real data only)
// ============================================================

function freelancerActivityKind(title: string): ManagedPayoutActivityKind {
  if (/requested/i.test(title)) return "initiated";
  if (/processing/i.test(title)) return "note";
  if (/processed/i.test(title)) return "completed";
  if (/failed/i.test(title)) return "failed";
  if (/reversed/i.test(title)) return "reversed";
  return "note";
}

function freelancerTimeline(p: FlPayout, row: ManagedPayout): ManagedPayoutActivity[] {
  return p.events.map((e, i) => ({
    id: `${row.id}-evt-${i}`,
    kind: freelancerActivityKind(e.title),
    title: e.title,
    meta: e.detail ?? "Freelancer payout event recorded by the owning store",
    at: e.at,
  }));
}

function vendorTimeline(p: VendorPayout, row: ManagedPayout): ManagedPayoutActivity[] {
  const items: ManagedPayoutActivity[] = [
    {
      id: `${row.id}-requested`,
      kind: "initiated",
      title: "Payout requested",
      meta: "Vendor payout record created",
      at: p.requestedAt,
    },
  ];
  if (p.processedAt) {
    items.push({
      id: `${row.id}-processed`,
      kind: "completed",
      title: "Payout processed",
      meta: p.status === "successful" ? "Funds sent to the bank account on record" : "Payout processed by the payout system",
      at: p.processedAt,
    });
  }
  if (p.expectedAt) {
    items.push({
      id: `${row.id}-expected`,
      kind: "expected",
      title: "Expected to arrive",
      meta: "Estimated arrival recorded by the owning store",
      at: p.expectedAt,
    });
  }
  if (p.failedReason) {
    items.push({
      id: `${row.id}-failed`,
      kind: "failed",
      title: "Payout failed",
      meta: p.failedReason,
      at: p.processedAt ?? p.requestedAt,
    });
  }
  return items;
}

function walletTimeline(tx: WalletTransaction, row: ManagedPayout): ManagedPayoutActivity[] {
  const items: ManagedPayoutActivity[] = [
    {
      id: `${row.id}-initiated`,
      kind: "initiated",
      title: "Payout recorded",
      meta: `${tx.description ?? "Earnings payout credited to the wallet"} · wallet ${tx.walletId}`,
      at: tx.createdAt,
    },
  ];
  if (tx.completedAt) {
    items.push({
      id: `${row.id}-completed`,
      kind: "completed",
      title: "Payout completed",
      meta: "Wallet credit settled",
      at: tx.completedAt,
    });
  }
  return items;
}

// ============================================================
// HONEST GATEWAY / ACTION STATUS (nothing to fabricate)
// ============================================================

const PAYOUT_GATEWAY = {
  tracked: false,
  note: "Payout disbursement provider (Paystack / Flutterwave-style) is not wired into the prototype backend. No record on this console carries a provider reference or a provider verification event.",
};

const PAYOUT_ACTIONS = {
  supported: false,
  resolvable: false,
  note: "No payout action endpoints exist in the prototype backend — there is no approve, process, retry, cancel or reverse for any vendor or freelancer payout. Records are shown exactly as recorded by their owning stores.",
};

// ============================================================
// DETAIL BUILDERS
// ============================================================

function recipientSummary(row: ManagedPayout): ManagedPayoutRecipientSummary {
  return {
    recipientType: row.recipientType,
    recipientId: row.recipientId,
    recipientName: row.recipientName,
    recipientSub: row.recipientSub,
    recipientHref: row.recipientHref,
  };
}

function walletInfo(walletId: string): ManagedPayoutWalletInfo | null {
  const w = getWallet(walletId);
  if (!w) return null;
  return {
    walletId: w.walletId,
    ownerId: w.ownerId,
    ownerName: w.ownerName,
    balance: w.balance,
    pendingAmount: w.pendingAmount,
    currency: "NGN",
  };
}

function detailOf(row: ManagedPayout): ManagedPayoutDetail {
  let referencedOrders: ManagedPayoutReferencedOrder[] = [];
  let timeline: ManagedPayoutActivity[] = [];
  let wallet: ManagedPayoutWalletInfo | null = null;

  if (row.source === "wallet_transaction") {
    const tx = walletTransactions.find((t) => t.id === row.sourceRecordId);
    if (tx) {
      referencedOrders = ordersReferencedBy(tx);
      timeline = walletTimeline(tx, row);
      wallet = walletInfo(tx.walletId);
    }
  } else if (row.source === "vendor_financials") {
    const p = INITIAL_PAYOUTS.find((x) => x.id === row.sourceRecordId);
    if (p) timeline = vendorTimeline(p, row);
  } else {
    const p = INITIAL_FL_PAYOUTS.find((x) => x.id === row.sourceRecordId);
    if (p) timeline = freelancerTimeline(p, row);
  }

  return {
    payout: row,
    recipient: recipientSummary(row),
    referencedOrders,
    timeline,
    gateway: PAYOUT_GATEWAY,
    actions: PAYOUT_ACTIONS,
    wallet,
  };
}

// ============================================================
// DATASET
// ============================================================

export interface ManagedPayoutDataset {
  rows: ManagedPayout[];
  byId: Map<string, ManagedPayoutDetail>;
}

export function buildPayoutDataset(): ManagedPayoutDataset {
  const rows: ManagedPayout[] = [];
  const byId = new Map<string, ManagedPayoutDetail>();

  for (const tx of walletTransactions) {
    const row = walletPayoutRow(tx);
    if (!row) continue;
    rows.push(row);
    byId.set(row.id, detailOf(row));
  }

  for (const p of INITIAL_PAYOUTS) {
    const row = vendorPayoutRow(p);
    rows.push(row);
    byId.set(row.id, detailOf(row));
  }

  for (const p of INITIAL_FL_PAYOUTS) {
    const row = freelancerPayoutRow(p);
    rows.push(row);
    byId.set(row.id, detailOf(row));
  }

  // Stable default order: newest first (matches the real-store chronology).
  rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return { rows, byId };
}

export const payoutDataset: ManagedPayoutDataset = buildPayoutDataset();

// ============================================================
// QUERY HELPERS (data layer; the service adds delay + pagination)
// ============================================================

export function filterPayoutRows(
  rows: ManagedPayout[],
  query: ManagedPayoutListQuery
): ManagedPayout[] {
  const search = query.search?.trim().toLowerCase();
  const status = query.status ?? "all";
  const type = query.type ?? "all";
  const method = query.method ?? "all";

  return rows.filter((r) => {
    if (status !== "all" && r.status !== status) return false;
    if (type !== "all" && r.recipientType !== type) return false;
    if (method !== "all" && r.method !== method) return false;
    if (search) {
      const haystack = [
        r.id,
        r.reference ?? "",
        r.recipientName,
        r.recipientId,
        r.recipientType,
        r.sourceStatus,
        r.source,
        r.statusNote,
        r.method,
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(search)) return false;
    }
    return true;
  });
}

export function sortPayoutRows(
  rows: ManagedPayout[],
  sortBy: ManagedPayoutSortField | undefined,
  sortDir: ManagedPayoutListQuery["sortDir"]
): ManagedPayout[] {
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

export function computePayoutCounts(rows: ManagedPayout[]): ManagedPayoutStatusCounts {
  const byStatus = Object.fromEntries(
    MANAGED_PAYOUT_STATUSES.map((s) => [s, 0])
  ) as Record<ManagedPayoutStatus, number>;
  const byRecipientType = Object.fromEntries(
    MANAGED_PAYOUT_RECIPIENT_TYPES.map((t) => [t, 0])
  ) as Record<ManagedPayoutRecipientType, number>;
  const byMethod = Object.fromEntries(
    MANAGED_PAYOUT_METHODS.map((m) => [m, 0])
  ) as Record<ManagedPayoutMethod, number>;

  let totalVolume = 0;
  let successfulVolume = 0;
  let pendingVolume = 0;

  for (const r of rows) {
    byStatus[r.status] += 1;
    byRecipientType[r.recipientType] += 1;
    byMethod[r.method] += 1;
    totalVolume += r.amount;
    if (r.status === "successful") successfulVolume += r.amount;
    if (r.status === "pending") pendingVolume += r.amount;
  }

  return {
    all: rows.length,
    byStatus,
    byRecipientType,
    byMethod,
    totalVolume,
    successfulVolume,
    pendingVolume,
  };
}

const METHOD_NAMES: Record<ManagedPayoutMethod, string> = {
  wallet: "Wallet",
  bank_transfer: "Bank transfer",
};

const STATUS_NAMES: Record<ManagedPayoutStatus, string> = {
  successful: "Successful",
  pending: "Pending",
  processing: "Processing",
  failed: "Failed",
  reversed: "Reversed",
  cancelled: "Cancelled",
};

/** Only facets that actually occur in the data (never invented options). */
export function payoutFacets(rows: ManagedPayout[]): ManagedPayoutFacets {
  const methods = MANAGED_PAYOUT_METHODS.filter((m) =>
    rows.some((r) => r.method === m)
  ).map((m) => ({ id: m, name: METHOD_NAMES[m] }));
  const statuses = MANAGED_PAYOUT_STATUSES.filter((s) =>
    rows.some((r) => r.status === s)
  ).map((s) => ({ id: s, name: STATUS_NAMES[s] }));
  return { methods, statuses };
}