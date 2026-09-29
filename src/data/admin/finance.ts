import { mockVendors, mockWalletAccounts, mockWalletTxns, mockWithdrawals } from "./commerce";
import { intBetween, seededRandom } from "@/lib/admin/api";
import type {
  FinanceFundPool,
  ManagedFinanceTxn,
  ManagedFinanceTxnType,
  ManagedWithdrawalDetail,
  ManagedWithdrawalTimelineEvent,
} from "@/types/admin";

/**
 * Withdrawal-detail dataset (/admin/withdrawals/[id]).
 *
 * /admin/wallet's own overview and ledger are live (GET /admin/wallets/*);
 * this file now only feeds the still-mock withdrawals console, whose
 * per-vendor "recent activity" history is built from the same shape.
 */

function mapTxnType(seedType: string): ManagedFinanceTxnType {
  switch (seedType) {
    case "deposit":
      return "credit";
    case "purchase":
      return "debit";
    case "refund":
      return "refund";
    case "vendor_payout":
      return "settlement";
    case "withdrawal":
      return "withdrawal";
    case "commission":
      return "commission";
    default:
      return "adjustment";
  }
}

function poolFor(type: ManagedFinanceTxnType, ownerType: string): FinanceFundPool {
  if (type === "commission") return "platform";
  return ownerType === "vendor" ? "vendor" : "customer";
}

export function buildFinanceTransactions(): ManagedFinanceTxn[] {
  const rows: ManagedFinanceTxn[] = mockWalletTxns.map((txn, i) => {
    const type = mapTxnType(txn.type);
    return {
      id: txn.id,
      type,
      pool: poolFor(type, txn.ownerType),
      ownerName: txn.ownerName,
      ownerType: txn.ownerType,
      direction: txn.direction,
      amount: txn.amount,
      status: txn.status,
      reference: txn.reference,
      balanceAfter: txn.balanceAfter,
      orderId: type === "debit" || type === "refund" ? `KMP-${2400 + (i % 38)}` : null,
      createdAt: txn.createdAt,
    };
  });

  return rows.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Full detail payload for /admin/withdrawals/[id]: the request plus the
 * vendor's wallet context, activity history, lifecycle timeline and
 * previous payout requests.
 */
export function buildWithdrawalDetail(id: string): ManagedWithdrawalDetail | null {
  const request = mockWithdrawals.find((w) => w.id === id.trim().toLowerCase());
  if (!request) return null;

  const vendor = mockVendors.find((v) => v.id === request.vendorId);
  const matchesVendor = (ownerName: string, ownerEmail?: string) =>
    ownerName === request.vendorName || (vendor != null && ownerEmail === vendor.email);

  const account = mockWalletAccounts.find(
    (a) => a.ownerType === "vendor" && matchesVendor(a.ownerName, a.ownerEmail)
  );

  const history = buildFinanceTransactions()
    .filter((t) => t.ownerType === "vendor" && t.ownerName === request.vendorName)
    .slice(0, 8);

  const previous = mockWithdrawals
    .filter((w) => w.vendorId === request.vendorId && w.id !== request.id)
    .sort(
      (a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()
    )
    .slice(0, 6);

  return JSON.parse(
    JSON.stringify({
      request,
      vendorBalance: account?.balance ?? null,
      vendorWalletId: account?.id ?? null,
      campusId: account?.campusId ?? null,
      timeline: buildWithdrawalTimeline(request),
      history,
      previous,
    })
  ) as ManagedWithdrawalDetail;
}

function buildWithdrawalTimeline(
  request: (typeof mockWithdrawals)[number]
): ManagedWithdrawalTimelineEvent[] {
  const rand = seededRandom(Number(request.id.replace(/\D+/g, "")) * 13 + 7);
  const events: ManagedWithdrawalTimelineEvent[] = [];

  const requestedMs = new Date(request.requestedAt).getTime();
  const processedMs = request.processedAt
    ? new Date(request.processedAt).getTime()
    : null;
  // Terminal events land after the request; intermediate steps interpolate.
  const span =
    processedMs != null
      ? Math.max(processedMs - requestedMs, 60 * 60_000)
      : intBetween(rand, 12, 48) * 60 * 60_000;

  const at = (fraction: number): string =>
    new Date(requestedMs + Math.round(span * fraction)).toISOString();

  let n = 0;
  const push = (
    kind: ManagedWithdrawalTimelineEvent["kind"],
    label: string,
    detail: string | null,
    fraction: number
  ) => {
    n += 1;
    events.push({ id: `wevt-${n}`, kind, label, detail, at: at(fraction) });
  };

  push("requested", "Payout requested", `${request.bankName} · ${request.accountNumberMasked}`, 0);

  switch (request.status) {
    case "pending":
      push("review", "Awaiting review", "Queued for finance review", 1);
      break;
    case "processing":
      push("review", "Marked as processing", "Transfer being prepared", 0.4);
      break;
    case "approved":
      push("review", "Marked as processing", "Transfer being prepared", 0.3);
      push("decision", "Approved", "Cleared for bank transfer", 0.75);
      break;
    case "completed":
      push("review", "Marked as processing", "Transfer being prepared", 0.25);
      push("decision", "Approved", "Bank transfer released to vendor", 0.55);
      push("completed", "Completed", `Settled incl. ${request.fee} naira fee`, 1);
      break;
    case "rejected":
      push("rejected", "Rejected", request.note ?? "Rejected by finance", 0.6);
      break;
    case "failed":
      push("decision", "Approved", "Bank transfer attempted", 0.45);
      push("failed", "Transfer failed", request.note ?? "Bank returned the transfer", 1);
      break;
  }

  return events;
}
