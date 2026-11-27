/**
 * A student's housing enquiry: how its status reads, what may be done with a visit, and the wording. The mobile app's
 * lib/accommodation-search.ts and lib/agent-enquiries.ts say the same things. Pure rules: no screens, no network.
 */

export type Tone = "positive" | "attention" | "info" | "neutral";

const FINAL = ["CLOSED", "CANCELLED", "NOT_INTERESTED", "UNRESPONSIVE"];

/** Closed one way or the other: it takes no more messages. */
export const isFinalEnquiry = (status: string): boolean => FINAL.includes(status);

export function myEnquiryStatus(s: string): { label: string; tone: Tone } {
  switch (s) {
    case "NEW":
      return { label: "Sent", tone: "info" };
    case "CONTACTED":
      return { label: "Agent replied", tone: "positive" };
    case "INSPECTION_SCHEDULED":
      return { label: "Visit booked", tone: "positive" };
    case "VISITED":
      return { label: "Visited", tone: "info" };
    case "NEGOTIATING":
      return { label: "Negotiating", tone: "info" };
    case "CLOSED":
      return { label: "Closed by agent", tone: "neutral" };
    case "CANCELLED":
      return { label: "Closed by you", tone: "neutral" };
    case "NOT_INTERESTED":
      return { label: "Not interested", tone: "neutral" };
    case "UNRESPONSIVE":
      return { label: "No reply", tone: "neutral" };
    default:
      return { label: s, tone: "neutral" };
  }
}

/** What a student may set: only to close an open enquiry, one way or the other. */
export const STUDENT_CLOSERS: { id: "NOT_INTERESTED" | "CANCELLED"; label: string }[] = [
  { id: "NOT_INTERESTED", label: "Not interested" },
  { id: "CANCELLED", label: "Close enquiry" },
];

/** "Sat 5 Dec, 2:00 PM". */
export function describeWhen(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = d.toLocaleDateString("en-NG", { weekday: "short", day: "numeric", month: "short" });
  const time = d.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", hour12: true }).replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());
  return `${day}, ${time}`;
}

export function myVisitView(i: { status: string; requestedDate: string; proposedDate: string | null; confirmedDate: string | null }): {
  label: string;
  tone: Tone;
  text: string;
} {
  switch (i.status) {
    case "REQUESTED":
      return { label: "Waiting for the agent", tone: "info", text: `You asked to visit on ${describeWhen(i.requestedDate)}.` };
    case "CONFIRMED":
      return { label: "Confirmed", tone: "positive", text: `Your visit is on ${describeWhen(i.confirmedDate)}.` };
    case "RESCHEDULE_PROPOSED":
      return { label: "New time suggested", tone: "attention", text: `The agent suggested ${describeWhen(i.proposedDate)} instead.` };
    case "REJECTED":
      return { label: "Declined", tone: "neutral", text: "The agent could not do that time. You can ask for another." };
    case "COMPLETED":
      return { label: "Done", tone: "positive", text: `The visit on ${describeWhen(i.confirmedDate)} took place.` };
    case "CANCELLED":
      return { label: "Cancelled", tone: "neutral", text: "This visit was called off. You can ask for another." };
    default:
      return { label: i.status, tone: "neutral", text: "" };
  }
}

const VISIT_OPEN = ["REQUESTED", "CONFIRMED", "RESCHEDULE_PROPOSED"];

/**
 * What the student may do with the visit: ask for one whenever the enquiry is open and no visit is in play (so
 * after a declined or called-off visit too), answer a suggested time, and call off one that has not happened.
 */
export function myVisitActions(enquiryStatus: string, visit: { status: string } | null | undefined): { request: boolean; answer: boolean; cancel: boolean } {
  const open = !isFinalEnquiry(enquiryStatus);
  const inPlay = !!visit && VISIT_OPEN.includes(visit.status);
  return { request: open && !inPlay, answer: !!visit && visit.status === "RESCHEDULE_PROPOSED", cancel: inPlay };
}

export const VISIT_MAX_DAYS = 60;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

/** A visit must be at least an hour away and within the next 60 days. */
export function visitTimeProblem(date: Date, now: Date = new Date()): string | null {
  if (Number.isNaN(date.getTime())) return "Choose a date and time.";
  const ahead = date.getTime() - now.getTime();
  if (ahead < HOUR_MS) return "Choose a time at least an hour from now.";
  if (ahead > VISIT_MAX_DAYS * DAY_MS) return `Choose a time within the next ${VISIT_MAX_DAYS} days.`;
  return null;
}

/** A local time as a `datetime-local` input value ("2026-12-05T14:00"). */
export function localInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** The earliest and latest times the visit picker offers. */
export function visitWindow(now: Date = new Date()): { min: string; max: string } {
  return { min: localInputValue(new Date(now.getTime() + HOUR_MS)), max: localInputValue(new Date(now.getTime() + VISIT_MAX_DAYS * DAY_MS)) };
}

export const VISIT_NOTE_MAX = 500;
export const MESSAGE_MAX = 1000;

export const ENQUIRY_CLOSED_NOTE =
  "This enquiry is closed, so it takes no more messages. You can ask about the place again from its page.";

export const MY_ENQUIRIES_EMPTY = {
  title: "No enquiries yet",
  text: "When you ask an agent about a place, the conversation and any visit are kept here.",
};

/** How often the list of enquiries checks for news. */
export const ENQUIRY_POLL_MS = 30_000;
/** How often an open enquiry checks for a reply. */
export const THREAD_POLL_MS = 15_000;
