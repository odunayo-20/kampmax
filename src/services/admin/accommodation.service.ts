// ============================================================
// ACCOMMODATION ADMIN SERVICE CONTRACT
// ============================================================
//
// What the team does with accommodation agents and listings: review
// applications and their private documents, and moderate listings.
// Every decision is recorded and the agent is told by the backend.
// The live implementation is accommodation.api.ts.
// ============================================================

import type { Paginated } from "@/types/admin";
import type {
  AccommodationAgentStatus,
  AccommodationPackage,
  AccommodationSettings,
  AdminAgentDetail,
  AdminDashboard,
  AdminSubscription,
  DashboardRange,
  SubscriptionStatus,
  TaxonomyInput,
  TaxonomyItem,
  TaxonomyKind,
  TaxonomyUpdate,
  UpdatePackageInput,
  AdminAgentListItem,
  AdminListingDetail,
  AdminListingItem,
  AdminPayment,
  AgentDocumentFile,
  DownloadedFile,
  ListingPaymentStatus,
  ListingModerationStatus,
  AdminReport,
  PaymentReconciliation,
  ReportStatus,
  ResolveReportInput,
} from "@/types/accommodation";

export interface AgentsQuery {
  status?: AccommodationAgentStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface AgentsPage extends Paginated<AdminAgentListItem> {
  /** Across every agent, whatever the filters. */
  counts: Record<"pending" | "approved" | "rejected" | "suspended" | "revoked", number>;
}

export interface ListingsQuery {
  /** The backend shows listings waiting for review when this is left out. */
  status?: ListingModerationStatus;
  page?: number;
  pageSize?: number;
}

export interface ListingsPage extends Paginated<AdminListingItem> {
  /** Listings per moderation status, across all pages. */
  counts: Partial<Record<ListingModerationStatus, number>>;
}

export interface PaymentsQuery {
  status?: ListingPaymentStatus;
  page?: number;
  pageSize?: number;
}

export interface PaymentsPage extends Paginated<AdminPayment> {
  /** Payments per status, across all pages and whatever the filter. */
  counts: Partial<Record<ListingPaymentStatus, number>>;
}

/** Calendar days (YYYY-MM-DD) for the CSV export. The end day is included. */
export interface ExportRange {
  from?: string;
  to?: string;
}

export interface ReportsQuery {
  /** The backend shows open reports when this is left out. */
  status?: ReportStatus;
  page?: number;
  pageSize?: number;
}

export interface ReportsPage extends Paginated<AdminReport> {
  /** Reports per status, across all pages. */
  counts: Partial<Record<ReportStatus, number>>;
}

export interface AdminAccommodationService {
  // ---- agents ----
  /** GET /accommodation/admin/agents */
  listAgents(query?: AgentsQuery): Promise<AgentsPage>;
  /** GET /accommodation/admin/agents/:id */
  getAgent(id: string): Promise<AdminAgentDetail>;
  /** GET /accommodation/admin/agents/:id/listings */
  agentListings(id: string, page?: number, pageSize?: number): Promise<Paginated<AdminListingItem>>;
  /** PATCH …/approve: needs an identity document and proof of ownership or authorization. */
  approveAgent(id: string): Promise<AdminAgentDetail>;
  /** PATCH …/reject */
  rejectAgent(id: string, reason: string): Promise<AdminAgentDetail>;
  /** PATCH …/request-info: asks the applicant for more documents. */
  requestAgentInfo(id: string, message: string): Promise<AdminAgentDetail>;
  /** PATCH …/suspend */
  suspendAgent(id: string, reason: string): Promise<AdminAgentDetail>;
  /** PATCH …/restore */
  restoreAgent(id: string): Promise<AdminAgentDetail>;
  /** PATCH …/revoke */
  revokeAgent(id: string, reason: string): Promise<AdminAgentDetail>;
  /** PATCH …/documents/:documentId; a rejection needs a reason. */
  reviewAgentDocument(
    agentId: string,
    documentId: string,
    decision: "ACCEPTED" | "REJECTED",
    reason?: string
  ): Promise<AdminAgentDetail>;
  /** GET …/documents/:documentId/file: private; each view is audited by the backend. */
  openAgentDocument(agentId: string, documentId: string): Promise<AgentDocumentFile>;

  // ---- listings ----
  /** GET /accommodation/admin/listings */
  listListings(query?: ListingsQuery): Promise<ListingsPage>;
  /** GET /accommodation/admin/listings/:id */
  getListing(id: string): Promise<AdminListingDetail>;
  /** PATCH …/approve: on a first approval the paid period starts now. */
  approveListing(id: string): Promise<AdminListingDetail>;
  /** PATCH …/reject: a rejected first submission has its payment marked for refund. */
  rejectListing(id: string, reason: string): Promise<AdminListingDetail>;
  /** PATCH …/suspend */
  suspendListing(id: string, reason: string): Promise<AdminListingDetail>;
  /** PATCH …/restore */
  restoreListing(id: string): Promise<AdminListingDetail>;

  // ---- payments ----
  /** GET /accommodation/admin/payments */
  listPayments(query?: PaymentsQuery): Promise<PaymentsPage>;
  /** PATCH …/payments/:id/flag-refund: marks a paid payment as owed back and stops its renewal. */
  flagPaymentForRefund(id: string, reason: string): Promise<void>;
  /** POST …/payments/:id/refund: sends the refund to the payment gateway; can be retried if it refuses. */
  refundPayment(id: string): Promise<void>;
  /** GET …/payments/reconciliation */
  paymentReconciliation(): Promise<PaymentReconciliation>;
  /** GET …/payments/export: CSV of payments created in the range (default: last 30 days). */
  exportPayments(range?: ExportRange): Promise<DownloadedFile>;

  // ---- reports ----
  /** GET /accommodation/admin/reports */
  listReports(query?: ReportsQuery): Promise<ReportsPage>;
  /**
   * PATCH …/reports/:id/resolve: closes the report with a note and tells the reporter.
   * `listingSuspended` is false when the listing was not on the site to take down.
   */
  resolveReport(id: string, input: ResolveReportInput): Promise<{ listingSuspended: boolean }>;

  // ---- subscriptions (read-only) ----
  /** GET /accommodation/admin/subscriptions */
  listSubscriptions(query?: SubscriptionsQuery): Promise<SubscriptionsPage>;
  /** GET …/subscriptions/:id/payments: every charge, oldest first. */
  subscriptionPayments(id: string): Promise<AdminPayment[]>;

  // ---- overview ----
  /** GET /accommodation/admin/dashboard (default: last 30 days) */
  dashboard(range?: DashboardRange): Promise<AdminDashboard>;

  // ---- settings and packages (changes need accommodation.configure: Super Admin) ----
  /** GET /accommodation/admin/packages: includes turned-off packages. */
  listPackages(): Promise<AccommodationPackage[]>;
  /** PATCH …/packages/:id: new price applies to new subscriptions only; running ones keep the price they were sold at. */
  updatePackage(id: string, input: UpdatePackageInput): Promise<AccommodationPackage>;
  /** GET /accommodation/admin/settings */
  getSettings(): Promise<AccommodationSettings>;
  /** PATCH …/settings */
  updateSettings(input: Partial<AccommodationSettings>): Promise<AccommodationSettings>;
  /** GET …/categories or …/amenities: turned-off ones included, with usage counts. */
  listTaxonomy(kind: TaxonomyKind): Promise<TaxonomyItem[]>;
  /** POST …/categories or …/amenities */
  createTaxonomy(kind: TaxonomyKind, input: TaxonomyInput): Promise<TaxonomyItem>;
  /** PATCH …/categories/:id or …/amenities/:id: renaming never changes the slug. */
  updateTaxonomy(kind: TaxonomyKind, id: string, input: TaxonomyUpdate): Promise<TaxonomyItem>;
}

export interface SubscriptionsQuery {
  status?: SubscriptionStatus;
  page?: number;
  pageSize?: number;
}

export type SubscriptionsPage = Paginated<AdminSubscription> & {
  /** How many subscriptions sit in each status, whatever the filter. */
  counts: Partial<Record<SubscriptionStatus, number>>;
};
