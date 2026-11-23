/** What the admin invite-credit screen reads from GET /admin/referrals and /admin/referrals/summary. */

export type ReferralStatus = "PENDING" | "HOLDING" | "REWARDED" | "REJECTED" | "EXPIRED";

export const REFERRAL_STATUS_TABS: { value: ReferralStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Waiting for a purchase" },
  { value: "HOLDING", label: "In the hold" },
  { value: "REWARDED", label: "Paid" },
  { value: "REJECTED", label: "Rejected" },
  { value: "EXPIRED", label: "Expired" },
];

export interface ReferralPerson {
  id: string;
  name: string;
  email: string;
}

export interface AdminReferral {
  id: string;
  code: string;
  status: ReferralStatus;
  reason: string | null;
  vertical: "MARKETPLACE" | "FREELANCE" | null;
  referrer: ReferralPerson;
  friend: ReferralPerson;
  /** Credit paid for this invite, both sides together. */
  credit: number;
  attachedAt: string;
  expiresAt: string;
  qualifiedAt: string | null;
  payAfter: string | null;
  rewardedAt: string | null;
}

export interface ReferralSummary {
  enabled: boolean;
  campusMonthlyBudget: number;
  counts: Record<ReferralStatus, number>;
  credit: { grantedThisMonth: number; grantedTotal: number; spentThisMonth: number; outstanding: number };
  rejectedBy: { reason: string; count: number }[];
  campuses: { campusId: string | null; name: string; granted: number }[];
  topReferrers: { id: string; name: string; email: string; invited: number; rewarded: number; rejected: number }[];
}

const REASON_TEXT: Record<string, string> = {
  SELF_DEALING: "The inviter was on the other side of the purchase",
  PURCHASE_REVERSED: "The purchase was refunded or cancelled during the hold",
  ACCOUNT_SUSPENDED: "One of the accounts was suspended",
  ACCOUNT_GONE: "One of the accounts was deleted",
  PHONE_NOT_VERIFIED: "The friend never verified their phone",
  CAP_REACHED: "A monthly cap or the campus budget was reached",
  NO_REWARD: "No reward was set for this kind of purchase",
};

/** A rejection reason in plain words; an unknown one is shown as it is rather than hidden. */
export const reasonText = (reason: string | null): string => (reason ? (REASON_TEXT[reason] ?? reason) : "");

/** Where an invite stands, for the status column. */
export function referralStatusText(r: Pick<AdminReferral, "status" | "vertical">): string {
  const kind = r.vertical === "FREELANCE" ? "freelance job" : "purchase";
  switch (r.status) {
    case "PENDING":
      return "Waiting for a first purchase";
    case "HOLDING":
      return `First ${kind} made, in the hold`;
    case "REWARDED":
      return `Paid after a ${kind}`;
    case "REJECTED":
      return "Rejected";
    case "EXPIRED":
      return "Ran out of time";
  }
}

/** Inviters with several rejected invites and few paid ones are the ones worth a look. */
export const looksSuspicious = (t: { rewarded: number; rejected: number }): boolean => t.rejected >= 3 && t.rejected > t.rewarded;
