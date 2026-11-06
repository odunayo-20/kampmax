// ============================================================
// CONTACT MESSAGES SERVICE CONTRACT
// ============================================================
//
// What the team can do with messages sent through the public contact form:
// read them, mark them handled (or put them back), and delete one. The live
// implementation is contact-messages.api.ts.
// ============================================================

import type { Paginated } from "@/types/admin";
import type {
  AdminContactMessage,
  ContactInquiryType,
} from "@/types/contact-messages";

export type ContactStatusFilter = "new" | "handled" | "all";

export interface ContactMessagesQuery {
  /** Defaults to messages still waiting. */
  status?: ContactStatusFilter;
  inquiryType?: ContactInquiryType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ContactMessagesPage extends Paginated<AdminContactMessage> {
  /** Across every message, whatever the filters. */
  counts: { new: number; handled: number };
}

export interface AdminContactMessagesService {
  /** GET /admin/contact-messages: waiting messages oldest first. */
  list(query?: ContactMessagesQuery): Promise<ContactMessagesPage>;
  /** PATCH /admin/contact-messages/:id/handled */
  setHandled(id: string, handled: boolean): Promise<AdminContactMessage>;
  /** POST /admin/contact-messages/:id/reply: send reply email directly to sender. */
  reply(
    id: string,
    payload: { subject?: string; message: string }
  ): Promise<AdminContactMessage>;
  /** DELETE /admin/contact-messages/:id: for a deletion request or spam. */
  remove(id: string): Promise<void>;
}
