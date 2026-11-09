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
