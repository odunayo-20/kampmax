// Reports on vacancies, internships and the people who apply to them, and the
// admin side that works through them. Values are exactly what the backend sends.

export type JobReportReason =
  | "SCAM"
  | "ASKS_FOR_PAYMENT"
  | "MISLEADING"
  | "INAPPROPRIATE"
  | "ABUSIVE"
  | "SPAM"
  | "OTHER";

/** What was reported: the posting itself, or one person who applied. */
export type JobReportTarget = "POSTING" | "APPLICANT";

export type JobReportStatus = "OPEN" | "RESOLVED";

export type JobReportOutcome = "ACTION_TAKEN" | "NO_ACTION";

/** What an admin does to close a report. */
export type JobReportAction = "DISMISS" | "TAKE_DOWN" | "REMOVE_APPLICATION";

export interface ReportInput {
  reason: JobReportReason;
  details?: string;
}

export interface PersonRef {
  id: string;
  name: string;
  username: string;
}

export interface AdminJobReport {
  id: string;
  targetType: JobReportTarget;
  reason: JobReportReason;
  details: string | null;
  status: JobReportStatus;
  outcome: JobReportOutcome | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: PersonRef;
  job: {
    id: string;
    title: string;
    opportunityType: string;
    status: string;
    employerName: string;
  };
  /** The reported applicant; null for a posting report or once the application was cleaned up. */
  applicant: (PersonRef & { applicationId: string; applicationStatus: string }) | null;
  /** Open reports on the same posting, this one included. */
  openOnPosting: number;
}

export interface ResolveReportInput {
  action: JobReportAction;
  /** Required to take a posting down or remove an application: the other side is shown it. */
  note?: string;
  /** With TAKE_DOWN: also refund what the posting cost. */
  refund?: boolean;
}

export interface ResolveReportResult {
  report: AdminJobReport;
  refundedAmount: number;
  /** Other open reports on the same posting that a take-down closed too. */
  alsoResolved: number;
}

/** An application as a moderator sees it. */
export interface AdminApplicationDetail {
  id: string;
  /** Same vocabulary as the admin applicants table (submitted, under_review, accepted…). */
  status: string;
  cvLabel: string;
  cvAvailable: boolean;
  coverNote: string | null;
  answers: { question: string; answer: string }[];
  employerNote: string | null;
  createdAt: string;
  viewedAt: string | null;
  decidedAt: string | null;
  applicant: PersonRef;
  job: {
    id: string;
    title: string;
    opportunityType: string;
    status: string;
    employerName: string;
  };
}
