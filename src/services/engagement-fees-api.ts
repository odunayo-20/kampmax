import { apiClient, type ApiError } from "@/lib/api-client";
import type { FeeTerms } from "@/lib/service-fee";

// ============================================================
// SERVICE FEES — LIVE API LAYER
// ============================================================
//   GET /engagements/fee-terms   what a new contract would charge the freelancer
//   GET /admin/engagements/fees  fees collected on contracts (admin, financial read)
//
// The backend decides and takes every fee. This layer only reads.

/** One fee the platform collected, as the ledger recorded it. */
export interface FeeCollected {
  id: string;
  fee: number;
  /** What the freelancer was paid, before the fee. */
  paid: number;
  collectedAt: string;
  engagementId: string;
  milestonePosition: number;
  jobTitle: string | null;
}

export interface ContractFeeReport {
  current: FeeTerms;
  totalCollected: number;
  payments: number;
  thisMonth: number;
  recent: FeeCollected[];
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

export const fetchFeeTerms = () => unwrap(apiClient.get<FeeTerms>("/engagements/fee-terms"));

export const fetchContractFeeReport = () =>
  unwrap(apiClient.get<ContractFeeReport>("/admin/engagements/fees"));
