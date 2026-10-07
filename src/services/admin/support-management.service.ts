import { AdminActingContext, Paginated, SupportAssignInput, SupportAssignee, SupportEscalateInput, SupportRespondInput, SupportSetPriorityInput, SupportSetStatusInput, SupportTicket, SupportTicketDetail, SupportTicketListQuery, SupportTicketMetrics } from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/support/tickets)
//
// Ticket operations are privilege-gated exactly like the other
// management consoles:
//   - CAMPUS_ADMIN operators are READ-ONLY and campus-scoped (their
//     list, detail and metrics never cross campus boundaries).
//   - respond / note / assign / setStatus / setPriority / escalate
//     are restricted to SUPER_ADMIN/ADMIN.
// The service enforces these checks itself — the UI merely reflects
// them. Every successful mutation writes an audit row (Module 48)
// and customer-visible replies dispatch a real in-app notification
// (Module 26A) so the requester's notification center updates live.
//
// Internal notes are NEVER sent to the customer: they are stored with
// visibility "internal" and excluded from every customer-facing path.
// ------------------------------------------------------------

export interface AdminSupportManagementService {
  list(
    query?: SupportTicketListQuery,
    ctx?: AdminActingContext
  ): Promise<Paginated<SupportTicket>>;
  getById(
    id: string,
    ctx?: AdminActingContext
  ): Promise<SupportTicketDetail | null>;
  getMetrics(ctx?: AdminActingContext): Promise<SupportTicketMetrics>;
  getAssignableStaff(ctx?: AdminActingContext): Promise<SupportAssignee[]>;
  respond(
    id: string,
    input: SupportRespondInput,
    ctx: AdminActingContext
  ): Promise<SupportTicket>;
  addInternalNote(
    id: string,
    note: string,
    ctx: AdminActingContext
  ): Promise<SupportTicket>;
  assign(
    id: string,
    input: SupportAssignInput,
    ctx: AdminActingContext
  ): Promise<SupportTicket>;
  setStatus(
    id: string,
    input: SupportSetStatusInput,
    ctx: AdminActingContext
  ): Promise<SupportTicket>;
  setPriority(
    id: string,
    input: SupportSetPriorityInput,
    ctx: AdminActingContext
  ): Promise<SupportTicket>;
  escalate(
    id: string,
    input: SupportEscalateInput,
    ctx: AdminActingContext
  ): Promise<SupportTicket>;
}

export type { AdminActingContext } from "@/types/admin";