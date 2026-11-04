// ============================================================
// REVISIONS — WORDING AND SMALL HELPERS
// ============================================================
//
// When delivered work comes back, the client says what they are asking for.
// The backend decides what that means and keeps count; this file only words it
// and never works out a limit itself — how many revisions a delivery gets, and
// how many are used, always come from the server.
//
//   CHANGES   a change inside what was agreed. Uses one of the revisions.
//   FIX       a mistake, a bug or a missing part. The freelancer's own
//             correction, so it never uses a revision.
//   NEW_SCOPE something outside the agreement. Not a revision: the work is not
//             sent back, and the freelancer can send a new offer.

export type RevisionKind = "CHANGES" | "FIX" | "NEW_SCOPE";

export interface RevisionRequest {
  id: string;
  kind: RevisionKind;
  /** Whether it used up one of the revisions. */
  counted: boolean;
  note: string;
  createdAt: string;
}

/** The revisions on the current delivery, as the backend counts them. */
export interface Revisions {
  allowed: number;
  used: number;
  remaining: number;
  /** Everything the client asked for on this delivery, oldest first. */
  requests: RevisionRequest[];
}

export interface RevisionKindInfo {
  /** The choice, as the client reads it. */
  label: string;
  /** What choosing it does, in plain words. */
  help: (r: Pick<Revisions, "allowed" | "remaining">) => string;
  /** The field label for the note that goes with it. */
  noteLabel: string;
  placeholder: string;
  /** The submit button. */
  action: string;
  /** How a request of this kind reads in the history, for either side. */
  tag: string;
}

export const REVISION_KINDS: Record<RevisionKind, RevisionKindInfo> = {
  CHANGES: {
    label: "A change to the work",
    help: (r) =>
      r.remaining > 0
        ? `Inside what you agreed. This uses 1 of your ${r.remaining} remaining ${r.remaining === 1 ? "revision" : "revisions"}.`
        : `You have used all ${r.allowed} revisions, so ordinary changes are closed.`,
    noteLabel: "What needs to change?",
    placeholder: "e.g. Make the logo bigger and use the green from our brand guide.",
    action: "Send request",
    tag: "Change · used a revision",
  },
  FIX: {
    label: "A mistake or something missing",
    help: () =>
      "A bug, an error, or part of the agreed work that isn't there. The freelancer fixes it, and it doesn't use a revision.",
    noteLabel: "What is wrong or missing?",
    placeholder: "e.g. The contact form doesn't send, and the About page is missing.",
    action: "Report it",
    tag: "Mistake or missing part · no revision used",
  },
  NEW_SCOPE: {
    label: "Something new, outside what we agreed",
    help: () =>
      "A new feature or extra work. This isn't a revision and doesn't send the work back. The freelancer can send you a new offer, and the review time keeps running.",
    noteLabel: "What would you like added?",
    placeholder: "e.g. A blog section with three starter posts.",
    action: "Ask for extra work",
    tag: "Extra work · not a revision",
  },
};

/** "2 of 3 revisions used". */
export function revisionsUsedLabel(r: Pick<Revisions, "used" | "allowed">): string {
  return `${r.used} of ${r.allowed} ${r.allowed === 1 ? "revision" : "revisions"} used`;
}

/** "1 left", "none left". */
export function revisionsLeftLabel(r: Pick<Revisions, "remaining">): string {
  return r.remaining > 0 ? `${r.remaining} left` : "none left";
}

/** Where to ask a person for help; the contract is the subject, never the note's text. */
export const REVISIONS_SUPPORT_HREF = `/support/new?subject=${encodeURIComponent("Help with a delivery")}`;

/** The kind the request form starts on: a change while there are revisions, otherwise a mistake report. */
export function defaultRevisionKind(r: Pick<Revisions, "remaining">): RevisionKind {
  return r.remaining > 0 ? "CHANGES" : "FIX";
}
