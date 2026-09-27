import { apiClient, type ApiError } from "@/lib/api-client";

// ============================================================
// FINANCIAL IDENTITY — LIVE API
// ============================================================
// One user = one KYC + one financial profile + one wallet + one primary
// virtual account, shared by every role the user holds.
//   GET  /financial/status
//   POST /financial/onboarding          (idempotent)
//   POST /financial/virtual-account/retry

export type KycState = "KYC_NOT_STARTED" | "KYC_PENDING" | "KYC_VERIFIED" | "KYC_FAILED";
export type FinancialProfileState =
  | "FINANCIAL_PROFILE_NONE"
  | "FINANCIAL_PROFILE_PENDING"
  | "FINANCIAL_PROFILE_ACTIVE";
export type VirtualAccountState =
  | "VIRTUAL_ACCOUNT_NONE"
  | "VIRTUAL_ACCOUNT_PENDING"
  | "VIRTUAL_ACCOUNT_ACTIVE"
  | "VIRTUAL_ACCOUNT_FAILED";

export interface FinancialStatus {
  kyc: KycState;
  financialProfile: FinancialProfileState;
  virtualAccount: VirtualAccountState;
  maskedIdentifier: string | null;
  kycFailureReason: string | null;
  walletId: string | null;
  account: { accountNumber: string; accountName: string; bankName: string } | null;
}

export interface FinancialOnboardingInput {
  bvn: string;
  accountNumber: string;
  bankCode: string;
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

export const fetchFinancialStatus = () => unwrap(apiClient.get<FinancialStatus>("/financial/status"));

export const startFinancialOnboarding = (input: FinancialOnboardingInput) =>
  unwrap(apiClient.post<FinancialOnboardingInput, FinancialStatus>("/financial/onboarding", input));

export const retryVirtualAccount = () =>
  unwrap(apiClient.post<undefined, FinancialStatus>("/financial/virtual-account/retry"));
