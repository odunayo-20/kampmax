import { Wallet, WalletTransaction, WalletTransactionType, WalletTransactionStatus } from "@/types";
import { walletTransactions as mockTransactions, getWalletByUser as _getWalletByUser } from "@/data/wallet";
import { apiClient, ApiError } from "@/lib/api-client";

// ============================================================
// BACKEND RESPONSE & DTO TYPES (from NestJS Wallets Module)
// ============================================================

export interface BackendWalletResponse {
  id: string;
  ownerType: "USER" | "VENDOR" | "PLATFORM";
  userId: string | null;
  vendorId: string | null;
  currency: string;
  balance: number;
  heldBalance: number;
  status: "ACTIVE" | "FROZEN" | "SUSPENDED" | "CLOSED";
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface BackendWalletTransactionResponse {
  id: string;
  walletId: string;
  type: string;
  direction: "CREDIT" | "DEBIT";
  status: "PENDING" | "SUCCESS" | "FAILED" | "REVERSED";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reference: string;
  description: string;
  metadata: Record<string, unknown> | null;
  relatedOrderId: string | null;
  relatedPaymentId: string | null;
  performedBy: string | null;
  reversalOfId: string | null;
  createdAt: string | Date;
}

/** GET /wallet/transactions: the backend's standard { items, meta } page. */
export interface BackendPaginatedWalletTransactions {
  items: BackendWalletTransactionResponse[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface WithdrawPayload {
  amount: number;
  note?: string;
  destination: {
    bankCode: string;
    accountNumber: string;
    accountName: string;
  };
}

let cachedWallet: Wallet | null = null;
let cachedTransactions: WalletTransaction[] = [...mockTransactions];

/**
 * Maps backend transaction type to frontend WalletTransactionType union.
 */
export function mapBackendTxTypeToFrontend(type: string): WalletTransactionType {
  const upper = type.toUpperCase();
  switch (upper) {
    case "DEPOSIT":
    case "CREDIT": // top-ups and other inbound credits
      return "deposit";
    case "DEBIT":
      return "purchase";
    case "SETTLEMENT":
      return "vendor_payout";
    case "WITHDRAWAL":
    case "PAYOUT":
      return "withdrawal";
    case "PAYMENT":
    case "ORDER_PAYMENT":
      return "payment";
    case "REFUND":
      return "refund";
    case "EARNINGS":
    case "VENDOR_EARNINGS":
      return "payment";
    case "TRANSFER":
      return "transfer";
    case "FEE":
    case "PLATFORM_FEE":
    case "COMMISSION":
      return "payment";
    default:
      return "payment";
  }
}

/**
 * Maps backend wallet transaction response to frontend WalletTransaction.
 */
export function mapBackendWalletTransactionToFrontend(
  raw: BackendWalletTransactionResponse
): WalletTransaction {
  const statusLower = raw.status.toLowerCase();
  // The ledger's states are PENDING / SUCCESS / FAILED / REVERSED.
  const status: WalletTransactionStatus =
    statusLower === "success" || statusLower === "completed"
      ? "completed"
      : statusLower === "pending"
      ? "pending"
      : statusLower === "processing"
      ? "processing"
      : statusLower === "reversed"
      ? "cancelled" // "reversed" maps to nearest frontend equivalent
      : "failed";

  return {
    id: raw.id,
    walletId: raw.walletId,
    type: mapBackendTxTypeToFrontend(raw.type),
    direction: raw.direction === "CREDIT" ? "credit" : "debit",
    amount: Number(raw.amount || 0),
    status,
    description: raw.description || "Wallet transaction",
    reference: raw.reference || undefined,
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    orderId: raw.relatedOrderId || undefined,
  };
}

/**
 * Maps backend wallet response to frontend Wallet model.
 */
export function mapBackendWalletToFrontend(
  raw: BackendWalletResponse,
  transactions: WalletTransaction[] = []
): Wallet {
  return {
    id: raw.id,
    userId: raw.userId || "",
    balance: Number(raw.balance || 0),
    pendingAmount: Number(raw.heldBalance || 0),
    currency: raw.currency || "NGN",
    isActive: raw.status === "ACTIVE",
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date(raw.createdAt).toISOString(),
    transactions,
  };
}

// ============================================================
// SYNCHRONOUS FALLBACK GETTERS
// ============================================================

export function getWallet(userId: string): Wallet | undefined {
  if (cachedWallet && (!cachedWallet.userId || cachedWallet.userId === userId)) {
    return cachedWallet;
  }
  return _getWalletByUser(userId);
}

export const getWalletByUser = getWallet;

export function getWalletTransactions(walletId: string): WalletTransaction[] {
  const list = cachedTransactions.length > 0 ? cachedTransactions : mockTransactions;
  return list
    .filter((t) => t.walletId === walletId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

// ============================================================
// REAL WALLET BALANCE + TOP-UP (never falls back to mock data)
// ============================================================

export interface WalletTopup {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: "PENDING" | "SUCCESS" | "FAILED";
  paidAt: string | null;
  createdAt: string;
  authorizationUrl?: string;
}

function toFailure(error: ApiError | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

/**
 * The signed-in user's real wallet (the backend creates it on first access).
 * Unlike fetchWallet it never falls back to bundled demo data: failures throw.
 */
export async function fetchMyWallet(): Promise<Wallet> {
  const { data, error } = await apiClient.get<BackendWalletResponse>("/wallet");
  if (error || !data || !data.id) throw toFailure(error, "Could not load your wallet.");
  return mapBackendWalletToFrontend(data);
}

/** The signed-in user's real wallet transactions, newest first; throws on failure. */
export async function fetchMyWalletTransactions(
  params: { page?: number; limit?: number } = {},
): Promise<WalletTransaction[]> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set("page", String(params.page));
  if (params.limit) searchParams.set("limit", String(params.limit));
  const qs = searchParams.toString();
  const { data, error } = await apiClient.get<BackendPaginatedWalletTransactions>(
    `/wallet/transactions${qs ? `?${qs}` : ""}`,
  );
  if (error || !data || !Array.isArray(data.items)) {
    throw toFailure(error, "Could not load your transactions.");
  }
  return data.items.map(mapBackendWalletTransactionToFrontend);
}

/** The signed-in user's real wallet balance; throws instead of showing a fake one. */
export async function fetchMyWalletBalance(): Promise<{ balance: number; currency: string }> {
  const { data, error } = await apiClient.get<BackendWalletResponse>("/wallet");
  if (error || !data) throw toFailure(error, "Could not load your wallet.");
  return { balance: Number(data.balance || 0), currency: data.currency || "NGN" };
}

/** Starts a Paystack charge; the caller redirects to `authorizationUrl`. */
export async function startWalletTopup(amount: number, callbackUrl: string): Promise<WalletTopup> {
  const { data, error } = await apiClient.post<{ amount: number; callbackUrl: string }, WalletTopup>(
    "/wallet/topups",
    { amount, callbackUrl },
  );
  if (error || !data) throw toFailure(error, "Could not start the payment.");
  return data;
}

/** Confirms a returned charge with the gateway; the wallet is credited once, server-side. */
export async function verifyWalletTopup(reference: string): Promise<WalletTopup> {
  const { data, error } = await apiClient.get<WalletTopup>(
    `/wallet/topups/${encodeURIComponent(reference)}`,
  );
  if (error || !data) throw toFailure(error, "Could not confirm the payment.");
  return data;
}

/** Development-only credit; the backend answers 404 unless explicitly enabled. */
export async function devCreditWallet(amount: number): Promise<void> {
  const { error } = await apiClient.post<{ amount: number }, BackendWalletResponse>(
    "/wallet/dev-credit",
    { amount },
  );
  if (error) throw toFailure(error, "Development credit is not available.");
}

/**
 * Asks to withdraw to a bank account. The amount leaves the wallet at once and
 * is paid out by Kampmax; the returned entry is PENDING until then. Throws a
 * user-facing message on failure.
 */
export async function submitWithdrawal(payload: WithdrawPayload): Promise<WalletTransaction> {
  const { data, error } = await apiClient.post<WithdrawPayload, BackendWalletTransactionResponse>(
    "/wallet/withdraw",
    payload,
  );
  if (error || !data || !data.id) throw toFailure(error, "Could not request your withdrawal.");
  return mapBackendWalletTransactionToFrontend(data);
}
