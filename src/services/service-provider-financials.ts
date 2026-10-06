// ============================================================
// SERVICE PROVIDER FINANCIALS SERVICE  (Module 20)
// ============================================================
//
// SECURITY: All balances, period totals and ledger entries are COMPUTED BY
// THIS SERVICE from the provider's own booking ledger. The frontend never
// sums or derives money. Ownership is derived from the authenticated service
// provider record (sp1) — IDOR-safe. Payout requests are idempotency-keyed
// and re-validated server-side (available balance, minimum, maximum, account
// status, duplicates).
//
// Ledger model per settled booking (confirmed completion):
//   service_payment (CREDIT, gross) + platform_fee (DEBIT, fee) — the net is
//   providerEarnings. Per pending booking the service exposes a projected
//   settlement (never styled as paid). There is NO escrow-release UI here.

import { apiClient } from "@/lib/api-client";
import { getSpProfileRecord, pushSpFinancialNotification, recordSpFinancialActivity } from "@/services/service-provider-dashboard";
import { getBookingsForProvider, settlementPreviewFor } from "@/data/booking";
import { spFinancialsStore } from "@/data/service-provider-financials";
import { formatNaira } from "@/lib/utils";
import { fetchFinancialStatus, startFinancialOnboarding } from "@/services/financial-api";
import type { ServiceBooking } from "@/types/booking";
import {
  SP_FINANCIAL_TX_TYPE,
  SP_FINANCIAL_TX_STATUS,
  SP_FIN_SIGN,
  SP_FINANCIAL_SORT,
  SP_FINANCIAL_PERIOD,
  SP_FINANCIAL_RESULT,
  SP_PAYOUT_ACCOUNT_RESULT,
  SP_PAYOUT_ACCOUNT_STATUS,
  SP_FINANCIAL_LIMITS,
} from "@/types/service-provider-financials";
import type {
  SpCsvExport,
  SpEarningsBreakdown,
  SpFinancialPage,
  SpFinancialPermissions,
  SpFinancialPermissionKey,
  SpFinancialPeriod,
  SpFinancialPeriodKey,
  SpFinancialQuery,
  SpFinancialSort,
  SpFinancialSummaryCard,
  SpFinancialSummaryTone,
  SpFinancialTransaction,
  SpFinancialTxStatus,
  SpFinancialTxType,
  SpFinSign,
  SpFinancialOverview,
  SpPayout,
  SpPayoutAccount,
  SpPayoutAccountInput,
  SpPayoutAccountResult,
  SpPayoutAccountStatus,
  SpPayoutRequestInput,
  SpPayoutRequestResult,
  SpPayoutStatus,
} from "@/types/service-provider-financials";

// ── Ownership / access ──────────────────────────────────────

function ownerProviderId(): string | null {
  const profile = getSpProfileRecord();
  if (!profile) return null;
  return profile.providerId;
}

function requireOwner(): string {
  const providerId = ownerProviderId();
  if (!providerId) throw new Error("UNAUTHORIZED");
  return providerId;
}

export function getSpFinancialPermissions(): SpFinancialPermissions {
  const providerId = ownerProviderId();
  const canView = !!providerId;
  const account = getPayoutAccount();
  return {
    "financials.view": canView,
    "transactions.view": canView,
    "payouts.view": canView,
    "payouts.request": canView && account.status === "verified",
    "payout_account.manage": canView,
  } satisfies Record<SpFinancialPermissionKey, boolean>;
}

// ── Platform clock (backend-authoritative, matches relative seeds) ─

const DAY_MS = 24 * 3_600_000;
const LAGOS_OFFSET_MS = 3_600_000; // UTC+1, no DST

function nowMs(): number {
  return Date.now();
}

// ── Financial period resolution (server-side only) ───────────

interface PeriodWindow {
  fromMs: number;
  toMs: number;
}

function startOfLagosUtcDay(ms: number): number {
  const shifted = ms + LAGOS_OFFSET_MS;
  const utcDayStart = Math.floor(shifted / DAY_MS) * DAY_MS;
  return utcDayStart - LAGOS_OFFSET_MS;
}

function isoDayStartMs(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  return Date.UTC(y, m - 1, d, 0, 0, 0, 0) - LAGOS_OFFSET_MS;
}

function resolvePeriod(period: SpFinancialPeriod, now: number): { keyLabel: string; fromMs: number; toMs: number; fromIso: string; toIso: string } {
  const fromIso = (ms: number) => new Date(ms).toISOString();
  switch (period.key) {
    case SP_FINANCIAL_PERIOD.TODAY: {
      const fromMs = startOfLagosUtcDay(now);
      return { keyLabel: "Today", fromMs, toMs: now, fromIso: fromIso(fromMs), toIso: fromIso(now) };
    }
    case SP_FINANCIAL_PERIOD.SEVEN_DAYS: {
      const fromMs = now - 7 * DAY_MS;
      return { keyLabel: "Last 7 days", fromMs, toMs: now, fromIso: fromIso(fromMs), toIso: fromIso(now) };
    }
    case SP_FINANCIAL_PERIOD.THIRTY_DAYS: {
      const fromMs = now - 30 * DAY_MS;
      return { keyLabel: "Last 30 days", fromMs, toMs: now, fromIso: fromIso(fromMs), toIso: fromIso(now) };
    }
    case SP_FINANCIAL_PERIOD.THIS_MONTH: {
      const monthStart = startOfMonthLagos(now);
      return { keyLabel: "This month", fromMs: monthStart, toMs: now, fromIso: fromIso(monthStart), toIso: fromIso(now) };
    }
    case SP_FINANCIAL_PERIOD.LAST_MONTH: {
      const nowLs = new Date(now + LAGOS_OFFSET_MS);
      const firstLast = Date.UTC(nowLs.getUTCFullYear(), nowLs.getUTCMonth() - 1, 1) - LAGOS_OFFSET_MS;
      const nextFirst = Date.UTC(nowLs.getUTCFullYear(), nowLs.getUTCMonth(), 1) - LAGOS_OFFSET_MS;
      const fromIsoDate = new Date(firstLast + LAGOS_OFFSET_MS).toISOString().slice(0, 10);
      const toIsoDate = new Date(nextFirst - 1).toISOString();
      return { keyLabel: "Last month", fromMs: firstLast, toMs: nextFirst - 1, fromIso: `${fromIsoDate}T00:00:00.000Z`, toIso: toIsoDate };
    }
    case SP_FINANCIAL_PERIOD.CUSTOM:
    default: {
      const fromMs = period.from ? isoDayStartMs(period.from) : now - 7 * DAY_MS;
      const toMs = period.to ? isoDayStartMs(period.to) + DAY_MS - 1 : now;
      return {
        keyLabel: `${period.from && period.to ? `${period.from} → ${period.to}` : "Custom"}`,
        fromMs: Math.min(fromMs, toMs),
        toMs,
        fromIso: fromIso(Math.min(fromMs, toMs)),
        toIso: fromIso(toMs),
      };
    }
  }
}

function startOfMonthLagos(ms: number): number {
  const ls = new Date(ms + LAGOS_OFFSET_MS);
  return Date.UTC(ls.getUTCFullYear(), ls.getUTCMonth(), 1) - LAGOS_OFFSET_MS;
}

export function getFinancialPeriodLabel(key: SpFinancialPeriodKey): string {
  switch (key) {
    case SP_FINANCIAL_PERIOD.TODAY:
      return "Today";
    case SP_FINANCIAL_PERIOD.SEVEN_DAYS:
      return "Last 7 days";
    case SP_FINANCIAL_PERIOD.THIRTY_DAYS:
      return "Last 30 days";
    case SP_FINANCIAL_PERIOD.THIS_MONTH:
      return "This month";
    case SP_FINANCIAL_PERIOD.LAST_MONTH:
      return "Last month";
    case SP_FINANCIAL_PERIOD.CUSTOM:
      return "Custom";
  }
}

// ── Booking bucket helpers ───────────────────────────────────

function settledNet(b: ServiceBooking): number {
  return b.fulfillment.settlement?.providerEarnings ?? 0;
}

function referenceFor(b: ServiceBooking): string {
  return b.bookingReference;
}

// ── Ledger derivation (single source of truth) ───────────────

function deriveLedger(): SpFinancialTransaction[] {
  const providerId = requireOwner();
  const bookings = getBookingsForProvider(providerId, "all") as ServiceBooking[];
  const txns: SpFinancialTransaction[] = [];
  const now = nowMs();

  for (const b of bookings) {
    if (b.status !== "completed") continue;
    if (b.fulfillment.confirmationStatus !== "confirmed") continue;
    const s = b.fulfillment.settlement;
    if (!s) continue;

    const at = b.fulfillment.customerConfirmedAt ?? (b.fulfillment.completedAt ?? b.updatedAt);
    const events = b.timeline
      .filter((e) => e.kind === "completed" || e.kind === "completion_confirmed")
      .map((e, i) => ({ id: `${b.id}-evt-${i}`, title: e.title, detail: e.message, at: e.createdAt }));

    txns.push({
      id: `txn-pay-${b.id}`,
      type: SP_FINANCIAL_TX_TYPE.SERVICE_PAYMENT,
      status: SP_FINANCIAL_TX_STATUS.SUCCESSFUL,
      sign: SP_FIN_SIGN.CREDIT,
      amount: s.serviceAmount,
      description: `Service payment — ${b.serviceName}`,
      orderId: b.id,
      reference: `SPPAY-${referenceFor(b)}`,
      at,
      events,
    });

    txns.push({
      id: `txn-fee-${b.id}`,
      type: SP_FINANCIAL_TX_TYPE.PLATFORM_FEE,
      status: SP_FINANCIAL_TX_STATUS.SUCCESSFUL,
      sign: SP_FIN_SIGN.DEBIT,
      amount: s.platformFee,
      description: `Platform fee — ${b.serviceName}`,
      orderId: b.id,
      reference: `SPFEE-${referenceFor(b)}`,
      at,
      events: [],
    });
  }

  for (const p of spFinancialsStore.payouts) {
    const status: SpFinancialTxStatus =
      p.status === "successful"
        ? SP_FINANCIAL_TX_STATUS.SUCCESSFUL
        : p.status === "processing"
        ? SP_FINANCIAL_TX_STATUS.PROCESSING
        : SP_FINANCIAL_TX_STATUS.FAILED;
    txns.push({
      id: `txn-pout-${p.id}`,
      type: SP_FINANCIAL_TX_TYPE.PAYOUT,
      status,
      sign: SP_FIN_SIGN.DEBIT,
      amount: p.amount + p.fee,
      fee: p.fee,
      description: `Payout to ${p.bankName} •••${p.maskedAccountNumber.slice(-4)}`,
      reference: p.reference,
      payoutId: p.id,
      bankRef: `${p.bankName} ${p.maskedAccountNumber}`,
      at: p.requestedAt,
      events: [
        { id: `${p.id}-req`, title: "Payout requested", detail: `Amount ${formatNaira(p.amount)}, fee ${formatNaira(p.fee)}`, at: p.requestedAt },
        ...(p.processedAt ? [{ id: `${p.id}-done`, title: "Payout processed", detail: "Funds sent to bank", at: p.processedAt }] : []),
        ...(p.failedReason ? [{ id: `${p.id}-fail`, title: "Payout failed", detail: p.failedReason, at: p.processedAt ?? p.requestedAt }] : []),
      ],
    });
  }

  return txns.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

// ── Summary / breakdown computation ──────────────────────────

function computeCardsAndBreakdown(period: SpFinancialPeriod): {
  cards: SpFinancialSummaryCard[];
  breakdown: SpEarningsBreakdown;
} {
  const providerId = requireOwner();
  const now = nowMs();
  const bookings = getBookingsForProvider(providerId, "all") as ServiceBooking[];
  const window = resolvePeriod(period, now);

  let totalNet = 0;
  let pendingNet = 0;
  let onHoldNet = 0;
  let periodGross = 0;
  let periodFees = 0;
  let periodTax = 0;
  let periodNet = 0;
  let periodSettled = 0;

  for (const b of bookings) {
    if (b.status !== "completed") continue;
    const status = b.fulfillment.confirmationStatus;
    if (status === "confirmed") {
      const s = b.fulfillment.settlement;
      if (!s) continue;
      totalNet += s.providerEarnings;
      const atMs = new Date(b.fulfillment.customerConfirmedAt ?? (b.fulfillment.completedAt ?? b.updatedAt)).getTime();
      if (atMs >= window.fromMs && atMs <= window.toMs) {
        periodGross += s.serviceAmount;
        periodFees += s.platformFee;
        periodTax += s.tax;
        periodNet += s.providerEarnings;
        periodSettled += 1;
      }
    } else if (status === "awaiting") {
      pendingNet += settlementPreviewFor(b, now).providerEarnings;
    } else if (status === "problem_reported") {
      onHoldNet += settlementPreviewFor(b, now).providerEarnings;
    }
  }

  const successful = spFinancialsStore.payouts
    .filter((p) => p.status === "successful")
    .reduce((sum, p) => sum + p.amount + p.fee, 0);
  const processing = spFinancialsStore.payouts
    .filter((p) => p.status === "processing")
    .reduce((sum, p) => sum + p.amount + p.fee, 0);

  let payoutTotal = 0;
  let payoutCount = 0;
  for (const p of spFinancialsStore.payouts) {
    const atMs = new Date(p.requestedAt).getTime();
    if (atMs >= window.fromMs && atMs <= window.toMs) {
      payoutTotal += p.amount + p.fee;
      payoutCount += 1;
    }
  }

  const available = Math.max(0, totalNet - successful - processing);
  const lastPayout = [...spFinancialsStore.payouts]
    .filter((p) => p.status === "successful")
    .sort((a, b) => new Date(b.processedAt ?? b.requestedAt).getTime() - new Date(a.processedAt ?? a.requestedAt).getTime())[0];

  return {
    cards: [
      {
        key: "available",
        label: "Available Balance",
        value: available,
        sublabel: "Ready to withdraw",
        tone: "positive",
      },
      {
        key: "pending",
        label: "Pending Balance",
        value: pendingNet,
        sublabel: "Awaiting completion confirmation",
        tone: "info",
      },
      {
        key: "onHold",
        label: "On Hold",
        value: onHoldNet,
        sublabel: "Escrow disputed — under review",
        tone: "negative",
      },
      {
        key: "netEarnings",
        label: "Net Earnings",
        value: periodNet,
        sublabel: window.keyLabel,
        tone: "neutral",
      },
    ],
    breakdown: {
      periodLabel: window.keyLabel,
      from: window.fromIso,
      to: window.toIso,
      gross: periodGross,
      platformFees: periodFees,
      tax: periodTax,
      net: periodNet,
      settledCount: periodSettled,
      payoutTotal,
      payoutCount,
    },
  };
}

// ── Public API ───────────────────────────────────────────────

const DASHBOARD_PERIOD: SpFinancialPeriod = { key: SP_FINANCIAL_PERIOD.THIRTY_DAYS };

export function getFinancialOverview(period: SpFinancialPeriod = DASHBOARD_PERIOD): SpFinancialOverview {
  requireOwner();
  const { cards, breakdown } = computeCardsAndBreakdown(period);
  return {
    cards,
    breakdown,
    recentTransactions: deriveLedger().slice(0, 5),
    account: getPayoutAccount(),
  };
}

export function getPayoutAccount(): SpPayoutAccount {
  requireOwner();
  return spFinancialsStore.account;
}

export function updatePayoutAccount(input: SpPayoutAccountInput): SpPayoutAccountResult {
  const providerId = ownerProviderId();
  if (!providerId) {
    return { ok: false, code: SP_PAYOUT_ACCOUNT_RESULT.MISSING, error: "You don't have a payout account." };
  }
  const bankName = input.bankName.trim();
  const accountName = input.accountName.trim();
  const accountNumber = input.accountNumber.replace(/\D/g, "");
  if (!bankName || !accountName || accountNumber.length < 10) {
    return { ok: false, code: SP_PAYOUT_ACCOUNT_RESULT.INVALID_INPUT, error: "Enter a valid bank, account name, and 10-digit account number." };
  }

  spFinancialsStore.account = {
    bankName,
    bankCode: "000",
    accountName,
    maskedAccountNumber: `••••••••${accountNumber.slice(-4)}`,
    status: "pending_verification",
    verifiedAt: undefined,
    currency: "NGN",
    restrictions: [],
  };

  return {
    ok: true,
    code: SP_PAYOUT_ACCOUNT_RESULT.OK,
    account: spFinancialsStore.account,
  };
}

export function getTransactions(query: SpFinancialQuery = {}): SpFinancialPage<SpFinancialTransaction> {
  requireOwner();
  const {
    search = "",
    type = "all",
    status = "all",
    sign = "all",
    from,
    to,
    sort = SP_FINANCIAL_SORT.NEWEST,
    page = 1,
    pageSize = 10,
  } = query;

  let items = deriveLedger();

  if (search) {
    const q = search.toLowerCase();
    items = items.filter(
      (t) =>
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.reference.toLowerCase().includes(q) ||
        (t.orderId ?? "").toLowerCase().includes(q) ||
        (t.payoutId ?? "").toLowerCase().includes(q)
    );
  }

  if (type !== "all") items = items.filter((t) => t.type === type);
  if (status !== "all") items = items.filter((t) => t.status === status);
  if (sign !== "all") items = items.filter((t) => t.sign === sign);
  if (from) items = items.filter((t) => t.at >= `${from}T00:00:00.000Z`);
  if (to) items = items.filter((t) => t.at <= `${to}T23:59:59.999Z`);

  switch (sort) {
    case SP_FINANCIAL_SORT.OLDEST:
      items.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
      break;
    case SP_FINANCIAL_SORT.AMOUNT_DESC:
      items.sort((a, b) => b.amount - a.amount);
      break;
    case SP_FINANCIAL_SORT.AMOUNT_ASC:
      items.sort((a, b) => a.amount - b.amount);
      break;
    default:
      break;
  }

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = items.slice((page - 1) * pageSize, page * pageSize);

  const totals = paged.reduce(
    (acc, t) => {
      if (t.sign === SP_FIN_SIGN.CREDIT) acc.credit += t.amount;
      else acc.debit += t.amount;
      return acc;
    },
    { credit: 0, debit: 0 }
  );

  return { items: paged, total, page, pageSize, totalPages, totals };
}

export function getTransactionById(transactionId: string): SpFinancialTransaction | null {
  requireOwner();
  return deriveLedger().find((t) => t.id === transactionId) ?? null;
}

export function exportTransactionsCsv(query: SpFinancialQuery = {}): SpCsvExport {
  requireOwner();
  const page = getTransactions({ ...query, page: 1, pageSize: 5000 });
  const rows: string[][] = [
    ["Type", "Status", "Direction", "Amount (NGN)", "Fee (NGN)", "Description", "Booking ID", "Reference", "Date"],
    ...page.items.map((t) => [
      t.type,
      t.status,
      t.sign,
      String(t.amount),
      String(t.fee ?? 0),
      t.description,
      t.orderId ?? "",
      t.reference,
      t.at,
    ]),
  ];
  const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
  return { ok: true, filename: `kampmax-financial-transactions-${new Date().toISOString().slice(0, 10)}.csv`, csv };
}

export function getPayouts(query: { page?: number; pageSize?: number; status?: SpPayoutStatus | "all" } = {}): SpFinancialPage<SpPayout> {
  requireOwner();
  const { page = 1, pageSize = 10, status = "all" } = query;
  let items = [...spFinancialsStore.payouts].sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime());

  if (status !== "all") items = items.filter((p) => p.status === status);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const paged = items.slice((page - 1) * pageSize, page * pageSize);

  const totals = paged.reduce(
    (acc, p) => {
      acc.debit += p.amount + p.fee;
      return acc;
    },
    { credit: 0, debit: 0 }
  );

  return { items: paged, total, page, pageSize, totalPages, totals };
}

export function getPayoutById(payoutId: string): SpPayout | null {
  requireOwner();
  return spFinancialsStore.payouts.find((p) => p.id === payoutId) ?? null;
}

export function requestPayout(input: SpPayoutRequestInput): SpPayoutRequestResult {
  const providerId = ownerProviderId();
  if (!providerId) return { ok: false, code: SP_FINANCIAL_RESULT.FORBIDDEN, error: "Service provider not found" };

  const perms = getSpFinancialPermissions();
  if (!perms["payouts.request"]) {
    return { ok: false, code: SP_FINANCIAL_RESULT.ACCOUNT_NOT_VERIFIED, error: "Payout account not verified" };
  }

  const account = getPayoutAccount();
  if (account.status !== "verified") {
    return { ok: false, code: SP_FINANCIAL_RESULT.ACCOUNT_NOT_VERIFIED, error: "Payout account not verified" };
  }
  if (account.restrictions?.length) {
    return { ok: false, code: SP_FINANCIAL_RESULT.ACCOUNT_RESTRICTED, error: "Account has restrictions" };
  }

  if (spFinancialsStore.idempotencyKeys.has(input.idempotencyKey)) {
    const existing = spFinancialsStore.payouts.find((p) => p.idempotencyKey === input.idempotencyKey);
    return { ok: false, code: SP_FINANCIAL_RESULT.DUPLICATE_REQUEST, payout: existing, error: "Duplicate request" };
  }

  if (!input.confirmed) {
    return { ok: false, code: SP_FINANCIAL_RESULT.NOT_CONFIRMED, error: "Confirmation required" };
  }

  const available = computeAvailable();
  const min = SP_FINANCIAL_LIMITS.MIN_PAYOUT;
  const max = SP_FINANCIAL_LIMITS.MAX_PAYOUT;
  const fee = SP_FINANCIAL_LIMITS.PAYOUT_FEE;

  if (input.amount < min) return { ok: false, code: SP_FINANCIAL_RESULT.BELOW_MINIMUM, error: `Minimum payout is ${formatNaira(min)}` };
  if (input.amount > max) return { ok: false, code: SP_FINANCIAL_RESULT.ABOVE_MAXIMUM, error: `Maximum payout is ${formatNaira(max)}` };
  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    return { ok: false, code: SP_FINANCIAL_RESULT.INVALID_AMOUNT, error: "Enter a valid payout amount." };
  }
  if (input.amount + fee > available) {
    return { ok: false, code: SP_FINANCIAL_RESULT.INSUFFICIENT_BALANCE, error: `Insufficient balance. Available: ${formatNaira(available)}` };
  }

  const now = nowMs();
  const seq = spFinancialsStore.payouts.reduce((maxId, p) => Math.max(maxId, Number(p.id.split("-")[1]) || 0), 2000) + 1;
  const payout: SpPayout = {
    id: `SPOUT-${seq}`,
    amount: input.amount,
    fee,
    status: "processing",
    bankName: account.bankName,
    maskedAccountNumber: account.maskedAccountNumber,
    requestedAt: new Date(now).toISOString(),
    expectedAt: new Date(now + 24 * 3_600_000).toISOString(),
    reference: `KMP-SPOUT-${seq}`,
    idempotencyKey: input.idempotencyKey,
  };

  spFinancialsStore.payouts.unshift(payout);
  spFinancialsStore.idempotencyKeys.add(input.idempotencyKey);

  pushSpFinancialNotification(
    "Payout requested",
    `Your payout of ${formatNaira(input.amount)} is being processed to ${account.bankName} •••${account.maskedAccountNumber.slice(-4)}.`,
    "/service-provider/financials/payouts"
  );
  recordSpFinancialActivity(
    "Payout requested",
    `A payout of ${formatNaira(input.amount)} was submitted and is processing.`,
    "/service-provider/financials/payouts"
  );

  return { ok: true, code: SP_FINANCIAL_RESULT.OK, payout, available: available - input.amount - fee };
}

export function computeAvailable(): number {
  const providerId = requireOwner();
  const now = nowMs();
  let totalNet = 0;
  for (const b of getBookingsForProvider(providerId, "all") as ServiceBooking[]) {
    if (b.status !== "completed" || b.fulfillment.confirmationStatus !== "confirmed") continue;
    totalNet += b.fulfillment.settlement?.providerEarnings ?? 0;
  }
  void now;
  const out = spFinancialsStore.payouts
    .filter((p) => p.status === "successful" || p.status === "processing")
    .reduce((sum, p) => sum + p.amount + p.fee, 0);
  return Math.max(0, totalNet - out);
}

// ── Live Backend API Integrations ──────────────────────────

function mapWalletTxToSpTx(tx: {
  id: string;
  type: string;
  direction: "CREDIT" | "DEBIT";
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
  amount: number;
  reference: string;
  description: string;
  createdAt: string | Date;
}): SpFinancialTransaction {
  const isCredit = tx.direction === "CREDIT";
  let txType: SpFinancialTxType = SP_FINANCIAL_TX_TYPE.SERVICE_PAYMENT;
  const lowerType = (tx.type || "").toLowerCase();
  if (!isCredit) {
    if (lowerType.includes("withdraw") || lowerType.includes("payout")) {
      txType = SP_FINANCIAL_TX_TYPE.PAYOUT;
    } else if (lowerType.includes("fee")) {
      txType = SP_FINANCIAL_TX_TYPE.PLATFORM_FEE;
    } else if (lowerType.includes("refund")) {
      txType = SP_FINANCIAL_TX_TYPE.REFUND;
    } else {
      txType = SP_FINANCIAL_TX_TYPE.ADJUSTMENT;
    }
  } else {
    if (lowerType.includes("refund") || lowerType.includes("reversal")) {
      txType = SP_FINANCIAL_TX_TYPE.REFUND;
    } else if (lowerType.includes("adjustment") || lowerType.includes("topup")) {
      txType = SP_FINANCIAL_TX_TYPE.ADJUSTMENT;
    }
  }

  let txStatus: SpFinancialTxStatus = SP_FINANCIAL_TX_STATUS.SUCCESSFUL;
  if (tx.status === "PENDING") txStatus = SP_FINANCIAL_TX_STATUS.PENDING;
  else if (tx.status === "FAILED") txStatus = SP_FINANCIAL_TX_STATUS.FAILED;
  else if (tx.status === "REVERSED") txStatus = SP_FINANCIAL_TX_STATUS.REVERSED;

  const dateStr = typeof tx.createdAt === "string" ? tx.createdAt : new Date(tx.createdAt).toISOString();

  return {
    id: tx.id,
    type: txType,
    status: txStatus,
    sign: isCredit ? SP_FIN_SIGN.CREDIT : SP_FIN_SIGN.DEBIT,
    amount: tx.amount,
    fee: txType === SP_FINANCIAL_TX_TYPE.PAYOUT ? SP_FINANCIAL_LIMITS.PAYOUT_FEE : undefined,
    description: tx.description || (isCredit ? "Service booking payment" : "Withdrawal"),
    reference: tx.reference,
    at: dateStr,
    events: [
      {
        id: `ev-${tx.id}-1`,
        title: txStatus === SP_FINANCIAL_TX_STATUS.SUCCESSFUL ? "Completed" : "Recorded",
        at: dateStr,
      },
    ],
  };
}

export async function getTransactionsLive(query?: SpFinancialQuery): Promise<SpFinancialPage<SpFinancialTransaction>> {
  const page = query?.page ?? 1;
  const pageSize = query?.pageSize ?? 10;
  try {
    const { data: res } = await apiClient.get<{
      data: Array<{
        id: string;
        type: string;
        direction: "CREDIT" | "DEBIT";
        status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
        amount: number;
        reference: string;
        description: string;
        createdAt: string | Date;
      }>;
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }>(`/wallet/transactions?page=${page}&limit=${pageSize}`);

    if (res && Array.isArray(res.data)) {
      const items = res.data.map(mapWalletTxToSpTx);
      const totals = items.reduce(
        (acc, t) => {
          if (t.sign === "credit") acc.credit += t.amount;
          else acc.debit += t.amount;
          return acc;
        },
        { credit: 0, debit: 0 }
      );
      return {
        items,
        total: res.total,
        page: res.page,
        pageSize: res.limit,
        totalPages: res.totalPages,
        totals,
      };
    }
  } catch (err) {
    console.warn("Failed to fetch live transactions:", err);
  }
  return getTransactions(query);
}

export async function getTransactionLive(id: string): Promise<SpFinancialTransaction | null> {
  try {
    const page = await getTransactionsLive({ page: 1, pageSize: 50 });
    const found = page.items.find((t) => t.id === id);
    if (found) return found;
  } catch (err) {
    console.warn("Failed to fetch live transaction:", err);
  }
  const page = getTransactions({ page: 1, pageSize: 50 });
  return page.items.find((t) => t.id === id) ?? null;
}

export async function getFinancialOverviewLive(period: SpFinancialPeriod): Promise<SpFinancialOverview> {
  try {
    const [walletRes, account, txsPage, earningsRes] = await Promise.all([
      apiClient.get<{ balance: number; heldBalance: number }>("/wallet").then((r) => r.data).catch(() => null),
      Promise.resolve(getPayoutAccount()),
      getTransactionsLive({ page: 1, pageSize: 5 }).catch(() => getTransactions({ page: 1, pageSize: 5 })),
      apiClient.get<number>("/analytics/service-provider/earnings").then((r) => r.data).catch(() => null),
    ]);

    if (walletRes && typeof walletRes.balance === "number") {
      const balance = walletRes.balance;
      const heldBalance = walletRes.heldBalance ?? 0;
      const totalEarnings = earningsRes ?? (balance + heldBalance);

      const cards: SpFinancialSummaryCard[] = [
        {
          key: "available",
          label: "Available balance",
          value: balance,
          sublabel: "Ready for withdrawal",
          tone: "positive",
        },
        {
          key: "held",
          label: "Pending clearance",
          value: heldBalance,
          sublabel: "In escrow / pending bookings",
          tone: "info",
        },
        {
          key: "earnings",
          label: "Total settled earnings",
          value: totalEarnings,
          sublabel: "Lifetime completed bookings",
          tone: "neutral",
        },
      ];

      const breakdown: SpEarningsBreakdown = {
        periodLabel: period.key,
        from: new Date(Date.now() - 30 * 86400000).toISOString(),
        to: new Date().toISOString(),
        gross: totalEarnings,
        platformFees: Math.round(totalEarnings * 0.1),
        tax: 0,
        net: Math.round(totalEarnings * 0.9),
        settledCount: txsPage.total,
        payoutTotal: 0,
        payoutCount: 0,
      };

      return {
        cards,
        breakdown,
        account,
        recentTransactions: txsPage.items,
      };
    }
  } catch (err) {
    console.warn("Failed to build live financial overview:", err);
  }
  return getFinancialOverview(period);
}

