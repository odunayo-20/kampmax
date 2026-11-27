/**
 * What the accommodation agent's hub says at a glance: the one thing to do today, what keeping the listings costs,
 * a notice for listings about to end, and the one step that gets a new agent to a live room. The mobile app's
 * lib/agent-hub.ts and lib/agent-portal.ts (buildCallouts) say the same things. Pure: no screens, no network.
 */

import type { AgentOverview } from "@/services/accommodation-overview";
import { pluralize } from "./utils";

const day = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
};

export interface AgentToday {
  kind: "confirm" | "visits" | "enquiries" | "upcoming";
  title: string;
  detail: string;
  /** Where it is dealt with. Rooms to confirm are answered on the hub itself. */
  href: string | null;
}

/**
 * The one thing worth doing now. A room about to vanish from the site comes first, because the agent is paying for
 * it; then people waiting for an answer; then the next visit. Null when nothing needs the agent.
 */
export function agentToday(d: AgentOverview): AgentToday | null {
  const c = d.needsConfirming;
  if (c.count > 0) {
    const until = day(c.hideBy);
    return {
      kind: "confirm",
      title: `${pluralize(c.count, "room")} to confirm`,
      detail: until ? `Still available? It is hidden from students on ${until} if you do not say.` : "Say if each is still available, or students stop seeing it.",
      href: null,
    };
  }
  if (d.inspections.awaitingAnswer > 0) {
    return { kind: "visits", title: `${pluralize(d.inspections.awaitingAnswer, "visit request")} waiting`, detail: "Students are waiting to hear if they can see the place.", href: "/agent/visits" };
  }
  if (d.enquiries.new > 0) {
    return { kind: "enquiries", title: pluralize(d.enquiries.new, "new enquiry", "new enquiries"), detail: "A quick reply is more likely to turn into a visit.", href: "/agent/enquiries" };
  }
  if (d.inspections.upcoming > 0) {
    return { kind: "upcoming", title: `${pluralize(d.inspections.upcoming, "visit")} coming up`, detail: "Open Visits to see when and where.", href: "/agent/visits" };
  }
  return null;
}

/** What is under the "Live now" card. */
export function listingsFooter(d: AgentOverview): string {
  const l = d.listings;
  if (l.total === 0) return "Add your first room";
  const parts: string[] = [];
  if (l.pendingApproval) parts.push(`${l.pendingApproval} in review`);
  if (l.drafts) parts.push(pluralize(l.drafts, "draft"));
  return parts.length ? parts.join(" · ") : pluralize(l.total, "listing");
}

/** What is under the "Spent" card: when the next payment is due, or nothing to pay. */
export function spendFooter(d: AgentOverview, format: (n: number) => string): string {
  const r = d.nextRenewal;
  if (!r) return d.spending.refundsPending > 0 ? `${format(d.spending.refundsPending)} being refunded` : "Nothing due";
  return `${r.autoRenew ? "Renews" : "Ends"} ${day(r.expiresAt)} · ${format(r.amount)}`;
}

/** Listings about to end or already ended: they cost the agent reach if ignored. The first one is shown. */
export function listingNotices(d: AgentOverview): { id: string; title: string; text: string; href: string }[] {
  const out: { id: string; title: string; text: string; href: string }[] = [];
  if (d.listings.expiringSoon > 0) {
    out.push({ id: "expiring", href: "/agent/listings", title: `${pluralize(d.listings.expiringSoon, "listing")} ending within 7 days`, text: "Renew in time so students keep seeing it." });
  }
  if (d.listings.expired > 0) {
    out.push({ id: "expired", href: "/agent/listings", title: `${pluralize(d.listings.expired, "listing")} expired`, text: "Expired listings are hidden from students until you renew." });
  }
  return out;
}

export interface SetupStep {
  title: string;
  detail: string;
  href: string;
  /** "1 of 3 done". */
  progress: string;
}

/**
 * The single step that gets a new agent to a live room: a property, then a listing, then publishing it. Null once
 * something is live (or paid and waiting for review), so an established agent never sees it.
 */
export function setupStep(d: AgentOverview): SetupStep | null {
  const l = d.listings;
  if (l.active > 0 || l.pendingApproval > 0) return null;
  const progress = `${(d.properties > 0 ? 1 : 0) + (l.total > 0 ? 1 : 0)} of 3 done`;
  if (d.properties === 0) {
    return { progress, title: "Add your first property", detail: "Where the room is, and its rooms. Students never see the street address.", href: "/agent/properties" };
  }
  if (l.total === 0) {
    return { progress, title: "List your first room", detail: "Add photos, the rent and what it includes.", href: "/agent/listings?new=1" };
  }
  return { progress, title: "Publish a listing", detail: "Choose a package so students can find the room.", href: "/agent/listings" };
}
