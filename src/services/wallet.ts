import {
  Wallet,
  WalletTransaction,
  WalletTransactionType,
  WalletTransactionStatus,
  WalletTransactionDirection,
} from "@/types";
import {
  wallets as mockWallets,
  walletTransactions as mockTransactions,
  getWalletByUser as _getWalletByUser,
  getWalletTransactions as _getWalletTransactions,
} from "@/data/wallet";
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
  status: "PENDING" | "COMPLETED" | "FAILED" | "REVERSED";
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

export interface BackendPaginatedWalletTransactions {
  data: BackendWalletTransactionResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
      return "deposit";
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
  const status: WalletTransactionStatus =
    statusLower === "completed"
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
// ASYNC API CLIENT METHODS
// ============================================================

/**
 * Fetch authenticated user's wallet with balances.
 * GET /api/v1/wallet
 */
export async function fetchWallet(): Promise<{ data: Wallet | null; error: ApiError | null }> {
  const { data, error } = await apiClient.get<BackendWalletResponse>("/wallet");

  if (error || !data || !data.id) {
    const fallback = mockWallets[0];
    return { data: cachedWallet || fallback || null, error };
  }

  const mapped = mapBackendWalletToFrontend(data, cachedTransactions);
  cachedWallet = mapped;
  return { data: mapped, error: null };
}

/**
 * Fetch paginated wallet transactions.
 * GET /api/v1/wallet/transactions
 */
export async function fetchWalletTransactions(params: {
  page?: number;
  limit?: number;
} = {}): Promise<{
  data: WalletTransaction[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  error: ApiError | null;
}> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));

  const queryString = searchParams.toString();
  const path = `/wallet/transactions${queryString ? `?${queryString}` : ""}`;

  const { data, error } = await apiClient.get<BackendPaginatedWalletTransactions>(path);

  if (error || !data || !Array.isArray(data.data)) {
    return {
      data: cachedTransactions,
      total: cachedTransactions.length,
      page: 1,
      limit: params.limit || 20,
      totalPages: 1,
      error,
    };
  }

  const mapped = data.data.map(mapBackendWalletTransactionToFrontend);
  cachedTransactions = mapped;
  if (cachedWallet) {
    cachedWallet.transactions = mapped;
  }

  return {
    data: mapped,
    total: data.total,
    page: data.page,
    limit: data.limit,
    totalPages: data.totalPages,
    error: null,
  };
}

/**
 * Request a withdrawal from wallet to bank account.
 * POST /api/v1/wallet/withdraw
 */
export async function withdrawFromWalletApi(
  payload: WithdrawPayload
): Promise<{ data: WalletTransaction | null; error: ApiError | null }> {
  const { data, error } = await apiClient.post<WithdrawPayload, BackendWalletTransactionResponse>(
    "/wallet/withdraw",
    payload
  );

  if (error || !data || !data.id) {
    return { data: null, error };
  }

  const mapped = mapBackendWalletTransactionToFrontend(data);
  cachedTransactions.unshift(mapped);
  if (cachedWallet) {
    cachedWallet.balance = Math.max(0, cachedWallet.balance - mapped.amount);
    cachedWallet.pendingAmount += mapped.amount;
  }

  return { data: mapped, error: null };
}

export const requestWalletWithdrawal = withdrawFromWalletApi;

/**
 * Synchronous mock deposit helper for UI components.
 */
export function depositToWallet(
  userId: string,
  amount: number,
  description?: string
): WalletTransaction {
  const wallet = getWallet(userId);
  if (wallet) {
    wallet.balance += amount;
  }
  const tx: WalletTransaction = {
    id: `wt_dep_${Date.now()}`,
    walletId: wallet?.id || "w1",
    type: "deposit",
    direction: "credit",
    amount,
    status: "completed",
    description: description || "Wallet top-up",
    reference: `DEP-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };
  cachedTransactions.unshift(tx);
  return tx;
}

/**
 * Synchronous mock withdrawal helper for UI components.
 */
export function withdrawFromWallet(
  userId: string,
  amount: number,
  bankName?: string,
  bankAccount?: string
): WalletTransaction | null {
  const wallet = getWallet(userId);
  if (wallet) {
    wallet.balance = Math.max(0, wallet.balance - amount);
    wallet.pendingAmount += amount;
  }
  const tx: WalletTransaction = {
    id: `wt_wth_${Date.now()}`,
    walletId: wallet?.id || "w1",
    type: "withdrawal",
    direction: "debit",
    amount,
    status: "processing",
    description: `Withdrawal to ${bankName || "Bank"} (${bankAccount || "Account"})`,
    reference: `WTH-${Date.now()}`,
    createdAt: new Date().toISOString(),
    bankName,
    bankAccount,
  };
  cachedTransactions.unshift(tx);
  return tx;
}

/**
 * Synchronous mock payment helper for UI components.
 */
export function payFromWallet(
  userId: string,
  amount: number,
  description?: string,
  orderId?: string
): WalletTransaction | null {
  const wallet = getWallet(userId);
  if (wallet) {
    if (wallet.balance < amount) return null;
    wallet.balance = Math.max(0, wallet.balance - amount);
  }
  const tx: WalletTransaction = {
    id: `wt_pay_${Date.now()}`,
    walletId: wallet?.id || "w1",
    type: "purchase",
    direction: "debit",
    amount,
    status: "completed",
    description: description || "Payment from wallet",
    reference: `PAY-${Date.now()}`,
    orderId,
    createdAt: new Date().toISOString(),
  };
  cachedTransactions.unshift(tx);
  return tx;
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

export function getWalletBalance(userId: string): number {
  const wallet = getWallet(userId);
  return wallet?.balance ?? 0;
}

export function getPendingAmount(userId: string): number {
  const wallet = getWallet(userId);
  return wallet?.pendingAmount ?? 0;
}

export function getWalletTransactions(walletId: string): WalletTransaction[] {
  const list = cachedTransactions.length > 0 ? cachedTransactions : mockTransactions;
  return list
    .filter((t) => t.walletId === walletId)
    .sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getTransactionById(txId: string): WalletTransaction | undefined {
  return cachedTransactions.find((t) => t.id === txId) || mockTransactions.find((t) => t.id === txId);
}

export function getTransactionsByType(
  walletId: string,
  type: WalletTransactionType
): WalletTransaction[] {
  return getWalletTransactions(walletId).filter((t) => t.type === type);
}

export function getTransactionsByStatus(
  walletId: string,
  status: WalletTransactionStatus
): WalletTransaction[] {
  return getWalletTransactions(walletId).filter((t) => t.status === status);
}

export function getCreditedTotal(walletId: string): number {
  return getWalletTransactions(walletId)
    .filter((t) => t.direction === "credit" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
}

export function getDebitedTotal(walletId: string): number {
  return getWalletTransactions(walletId)
    .filter((t) => t.direction === "debit" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
}
