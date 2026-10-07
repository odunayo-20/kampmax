import { apiClient, type ApiError } from "@/lib/api-client";

// The user's real loyalty account (GET /loyalty). Failures throw; there is no
// bundled demo balance.

export interface LoyaltyAccount {
  pointsBalance: number;
  lifetimeEarned: number;
  /** Naira value of one point when redeeming. */
  nairaPerPoint: number;
}

interface BackendLoyaltyAccount {
  pointsBalance: number;
  lifetimeEarned: number;
  rule: { nairaPerPoint: number };
}

function failure(error: ApiError | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function fetchLoyaltyAccount(): Promise<LoyaltyAccount> {
  const { data, error } = await apiClient.get<BackendLoyaltyAccount>("/loyalty");
  if (error || !data) throw failure(error, "Could not load your points.");
  return {
    pointsBalance: Number(data.pointsBalance ?? 0),
    lifetimeEarned: Number(data.lifetimeEarned ?? 0),
    nairaPerPoint: Number(data.rule?.nairaPerPoint ?? 0),
  };
}
