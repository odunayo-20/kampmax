import { apiClient } from "@/lib/api-client";

// A service provider is approved by a Kampmax admin. There is nothing to
// upload or submit: this only reports what the platform says, and a
// provider's services appear publicly once they are verified.

export type SpApproval = "pending" | "verified" | "suspended" | "deactivated";

const APPROVALS: Record<string, SpApproval> = {
  PENDING: "pending",
  VERIFIED: "verified",
  SUSPENDED: "suspended",
  DEACTIVATED: "deactivated",
};

/** The provider's real approval status. Failures throw; there is no demo fallback. */
export async function fetchSpApproval(): Promise<SpApproval> {
  const { data, error } = await apiClient.get<{ verificationStatus: string }>(
    "/service-provider/profile/me"
  );
  if (error || !data) throw new Error(error?.message || "Could not load your verification status.");
  return APPROVALS[data.verificationStatus] ?? "pending";
}
