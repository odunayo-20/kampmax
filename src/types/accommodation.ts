// What an admin sees of Kampmax Accommodation (/accommodation/admin/*):
// agent applications and the listings waiting for moderation.

// ---------- agents ----------

export type AccommodationAgentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED"
  | "REVOKED";

export const AGENT_STATUS_LABELS: Record<AccommodationAgentStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  SUSPENDED: "Suspended",
  REVOKED: "Revoked",
};

export type AgentDocumentType =
  | "IDENTITY"
  | "OWNERSHIP_PROOF"
  | "AUTHORIZATION_LETTER"
  | "BUSINESS_REGISTRATION"
  | "OTHER";

export const AGENT_DOCUMENT_TYPE_LABELS: Record<AgentDocumentType, string> = {
  IDENTITY: "Identity",
  OWNERSHIP_PROOF: "Proof of ownership",
  AUTHORIZATION_LETTER: "Letter of authorization",
  BUSINESS_REGISTRATION: "Business registration",
  OTHER: "Other",
};

export type AgentDocumentStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface AgentDocument {
  id: string;
  documentType: AgentDocumentType;
  originalFilename: string | null;
  status: AgentDocumentStatus;
  rejectionReason: string | null;
  createdAt: string;
}

export interface AdminAgentListItem {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  phone: string;
  agencyName: string | null;
  operatingLocation: string;
  status: AccommodationAgentStatus;
  createdAt: string;
}

export interface AdminAgentDetail {
  id: string;
  userId: string;
  status: AccommodationAgentStatus;
  fullName: string;
  phone: string;
  email: string;
  photoUrl: string | null;
  operatingLocation: string;
  agencyName: string | null;
  businessAddress: string | null;
  /** What the team last asked the applicant for. */
  infoRequest: string | null;
  rejectionReason: string | null;
  suspensionReason: string | null;
  approvedAt: string | null;
  createdAt: string;
  documents: AgentDocument[];
}

/** A file fetched with the admin's sign-in, ready to show from an object URL. */
export interface AgentDocumentFile {
  blob: Blob;
  filename: string | null;
}

/** An agent needs these on file (not rejected) before they can be approved. */
export const AUTHORITY_DOCUMENT_TYPES: AgentDocumentType[] = [
  "OWNERSHIP_PROOF",
  "AUTHORIZATION_LETTER",
];

/** What is still missing before an application can be approved, in plain words. */
export function missingForApproval(documents: AgentDocument[]): string[] {
  const usable = documents.filter((d) => d.status !== "REJECTED");
  const missing: string[] = [];
  if (!usable.some((d) => d.documentType === "IDENTITY")) {
    missing.push("an identity document");
  }
  if (!usable.some((d) => AUTHORITY_DOCUMENT_TYPES.includes(d.documentType))) {
    missing.push("proof of ownership or a letter of authorization");
  }
  return missing;
}

// ---------- listings ----------

export type ListingModerationStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "REJECTED"
  | "ADMIN_SUSPENDED";

export const LISTING_MODERATION_LABELS: Record<ListingModerationStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Waiting for review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  ADMIN_SUSPENDED: "Suspended",
};

export type ListingPublicationStatus = "UNPUBLISHED" | "ACTIVE" | "EXPIRED" | "HIDDEN";

export const LISTING_PUBLICATION_LABELS: Record<ListingPublicationStatus, string> = {
  UNPUBLISHED: "Not published",
  ACTIVE: "Live",
  EXPIRED: "Expired",
  HIDDEN: "Hidden",
};

export interface AdminListingItem {
  id: string;
  title: string;
  agentId: string;
  agentName: string | null;
  moderationStatus: ListingModerationStatus;
  publicationStatus: ListingPublicationStatus;
  availabilityStatus: string;
  submittedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export interface AdminListingDetail {
  id: string;
  title: string;
  description: string | null;
  propertyId: string;
  unitId: string;
  rentAmount: number;
  currency: string;
  paymentFrequency: string;
  cautionFee: number;
  agencyFee: number;
  agreementFee: number;
  otherCharges: number;
  totalUpfrontCost: number;
  moderationStatus: ListingModerationStatus;
  publicationStatus: ListingPublicationStatus;
  availabilityStatus: string;
  rejectionReason: string | null;
  submittedAt: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  lastAvailabilityConfirmedAt: string | null;
  unit: { id: string; unitName: string; unitType: string } | null;
  property: { id: string; title: string; city: string; state: string } | null;
  media: { id: string; mediaId: string; url: string; caption: string | null }[];
  amenities: { id: string; name: string }[];
  subscription: {
    id: string;
    status: string;
    amount: number;
    autoRenew: boolean;
    endsAt: string | null;
  } | null;
  agentId: string;
  agent: { id: string; name: string; fullName: string; status: AccommodationAgentStatus } | null;
  /** Private to the team: the public never sees the street address. */
  location: {
    address: string | null;
    neighbourhood: string | null;
    landmark: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  createdAt: string;
  updatedAt: string;
}

// ---------- payments ----------

export type ListingPaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUND_PENDING" | "REFUNDED";

export const PAYMENT_STATUS_LABELS: Record<ListingPaymentStatus, string> = {
  PENDING: "Waiting",
  SUCCESS: "Paid",
  FAILED: "Failed",
  REFUND_PENDING: "Needs refund",
  REFUNDED: "Refunded",
};

export const PAYMENT_TYPE_LABELS: Record<string, string> = {
  INITIAL: "First payment",
  RENEWAL: "Automatic renewal",
  RECOVERY: "Manual renewal",
};

export interface AdminPayment {
  id: string;
  subscriptionId: string;
  listingId: string;
  agentId: string;
  agentName: string | null;
  listingTitle: string | null;
  reference: string;
  /** The payment gateway's own reference, for support and reconciliation. */
  gatewayReference: string | null;
  amount: number;
  currency: string;
  paymentType: string;
  billingCycle: number;
  status: ListingPaymentStatus;
  paidAt: string | null;
  failureReason: string | null;
  refundReason: string | null;
  refundedAt: string | null;
  createdAt: string;
}

/** Where money or renewals might be stuck. The sweeps fix most of it by themselves. */
export interface PaymentReconciliation {
  generatedAt: string;
  payments: {
    pendingOverTenMinutes: number;
    oldestPendingSince: string | null;
    refundsOwed: { count: number; amount: number };
  };
  subscriptions: {
    renewalsStuckOverAnHour: number;
    renewalsOverdueOverAnHour: number;
    pastDue: number;
  };
}

/** A file the browser can offer for saving. */
export type DownloadedFile = AgentDocumentFile;

/** Nothing was charged for these, so there is nothing to send back. */
export function isRefundable(p: Pick<AdminPayment, "amount" | "gatewayReference">): boolean {
  return p.amount > 0 && Boolean(p.gatewayReference) && p.gatewayReference !== "FREE";
}

// ---------- reports ----------

export type ReportReason = "FRAUD" | "FAKE_LISTING" | "UNAVAILABLE" | "INCORRECT_INFO" | "DUPLICATE" | "OTHER";

export const REPORT_REASON_LABELS: Record<ReportReason, string> = {
  FRAUD: "Fraud or scam",
  FAKE_LISTING: "Fake listing",
  UNAVAILABLE: "No longer available",
  INCORRECT_INFO: "Wrong information",
  DUPLICATE: "Duplicate listing",
  OTHER: "Something else",
};

export type ReportStatus = "OPEN" | "RESOLVED" | "DISMISSED";

export const REPORT_STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: "Open",
  RESOLVED: "Resolved",
  DISMISSED: "Dismissed",
};

export interface AdminReport {
  id: string;
  listingId: string;
  listingTitle: string | null;
  listingModerationStatus: ListingModerationStatus | null;
  agentId: string | null;
  agentName: string | null;
  reason: ReportReason;
  description: string | null;
  status: ReportStatus;
  /** How many open reports this listing has: a pile-up is a signal. */
  openReportsOnListing: number;
  reporterId: string;
  /** First name and last initial only. */
  reporterName: string | null;
  reviewedAt: string | null;
  resolution: string | null;
  createdAt: string;
}

export interface ResolveReportInput {
  decision: "RESOLVED" | "DISMISSED";
  /** What was found and done; the backend wants 5 to 500 characters. */
  resolution: string;
  /** Also take the listing down. Only meaningful for an approved listing. */
  suspendListing?: boolean;
}

export const RESOLUTION_MIN = 5;
export const RESOLUTION_MAX = 500;

/** Only an approved listing is on the site, so only that can be taken down. */
export function canSuspendFromReport(report: Pick<AdminReport, "listingModerationStatus">): boolean {
  return report.listingModerationStatus === "APPROVED";
}

// ---------- subscriptions (read-only) ----------

export type SubscriptionStatus =
  | "PENDING"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "EXPIRED"
  | "CANCELLED";

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  PENDING: "Waiting for approval",
  ACTIVE: "Active",
  PAST_DUE: "Past due",
  SUSPENDED: "Suspended",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export interface AdminSubscription {
  id: string;
  listingId: string;
  listingTitle: string | null;
  agentId: string;
  agentName: string | null;
  status: SubscriptionStatus;
  amount: number;
  currency: string;
  durationDays: number;
  startsAt: string | null;
  endsAt: string | null;
  nextBillingAt: string | null;
  autoRenew: boolean;
  billingCycle: number;
  cancelledAt: string | null;
  lastPaymentAt: string | null;
  lastFailureAt: string | null;
  /** Failed renewal charges since the last success; the third suspends the listing. */
  retryCount: number;
  nextRetryAt: string | null;
  createdAt: string;
}

// ---------- overview dashboard ----------

export interface AdminDashboard {
  range: { from: string; to: string };
  agents: { total: number; pending: number; verified: number; suspended: number; newInRange: number };
  properties: number;
  listings: { total: number; active: number; pendingApproval: number; expired: number; suspended: number };
  subscriptions: {
    active: number;
    pastDue: number;
    suspended: number;
    monthlyRecurringRevenue: number;
    averageRevenuePerActiveListing: number | null;
    /** A percentage (12.5 means 12.5%), or null when nothing has started. */
    cancellationRate: number | null;
  };
  payments: {
    revenueInRange: number;
    paidInRange: number;
    failedInRange: number;
    failedPaymentRate: number | null;
    renewalSuccessRate: number | null;
    refundsPending: { count: number; amount: number };
    revenueByMonth: { month: string; revenue: number }[];
  };
  enquiries: { inRange: number; answered: number; averageResponseHours: number | null };
  inspections: {
    requestedInRange: number;
    completedInRange: number;
    enquiryToInspectionRate: number | null;
    completionRate: number | null;
  };
  reports: { open: number; newInRange: number };
}

export interface DashboardRange {
  /** yyyy-mm-dd */
  from?: string;
  /** yyyy-mm-dd, included */
  to?: string;
}

// ---------- settings and packages (Super Admin edits) ----------

export interface AccommodationPackage {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  durationDays: number;
  isActive: boolean;
}

export interface UpdatePackageInput {
  price?: number;
  durationDays?: number;
  isActive?: boolean;
}

export interface AccommodationSettings {
  availabilityIntervalDays: number;
  availabilityGraceDays: number;
}

/** A property type or a facility. The slug is fixed at creation so saved links keep working. */
export interface TaxonomyItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  /** How many properties (types) or listings (facilities) use it. */
  usage: number;
}

export type TaxonomyKind = "categories" | "amenities";

export interface TaxonomyInput {
  name: string;
  description?: string;
}

export interface TaxonomyUpdate {
  name?: string;
  description?: string;
  isActive?: boolean;
}
