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
  AdminAgentDetail,
  AdminAgentListItem,
  AdminListingDetail,
  AdminListingItem,
  AgentDocumentFile,
  ListingModerationStatus,
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
}
