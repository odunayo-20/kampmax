// Shared form-value shapes for the proposal creation flow.

import type {
  ProposalAttachment,
  ProposalDeliveryUnit,
} from "@/types/opportunity";
import type { MilestoneRow } from "@/lib/milestone-plan";

export interface ProposalFormValues {
  coverLetter: string;
  proposedAmount: string; // raw string; parsed before submit
  deliveryValue: string; // raw string
  deliveryUnit: ProposalDeliveryUnit;
  screeningAnswers: Record<string, string>;
  /** Optional payment plan; none means one payment for the whole amount. */
  milestones: MilestoneRow[];
  attachments: ProposalAttachment[];
}

export function emptyProposalFormValues(): ProposalFormValues {
  return {
    coverLetter: "",
    proposedAmount: "",
    deliveryValue: "",
    deliveryUnit: "days",
    screeningAnswers: {},
    milestones: [],
    attachments: [],
  };
}
