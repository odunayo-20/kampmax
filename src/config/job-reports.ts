import { OPPORTUNITY_TYPE_META } from "@/config/opportunity";
import type { OpportunityType } from "@/types/opportunity";
import type {
  JobReportAction,
  JobReportOutcome,
  JobReportReason,
  JobReportTarget,
} from "@/types/job-moderation";

export const REPORT_DETAILS_MAX_CHARS = 1000;
export const RESOLUTION_NOTE_MAX_CHARS = 1000;
export const REPORTS_PAGE_SIZE = 20;

export const REASON_LABEL: Record<JobReportReason, string> = {
  SCAM: "Looks like a scam",
  ASKS_FOR_PAYMENT: "Asks for money",
  MISLEADING: "Misleading or false",
  INAPPROPRIATE: "Inappropriate content",
  ABUSIVE: "Abusive or harassing",
  SPAM: "Spam",
  OTHER: "Something else",
};

/** Reasons offered for each kind of report, in the order they are shown. */
export const REPORT_REASONS: Record<JobReportTarget, { value: JobReportReason; hint: string }[]> = {
  POSTING: [
    { value: "SCAM", hint: "A fake opportunity, or not who they say they are." },
    { value: "ASKS_FOR_PAYMENT", hint: "Wants a fee or money from applicants." },
    { value: "MISLEADING", hint: "The pay, role or company is not what it claims." },
    { value: "INAPPROPRIATE", hint: "Offensive or unsafe content." },
    { value: "SPAM", hint: "Repeated or unrelated posts." },
    { value: "OTHER", hint: "Tell us more below." },
  ],
  APPLICANT: [
    { value: "ABUSIVE", hint: "Rude, threatening or harassing messages." },
    { value: "SCAM", hint: "Fake identity or a fake CV." },
    { value: "INAPPROPRIATE", hint: "Offensive content in the application." },
    { value: "SPAM", hint: "Not a real application." },
    { value: "OTHER", hint: "Tell us more below." },
  ],
};

export const TARGET_LABEL: Record<JobReportTarget, string> = {
  POSTING: "Posting",
  APPLICANT: "Applicant",
};

export const OUTCOME_LABEL: Record<JobReportOutcome, string> = {
  ACTION_TAKEN: "Action taken",
  NO_ACTION: "Dismissed",
};

export const ACTION_LABEL: Record<JobReportAction, string> = {
  DISMISS: "Dismiss",
  TAKE_DOWN: "Take the posting down",
  REMOVE_APPLICATION: "Remove the application",
};

/** The backend sends FULL_TIME; the badges and labels are keyed by full_time. */
export function opportunityTypeOf(raw: string): OpportunityType {
  const key = raw.toLowerCase();
  return key in OPPORTUNITY_TYPE_META ? (key as OpportunityType) : "gig";
}
