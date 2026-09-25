import { apiClient, type ApiError } from "@/lib/api-client";
import {
  VENDOR_FINANCIAL_LIMITS,
  type FinancialSummaryCard,
  type PayoutRequestInput,
  type PayoutRequestResult,
  type VendorFinancialOverview,
  type VendorFinancialPage,
  type VendorFinancialQuery,
  type VendorFinancialTransaction,
  type VendorFinancialTxType,
  type VendorPayout,
  type VendorPayoutAccount,
  type VendorPayoutStatus,
  type VendorStatement,
} from "@/types/vendor-financials";

// ============================================================
// VENDOR FINANCIALS — LIVE API LAYER (wallet ledger)
// ============================================================
//   GET  /vendor/financials/overview
//   GET  /vendor/financials/transactions[/:id]
//   GET  /vendor/financials/payout-account
//   GET  /vendor/financials/payouts
//   POST /vendor/financials/payouts      { amount, idempotencyKey, confirmed }
//   GET  /vendor/financials/statement?month=YYYY-MM
//
// Balances, fees and payouts are computed server-side from the vendor's own
// wallet ledger. The platform fee is charged to the vendor and is already
// deducted from every order payout shown here.

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface BackendTransaction {
  id: string;
  type: VendorFinancialTxType;
  status: "pending" | "successful" | "failed" | "reversed";
  sign: "credit" | "debit";
  amount: number;
  fee?: number;
  description: string;
  orderId?: string;
  reference: string;
  at: string;
  balanceAfter: number;
}

interface BackendOverview {
  available: number;
  pendingWithdrawals: number;
  totalEarned: number;
  totalPaidOut: number;
  platformFeesPaid: number;
  escrow: {
    count: number;
    total: number;
    orders: { id: string; orderNumber: string; amount: number; at: string }[];
  };
  recent: BackendTransaction[];
  limits: { minPayout: number; maxPayout: number };
  account: BackendAccount;
}

type BackendAccount =
  | { status: "missing"; currency: "NGN" }
  | {
      id: string;
      bankName: string;
      bankCode: string;
      accountName: string;
      maskedAccountNumber: string;
      status: "verified" | "restricted";
      currency: "NGN";
    };

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

// ── Mapping ──────────────────────────────────────────────────

export function mapTransaction(tx: BackendTransaction): VendorFinancialTransaction {
  return {
    id: tx.id,
    type: tx.type,
    status: tx.status,
    sign: tx.sign,
    amount: tx.amount,
    fee: tx.fee,
    description: tx.description,
    orderId: tx.orderId,
    reference: tx.reference,
    at: tx.at,
    events: [
      {
        id: `${tx.id}-recorded`,
        title: "Recorded in your wallet",
        detail: `Balance after: ₦${tx.balanceAfter.toLocaleString("en-NG")}`,
        at: tx.at,
      },
    ],
  };
}

function mapAccount(account: BackendAccount): VendorPayoutAccount {
  if (account.status === "missing") {
    return {
      bankName: "",
      bankCode: "",
      accountName: "",
      maskedAccountNumber: "",
      status: "missing",
      currency: "NGN",
    };
  }
  return {
    bankName: account.bankName,
    bankCode: account.bankCode,
    accountName: account.accountName,
    maskedAccountNumber: account.maskedAccountNumber,
    status: account.status,
    currency: "NGN",
  };
}

// ── Queries ──────────────────────────────────────────────────

export async function fetchFinancialOverview(): Promise<
  VendorFinancialOverview & { limits: BackendOverview["limits"]; available: number }
> {
  const o = await unwrap(apiClient.get<BackendOverview>("/vendor/financials/overview"));

  const cards: FinancialSummaryCard[] = [
    { key: "available", label: "Available balance", value: o.available, sublabel: "Ready to pay out", tone: "positive" },
    { key: "escrow", label: "In escrow", value: o.escrow.total, sublabel: `${o.escrow.count} order${o.escrow.count === 1 ? "" : "s"} awaiting delivery`, tone: "info" },
    { key: "pending", label: "Pending payouts", value: o.pendingWithdrawals, sublabel: "Being sent to your bank", tone: "neutral" },
    { key: "earned", label: "Total earned", value: o.totalEarned, sublabel: "After platform fees", tone: "neutral" },
    { key: "fees", label: "Platform fees paid", value: o.platformFeesPaid, sublabel: "Deducted from payouts", tone: "neutral" },
  ];

  return {
    available: o.available,
    limits: o.limits,
    cards,
    escrow: {
      buckets: [
        {
          key: "held",
          label: "Held until delivery",
          variant: "info",
          total: o.escrow.total,
          count: o.escrow.count,
          orders: o.escrow.orders.map((e) => ({ id: e.orderNumber, amount: e.amount, at: e.at })),
        },
      ],
      frozenTotal: 0,
      refundPendingTotal: 0,
    },
    recentTransactions: o.recent.map(mapTransaction),
    account: mapAccount(o.account),
  };
}

export async function fetchFinancialTransactions(
  query: VendorFinancialQuery = {}
): Promise<VendorFinancialPage<VendorFinancialTransaction>> {
  const params = new URLSearchParams();
  if (query.search?.trim()) params.set("search", query.search.trim());
  if (query.type && query.type !== "all") params.set("type", query.type);
  if (query.status && query.status !== "all") {
    // The UI's "processing" / "refunded" / "disputed" have no ledger equivalent.
    const map: Record<string, string> = { pending: "pending", processing: "pending", successful: "successful", failed: "failed", reversed: "reversed" };
    if (map[query.status]) params.set("status", map[query.status]);
  }
  if (query.sign && query.sign !== "all") params.set("sign", query.sign);
  if (query.from) params.set("from", new Date(query.from).toISOString());
  if (query.to) params.set("to", new Date(`${query.to}T23:59:59.999Z`).toISOString());
  if (query.sort) params.set("sort", query.sort);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.pageSize ?? 10));

  const res = await unwrap(
    apiClient.get<BackendPage<BackendTransaction> & { totals: { credit: number; debit: number } }>(
      `/vendor/financials/transactions?${params}`
    )
  );
  return {
    items: res.items.map(mapTransaction),
    total: res.meta.total,
    page: res.meta.page,
    pageSize: res.meta.limit,
    totalPages: Math.max(1, res.meta.totalPages),
    totals: res.totals,
  };
}

export async function fetchFinancialTransaction(id: string): Promise<VendorFinancialTransaction> {
  return mapTransaction(await unwrap(apiClient.get<BackendTransaction>(`/vendor/financials/transactions/${id}`)));
}

export async function fetchPayouts(
  query: { page?: number; pageSize?: number; status?: VendorPayoutStatus | "all" } = {}
): Promise<VendorFinancialPage<VendorPayout>> {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  params.set("page", String(query.page ?? 1));
  params.set("limit", String(query.pageSize ?? 10));
  const res = await unwrap(apiClient.get<BackendPage<VendorPayout>>(`/vendor/financials/payouts?${params}`));
  return {
    items: res.items,
    total: res.meta.total,
    page: res.meta.page,
    pageSize: res.meta.limit,
    totalPages: Math.max(1, res.meta.totalPages),
    totals: { credit: 0, debit: res.items.reduce((s, p) => s + p.amount, 0) },
  };
}

export async function fetchStatement(month: string): Promise<VendorStatement> {
  const s = await unwrap(apiClient.get<Omit<VendorStatement, "exportable">>(`/vendor/financials/statement?month=${month}`));
  return { ...s, exportable: true };
}

/** Builds a CSV of the statement in the browser from server-provided figures. */
export function statementToCsv(statement: VendorStatement): { filename: string; csv: string } {
  const rows = [
    ["Kampmax vendor statement", statement.periodLabel],
    ["Generated", statement.generatedAt],
    [],
    ["Opening balance", String(statement.openingBalance)],
    ...statement.lines.map((l) => [l.label, String(l.value), `${l.count} item(s)`]),
    ["Closing balance", String(statement.closingBalance)],
  ];
  const csv = rows
    .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  return { filename: `kampmax-statement-${statement.from.slice(0, 7)}.csv`, csv };
}

// ── Commands ─────────────────────────────────────────────────

export async function requestPayoutApi(input: PayoutRequestInput): Promise<PayoutRequestResult> {
  const { data, error } = await apiClient.post<PayoutRequestInput, VendorPayout>(
    "/vendor/financials/payouts",
    input
  );
  if (error || !data) {
    const message = error?.message ?? "We couldn't process your payout request.";
    const lower = message.toLowerCase();
    return {
      ok: false,
      code: lower.includes("insufficient")
        ? "insufficient_balance"
        : lower.includes("minimum")
          ? "below_minimum"
          : lower.includes("maximum")
            ? "above_maximum"
            : lower.includes("bank account")
              ? "account_not_verified"
              : "invalid_amount",
      error: message,
    };
  }
  return { ok: true, code: "ok", payout: data };
}

export { VENDOR_FINANCIAL_LIMITS };
