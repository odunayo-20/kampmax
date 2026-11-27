/**
 * An accommodation agent's side of a housing enquiry: status wording, the statuses an agent may set, list filters,
 * quick replies, safe contact links and what may be done with a visit. The mobile app's lib/agent-enquiries.ts says
 * the same things. The student's side, and what both share, is accommodation-enquiry.ts. Pure rules, no network.
 */

import { describeWhen, isFinalEnquiry, type Tone } from "./accommodation-enquiry";

export function enquiryStatusView(s: string): { label: string; tone: Tone } {
  switch (s) {
    case "NEW":
      return { label: "New", tone: "attention" };
    case "CONTACTED":
      return { label: "In conversation", tone: "info" };
    case "INSPECTION_SCHEDULED":
      return { label: "Visit booked", tone: "info" };
    case "VISITED":
      return { label: "Visited", tone: "info" };
    case "NEGOTIATING":
      return { label: "Negotiating", tone: "info" };
    case "CLOSED":
      return { label: "Closed", tone: "neutral" };
    case "CANCELLED":
      return { label: "Cancelled by student", tone: "neutral" };
    case "NOT_INTERESTED":
      return { label: "Not interested", tone: "neutral" };
    case "UNRESPONSIVE":
      return { label: "No reply", tone: "neutral" };
    default:
      return { label: s, tone: "neutral" };
  }
}

export type AgentSettableStatus = "CONTACTED" | "NEGOTIATING" | "VISITED" | "CLOSED" | "UNRESPONSIVE";

/** What an agent may set by hand. INSPECTION_SCHEDULED is only ever set by a visit. */
const AGENT_MAY_SET: { id: AgentSettableStatus; label: string; final: boolean }[] = [
  { id: "CONTACTED", label: "In conversation", final: false },
  { id: "NEGOTIATING", label: "Negotiating", final: false },
  { id: "VISITED", label: "Visited", final: false },
  { id: "CLOSED", label: "Closed (done)", final: true },
  { id: "UNRESPONSIVE", label: "No reply from student", final: true },
];

/** The statuses the agent can move this enquiry to now. A finished enquiry has none. */
export function statusChoices(current: string): { id: AgentSettableStatus; label: string; final: boolean }[] {
  if (isFinalEnquiry(current)) return [];
  return AGENT_MAY_SET.filter((s) => s.id !== current);
}

export type EnquiryFilter = "all" | "new" | "active" | "finished";

export const ENQUIRY_FILTERS: { id: EnquiryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "active", label: "In progress" },
  { id: "finished", label: "Finished" },
];

export function matchesFilter(e: { status: string }, f: EnquiryFilter): boolean {
  if (f === "new") return e.status === "NEW";
  if (f === "finished") return isFinalEnquiry(e.status);
  if (f === "active") return e.status !== "NEW" && !isFinalEnquiry(e.status);
  return true;
}

const HOUR_MS = 3_600_000;

/** "Waiting 5 hours" for a new enquiry nobody has answered, so slow replies are visible. Null otherwise. */
export function waitingText(e: { status: string; firstResponseAt: string | null; createdAt: string }, now: Date = new Date()): string | null {
  if (e.status !== "NEW" || e.firstResponseAt) return null;
  const hours = Math.floor((now.getTime() - new Date(e.createdAt).getTime()) / HOUR_MS);
  if (!Number.isFinite(hours) || hours < 1) return "Just arrived";
  if (hours < 48) return `Waiting ${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `Waiting ${Math.floor(hours / 24)} days`;
}

/** Answers an agent sends over and over. Picking one fills the box; the agent can still change it before sending. */
export const QUICK_REPLIES: { id: string; label: string; text: string }[] = [
  { id: "available", label: "Still available", text: "Yes, the room is still available. When would you like to come and see it?" },
  { id: "costs", label: "Costs and visit", text: "Thanks for your interest. The rent and charges are as shown on the listing. Would you like to book a visit?" },
  { id: "taken", label: "It is taken", text: "Sorry, this room has just been taken. I will let you know if another one opens up." },
];

const EMAIL = /^[^\s@<>"',;]+@[^\s@<>"',;]+\.[^\s@<>"',;]{2,}$/;

export interface ContactLink {
  label: string;
  url: string;
}

/**
 * Call and email links for the details the student chose to share. They come from a stranger, so only plain digits
 * and a plain address ever make it into a link: anything odd is shown as text with no link.
 */
export function contactLinks(contact: { phone?: string; email?: string } | undefined): { phone: ContactLink | null; email: ContactLink | null; shown: string[] } {
  const phoneRaw = (contact?.phone ?? "").trim();
  const emailRaw = (contact?.email ?? "").trim();
  const digits = phoneRaw.replace(/[^\d+]/g, "");
  const phone = /^\+?\d{7,15}$/.test(digits) ? { label: phoneRaw, url: `tel:${digits}` } : null;
  const email = EMAIL.test(emailRaw) && emailRaw.length <= 254 ? { label: emailRaw, url: `mailto:${emailRaw}` } : null;
  return { phone, email, shown: [phoneRaw, emailRaw].filter(Boolean) };
}

export const CONTACT_HINT = "Use it only to arrange this viewing. It is theirs, not yours to keep or pass on.";

type Visit = { status: string; requestedDate: string; proposedDate: string | null; confirmedDate: string | null };

export function inspectionView(i: Visit): { label: string; tone: Tone; text: string } {
  switch (i.status) {
    case "REQUESTED":
      return { label: "Needs your answer", tone: "attention", text: `The student asked to visit on ${describeWhen(i.requestedDate)}.` };
    case "CONFIRMED":
      return { label: "Confirmed", tone: "positive", text: `Visit on ${describeWhen(i.confirmedDate)}.` };
    case "RESCHEDULE_PROPOSED":
      return { label: "Waiting for the student", tone: "info", text: `You suggested ${describeWhen(i.proposedDate)}. The student has not answered yet.` };
    case "REJECTED":
      return { label: "Declined", tone: "neutral", text: "You declined this request." };
    case "COMPLETED":
      return { label: "Done", tone: "positive", text: `The visit on ${describeWhen(i.confirmedDate)} took place.` };
    case "CANCELLED":
      return { label: "Cancelled", tone: "neutral", text: "This visit was called off." };
    default:
      return { label: i.status, tone: "neutral", text: "" };
  }
}

const VISIT_OPEN = ["REQUESTED", "CONFIRMED", "RESCHEDULE_PROPOSED"];

/** Answer a request, record a visit once its time has passed, or call off one still open. */
export function visitActions(i: { status: string; confirmedDate: string | null }, now: Date = new Date()): { answer: boolean; complete: boolean; completeHint: string | null; cancel: boolean } {
  const confirmed = i.status === "CONFIRMED" && !!i.confirmedDate;
  const past = confirmed && new Date(i.confirmedDate as string).getTime() <= now.getTime();
  return {
    answer: i.status === "REQUESTED",
    complete: confirmed && past,
    completeHint: confirmed && !past ? "You can mark it done once the visit time has passed." : null,
    cancel: VISIT_OPEN.includes(i.status),
  };
}

export type VisitFilter = "answer" | "upcoming" | "past";

export const VISIT_FILTERS: { id: VisitFilter; label: string }[] = [
  { id: "answer", label: "Needs answer" },
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
];

export function visitMatches(i: { status: string }, f: VisitFilter): boolean {
  if (f === "answer") return i.status === "REQUESTED";
  if (f === "upcoming") return i.status === "CONFIRMED" || i.status === "RESCHEDULE_PROPOSED";
  return i.status === "COMPLETED" || i.status === "REJECTED" || i.status === "CANCELLED";
}

/** The date a visit is about, whichever stage it is in, for sorting and for the card. */
export function visitDate(i: Visit): string {
  return (i.status === "CONFIRMED" || i.status === "COMPLETED" ? i.confirmedDate : i.status === "RESCHEDULE_PROPOSED" ? i.proposedDate : null) ?? i.requestedDate;
}

/** The visits under one tab: soonest first for what is coming, most recent first for what is over. */
export function visitsFor<T extends Visit>(items: T[], f: VisitFilter): T[] {
  const time = (i: T) => new Date(visitDate(i)).getTime();
  return items.filter((i) => visitMatches(i, f)).sort((a, b) => (f === "past" ? time(b) - time(a) : time(a) - time(b)));
}

export const AGENT_VISITS_EMPTY = {
  title: "No visits yet",
  text: "When a student asks to see a place, the request shows up here and you get a notification.",
};

export const AGENT_ENQUIRIES_EMPTY = {
  title: "No enquiries yet",
  text: "When a student asks about one of your live listings, it shows up here and you get a notification.",
};

export const ENQUIRY_FINISHED_NOTE = "This enquiry is finished, so it takes no more messages.";
