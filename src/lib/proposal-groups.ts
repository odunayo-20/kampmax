/**
 * A freelancer's proposals in four plain groups instead of seven raw statuses: still waiting for an answer, won,
 * unsent drafts, and the rest. The mobile app's freelance-ux (proposalTab, defaultProposalTab) groups them the same.
 */

import { PROPOSAL_STATUS, type ProposalStatus } from "@/types/opportunity";

export type ProposalGroup = "waiting" | "won" | "drafts" | "closed";

export const PROPOSAL_GROUPS: { id: ProposalGroup; label: string; empty: string }[] = [
  { id: "waiting", label: "Waiting", empty: "No proposals are waiting for an answer." },
  { id: "won", label: "Won", empty: "Proposals an employer accepts will show up here." },
  { id: "drafts", label: "Drafts", empty: "Proposals you save without sending will show up here." },
  { id: "closed", label: "Closed", empty: "Declined and withdrawn proposals will show up here." },
];

export function proposalGroup(status: ProposalStatus): ProposalGroup {
  switch (status) {
    case PROPOSAL_STATUS.DRAFT:
      return "drafts";
    case PROPOSAL_STATUS.ACCEPTED:
      return "won";
    case PROPOSAL_STATUS.SUBMITTED:
    case PROPOSAL_STATUS.UNDER_REVIEW:
    case PROPOSAL_STATUS.SHORTLISTED:
      return "waiting";
    default:
      return "closed";
  }
}

/** Open on waiting proposals; when there are none, on wins, then drafts, then the rest. */
export function defaultProposalGroup(statuses: ProposalStatus[]): ProposalGroup {
  for (const g of ["waiting", "won", "drafts"] as const) if (statuses.some((s) => proposalGroup(s) === g)) return g;
  return "closed";
}

/** The group a link asks for: `?tab=drafts`, or the older `?status=draft`. Null when it names none. */
export function groupFromParams(params: { get(key: string): string | null }): ProposalGroup | null {
  const tab = params.get("tab");
  if (PROPOSAL_GROUPS.some((g) => g.id === tab)) return tab as ProposalGroup;
  const status = params.get("status");
  return status ? proposalGroup(status as ProposalStatus) : null;
}
