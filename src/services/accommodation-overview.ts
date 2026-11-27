// ============================================================
// ACCOMMODATION AGENT OVERVIEW
// ============================================================
//
// What an approved agent should act on today and how their rooms are doing,
// from `GET /accommodation/agent/dashboard`: rooms to confirm, the next
// renewal, how fast students get an answer, views/saves per listing, and the
// counts the hub shows (listings, enquiries, visits, spending).
// The backend works the numbers out; this only reads them safely and words
// them. A missing field is empty, never a crash. The request itself lives
// in accommodationApi.agentOverview (services/accommodation.ts).

export interface AgentReplyStats {
  received: number;
  /** 0-100, or null while too few students have written to say. */
  answeredRate: number | null;
  /** Hours to a first answer, or null while too few to say. */
  typicalReplyHours: number | null;
}

export interface AgentOverview {
  properties: number;
  listings: { total: number; drafts: number; pendingApproval: number; active: number; expired: number; expiringSoon: number };
  enquiries: { total: number; new: number };
  /** What the agent has paid for listings in all, and any refund on its way back. */
  spending: { total: number; currency: string; refundsPending: number };
  nextRenewal: {
    listingId: string;
    title: string;
    expiresAt: string;
    amount: number;
    autoRenew: boolean;
  } | null;
  needsConfirming: {
    count: number;
    hideBy: string | null;
    listings: { id: string; title: string }[];
  };
  reply: AgentReplyStats;
  interest: { views: number; saves: number };
  /** Visit requests waiting for the agent's answer, and visits arranged and still to come. */
  inspections: { awaitingAnswer: number; upcoming: number };
  topListings: {
    listingId: string;
    title: string;
    views: number;
    saves: number;
    enquiries: number;
  }[];
}

import { countOf, maybeNumber, replyFacts } from "@/lib/reading";
import { pluralize } from "@/lib/utils";
import type { AccommodationListing, ListingStats } from "@/types/accommodation";

type Bag = Record<string, unknown>;

const bag = (v: unknown): Bag =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Bag) : {};
const text = (v: unknown): string => (typeof v === "string" ? v : "");
export function readAgentOverview(raw: unknown): AgentOverview {
  const r = bag(raw);
  const renewal = bag(r.nextRenewal);
  const confirm = bag(r.needsConfirming);
  const reply = bag(r.reply);
  const interest = bag(r.interest);
  const visits = bag(r.inspections);
  const l = bag(r.listings);
  const e = bag(r.enquiries);
  const s = bag(r.spending);
  const money = (v: unknown) => (Number(v) > 0 ? Number(v) : 0);
  const rooms = (Array.isArray(confirm.listings) ? confirm.listings : [])
    .map(bag)
    .filter((x) => text(x.id));
  return {
    properties: countOf(r.properties),
    listings: {
      total: countOf(l.total),
      drafts: countOf(l.drafts),
      pendingApproval: countOf(l.pendingApproval),
      active: countOf(l.active),
      expired: countOf(l.expired),
      expiringSoon: countOf(l.expiringSoon),
    },
    enquiries: { total: countOf(e.total), new: countOf(e.new) },
    spending: { total: money(s.total), currency: text(s.currency) || "NGN", refundsPending: money(s.refundsPending) },
    nextRenewal:
      text(renewal.listingId) && text(renewal.expiresAt)
        ? {
            listingId: text(renewal.listingId),
            title: text(renewal.title),
            expiresAt: text(renewal.expiresAt),
            amount: Number(renewal.amount) > 0 ? Number(renewal.amount) : 0,
            autoRenew: renewal.autoRenew === true,
          }
        : null,
    needsConfirming: {
      count: Math.max(countOf(confirm.count), rooms.length),
      hideBy: text(confirm.hideBy) || null,
      listings: rooms.map((x) => ({ id: text(x.id), title: text(x.title) })),
    },
    reply: {
      received: countOf(reply.received),
      answeredRate: maybeNumber(reply.answeredRate),
      typicalReplyHours: maybeNumber(reply.typicalReplyHours),
    },
    interest: { views: countOf(interest.views), saves: countOf(interest.saves) },
    inspections: { awaitingAnswer: countOf(visits.awaitingAnswer), upcoming: countOf(visits.upcoming) },
    topListings: (Array.isArray(r.topListings) ? r.topListings : [])
      .map(bag)
      .filter((x) => text(x.listingId))
      .map((x) => ({
        listingId: text(x.listingId),
        title: text(x.title),
        views: countOf(x.views),
        saves: countOf(x.saves),
        enquiries: countOf(x.enquiries),
      })),
  };
}

/** The short facts students see about how fast an agent answers. Too few enquiries means nothing is shown. */
export function replyChips(reply: Partial<AgentReplyStats> | null | undefined): string[] {
  if (!reply) return [];
  return replyFacts({
    typicalReplyHours: typeof reply.typicalReplyHours === "number" ? reply.typicalReplyHours : null,
    rate: typeof reply.answeredRate === "number" ? reply.answeredRate : null,
  });
}

/** "40 views · 6 saves · 3 enquiries". */
export function interestLine(x: Pick<ListingStats, "views" | "saves"> & { enquiries?: number }): string {
  const parts = [pluralize(x.views, "view"), pluralize(x.saves, "save")];
  if (x.enquiries !== undefined) parts.push(pluralize(x.enquiries, "enquiry", "enquiries"));
  return parts.join(" · ");
}

/**
 * What one of the agent's own listings is getting. Only a live listing can be looked at, so a draft, a review or
 * a rejection says nothing rather than a row of zeros.
 */
export function listingInterest(listing: Pick<AccommodationListing, "moderationStatus" | "stats">): string | null {
  return listing.moderationStatus === "APPROVED" && listing.stats ? interestLine(listing.stats) : null;
}
