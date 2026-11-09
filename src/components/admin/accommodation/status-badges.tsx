import { cn } from "@/lib/utils";
import {
  AGENT_STATUS_LABELS,
  LISTING_MODERATION_LABELS,
  LISTING_PUBLICATION_LABELS,
  type AccommodationAgentStatus,
  type AgentDocumentStatus,
  type ListingModerationStatus,
  type ListingPublicationStatus,
} from "@/types/accommodation";

const PILL = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium";

const AGENT_STYLE: Record<AccommodationAgentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  SUSPENDED: "bg-orange-50 text-orange-700",
  REVOKED: "bg-kampmax-muted text-kampmax-text-secondary",
};

export function AgentStatusBadge({ status }: { status: AccommodationAgentStatus }) {
  return <span className={cn(PILL, AGENT_STYLE[status])}>{AGENT_STATUS_LABELS[status]}</span>;
}

const DOCUMENT_STYLE: Record<AgentDocumentStatus, string> = {
  PENDING: "bg-amber-50 text-amber-700",
  ACCEPTED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
};

const DOCUMENT_LABEL: Record<AgentDocumentStatus, string> = {
  PENDING: "Not reviewed",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export function DocumentStatusBadge({ status }: { status: AgentDocumentStatus }) {
  return <span className={cn(PILL, DOCUMENT_STYLE[status])}>{DOCUMENT_LABEL[status]}</span>;
}

const MODERATION_STYLE: Record<ListingModerationStatus, string> = {
  DRAFT: "bg-kampmax-muted text-kampmax-text-secondary",
  PENDING_APPROVAL: "bg-amber-50 text-amber-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  ADMIN_SUSPENDED: "bg-orange-50 text-orange-700",
};

export function ModerationBadge({ status }: { status: ListingModerationStatus }) {
  return <span className={cn(PILL, MODERATION_STYLE[status])}>{LISTING_MODERATION_LABELS[status]}</span>;
}

const PUBLICATION_STYLE: Record<ListingPublicationStatus, string> = {
  UNPUBLISHED: "bg-kampmax-muted text-kampmax-text-secondary",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-red-50 text-red-700",
  HIDDEN: "bg-orange-50 text-orange-700",
};

export function PublicationBadge({ status }: { status: ListingPublicationStatus }) {
  return <span className={cn(PILL, PUBLICATION_STYLE[status])}>{LISTING_PUBLICATION_LABELS[status]}</span>;
}
