// What an admin sees of the public contact form (/admin/contact-messages).

export type ContactInquiryType =
  | "general"
  | "business"
  | "vendor"
  | "service-provider"
  | "partnership"
  | "support";

export type ContactMessageStatus = "NEW" | "HANDLED";

export interface AdminContactMessage {
  id: string;
  name: string;
  email: string;
  inquiryType: ContactInquiryType;
  inquiryLabel: string;
  organization: string | null;
  phone: string | null;
  message: string;
  status: ContactMessageStatus;
  handledAt: string | null;
  handledByName: string | null;
  /** False when the team inbox was never emailed about it, so it only exists here. */
  emailed: boolean;
  createdAt: string;
}
