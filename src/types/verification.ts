// ============================================================
// ACCOUNT VERIFICATION
// ============================================================

/** What the platform says about an account's verification. */
export type KycStatus =
  | "unverified"
  | "pending_review"
  | "verified"
  | "rejected"
  | "suspended";
