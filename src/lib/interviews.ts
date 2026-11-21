// ============================================================
// INTERVIEWS ON A JOB APPLICATION
// ============================================================
//
// The employer picks a time and place; the applicant confirms it or says it
// does not work. What each side sees, and the form's checks, which mirror the
// server's (at least an hour ahead, within 90 days, a place up to 200
// characters, a note up to 500). Pure.

export const INTERVIEW_MAX_DAYS = 90;
export const INTERVIEW_PLACE_MAX = 200;
export const INTERVIEW_NOTE_MAX = 500;

export type InterviewResponse = "PROPOSED" | "CONFIRMED" | "DECLINED";

/** The time the employer picked, as the server sends it. */
export interface Interview {
  /** ISO time. */
  at: string;
  place: string | null;
  note: string | null;
  response: InterviewResponse;
}

/** An interview the server sent, or null when there is none or it is too broken to show. */
export function interviewFrom(raw: unknown): Interview | null {
  const r = (raw && typeof raw === "object" ? raw : null) as Record<string, unknown> | null;
  if (!r || typeof r.at !== "string" || Number.isNaN(Date.parse(r.at))) return null;
  const response = r.response === "CONFIRMED" || r.response === "DECLINED" ? r.response : "PROPOSED";
  return {
    at: r.at,
    place: typeof r.place === "string" && r.place ? r.place : null,
    note: typeof r.note === "string" && r.note ? r.note : null,
    response,
  };
}

/** "Sat, 5 Dec, 2:00 pm". */
export function whenText(iso: string): string {
  return new Date(iso).toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** "Sat, 5 Dec, 2:00 pm at Block C". */
export function interviewLine(i: Pick<Interview, "at" | "place">): string {
  const when = whenText(i.at);
  return i.place ? `${when} at ${i.place}` : when;
}

export type Tone = "info" | "success" | "warning" | "default";

/** How the employer reads the applicant's answer. */
export function employerResponseView(response: InterviewResponse): { label: string; tone: Tone } {
  if (response === "CONFIRMED") return { label: "Confirmed", tone: "success" };
  if (response === "DECLINED") return { label: "Cannot make it", tone: "warning" };
  return { label: "Waiting for their answer", tone: "info" };
}

/** What the applicant is asked, in their own words. */
export function applicantResponseView(response: InterviewResponse): { label: string; text: string } {
  if (response === "CONFIRMED") {
    return { label: "You confirmed", text: "See you then. If something changes, tell the employer so they can pick another time." };
  }
  if (response === "DECLINED") {
    return { label: "You said it does not work", text: "The employer has been told and can pick another time." };
  }
  return { label: "Please confirm", text: "Does this time work for you?" };
}

/** Whether the applicant can still answer: the time has not passed. */
export const canAnswer = (i: Pick<Interview, "at">, now: number = Date.now()): boolean =>
  Date.parse(i.at) > now;

export interface InterviewBody {
  at: string;
  place?: string;
  note?: string;
}

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/**
 * The form (a `datetime-local` value like "2026-12-05T14:00", a place and a note) as the body the server takes,
 * or what is wrong with it. The browser's local time is used.
 */
export function interviewBodyFrom(
  input: { when: string; place: string; note: string },
  now: number = Date.now()
): { body: InterviewBody } | { problem: string } {
  const at = new Date(input.when);
  if (!input.when || Number.isNaN(at.getTime())) return { problem: "Choose a date and time for the interview." };
  if (at.getTime() < now + HOUR) return { problem: "Pick a time at least an hour from now, so the applicant can get ready." };
  if (at.getTime() > now + INTERVIEW_MAX_DAYS * DAY) {
    return { problem: `Pick a time within the next ${INTERVIEW_MAX_DAYS} days.` };
  }
  const place = input.place.trim();
  const note = input.note.trim();
  if (place.length > INTERVIEW_PLACE_MAX) return { problem: `Keep the place under ${INTERVIEW_PLACE_MAX} characters.` };
  if (note.length > INTERVIEW_NOTE_MAX) return { problem: `Keep the note under ${INTERVIEW_NOTE_MAX} characters.` };
  return { body: { at: at.toISOString(), ...(place ? { place } : {}), ...(note ? { note } : {}) } };
}
