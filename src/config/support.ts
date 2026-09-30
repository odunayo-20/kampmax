import type {
  SupportAttachmentKind,
  SupportTicketCategory,
  SupportTicketStatus,
} from "@/types/admin";

/**
 * Customer support portal configuration (Module 26A side of Module 56).
 *
 * Only constructs that the backend support contract actually supports are
 * configured here — no invented categories, statuses or response times.
 */

/** Attachment policy mirrored from the shared support contract. Real file
 *  storage, signed URLs and server-side re-validation are backend work
 *  (see KAMPMAX_CUSTOMER_SUPPORT_BACKEND_GAPS.md). */
export const SUPPORT_ATTACHMENT_LIMITS = {
  maxFiles: 4,
  maxSizeBytes: 5 * 1024 * 1024, // 5MB each
  allowedMimeByKind: {
    image: ["image/jpeg", "image/png", "image/webp"],
    document: ["application/pdf"],
    other: [],
  } as Partial<Record<SupportAttachmentKind, string[]>>,
} as const;

export const SUPPORT_ATTACHMENT_ACCEPT =
  "image/jpeg,image/png,image/webp,application/pdf";

/** Never encourage customers to send credentials to support. */
export const SUPPORT_SECURITY_NOTICE =
  "Never send your password, OTP, card PIN, or other private security credentials to support.";

export interface SupportCategoryOption {
  value: SupportTicketCategory;
  title: string;
  description: string;
}

/** Customer-appropriate labels for the EXACT backend category set. */
export const SUPPORT_CATEGORY_OPTIONS: SupportCategoryOption[] = [
  {
    value: "account",
    title: "Account & Login",
    description: "Login, registration, profile and account access problems.",
  },
  {
    value: "marketplace",
    title: "Orders & Marketplace",
    description:
      "Orders, products, vendors, delivery status, cancellations and refunds.",
  },
  {
    value: "payments",
    title: "Payments & Refunds",
    description: "Failed or duplicate payments, refunds and transaction status.",
  },
  {
    value: "verification",
    title: "Verification",
    description: "ID or document verification and status checks.",
  },
  {
    value: "freelancer",
    title: "Freelancers",
    description: "Freelancer services, delivery and contracts.",
  },
  {
    value: "service_provider",
    title: "Service Providers",
    description: "Bookings, service delivery and provider issues.",
  },
  {
    value: "employer",
    title: "Jobs & Hiring",
    description: "Applications, jobs, hiring and employer or client issues.",
  },
  {
    value: "technical",
    title: "Technical Problems",
    description: "Broken pages, errors, app behaviour, uploads and notifications.",
  },
  {
    value: "other",
    title: "Something Else",
    description: "Anything not covered by the categories above.",
  },
];

export function supportCategoryOption(
  value: SupportTicketCategory | string
): SupportCategoryOption {
  const norm = (value || "").toLowerCase();
  return (
    SUPPORT_CATEGORY_OPTIONS.find((c) => c.value.toLowerCase() === norm) ?? {
      value: norm as SupportTicketCategory,
      title: (value || "").replace(/_/g, " "),
      description: "",
    }
  );
}

/** One-line explanations for each status the backend actually emits. */
export const SUPPORT_STATUS_EXPLAINERS: Record<SupportTicketStatus, string> = {
  open: "Your request has been received.",
  pending: "Your request is waiting to be reviewed.",
  in_progress: "A support team member is reviewing your request.",
  waiting_on_customer: "We need additional information from you.",
  resolved: "The issue has been addressed.",
  closed: "The support case has been closed.",
};

/** A customer may reply while the case is live; resolved/closed cases are
 *  read-only (reopening is a support-team decision). */
export function canCustomerReply(status: SupportTicketStatus): boolean {
  return status !== "resolved" && status !== "closed";
}