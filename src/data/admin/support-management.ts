// ============================================================
// SUPPORT / CUSTOMER SERVICE DATASET (Module 56)
// ============================================================
//
// Deterministic seed dataset for the /admin/support console.
// Tickets reference REAL users, orders, vendors and jobs from the
// existing stores (same identity space as /admin/users, /admin/orders,
// /admin/marketplace and /admin/jobs), so every related-resource link
// on the detail page resolves to a live admin page.
//
// NO real ticket data exists in this prototype (there is no backend -
// see KAMPUSMAX_SUPPORT_BACKEND_GAPS.md). This file is the prototype's
// single swap point: a future NestJS support module returns the same
// DTO shapes and the factory in support-management.service.ts replaces
// the store reads with HTTP calls. Metrics are DERIVED from the ticket
// store, never hardcoded statistics.
// ============================================================

import {
  SupportAttachmentKind,
  SupportMessageVisibility,
  SupportPostedBy,
  SupportStaffRole,
  SupportTicket,
  SupportTicketCategory,
  SupportTicketPriority,
  SupportTicketStatus,
  SupportTimelineEvent,
  SupportMessage,
} from "@/types/admin";
import { mockOrders } from "./commerce";
import { mockUsers, mockAdmins } from "./people";
import { mockCampuses, getCampusShortName } from "./campuses";
import { daysAgoIso, intBetween, pick, seededRandom } from "@/lib/admin/api";

// ------------------------------------------------------------
// REFERENCE TABLES (real stores - identity space shared with
// /admin/users, /admin/orders, /admin/vendors, /admin/jobs, /admin/disputes)
// ------------------------------------------------------------

/** Platform support operations team = ADMIN/SUPER_ADMIN staff registry. */
export const SUPPORT_STAFF: { id: string; name: string; role: SupportStaffRole; team: string }[] =
  mockAdmins
    .filter((a) => a.role === "SUPER_ADMIN" || a.role === "ADMIN")
    .map((a) => ({
      id: a.id,
      name: a.name,
      role: a.role as SupportStaffRole,
      team: a.title ?? "Support",
    }));

const CUSTOMER_KIND_TO_ROLE: Record<string, SupportTicket["customer"]["role"]> = {
  student: "customer",
  vendor: "vendor",
};

/** Bucketed so every status is represented: open x4, pending x3,
 *  in_progress x4, waiting_on_customer x3, resolved x3, closed x3. */
const TICKET_STATUS_PATTERN: SupportTicketStatus[] = [
  "open", "pending", "in_progress", "resolved", "open",
  "waiting_on_customer", "closed", "in_progress", "open", "pending",
  "resolved", "waiting_on_customer", "in_progress", "open", "closed",
  "pending", "in_progress", "waiting_on_customer", "resolved", "closed",
];

const PRIORITY_PATTERN: SupportTicketPriority[] = [
  "normal", "low", "high", "normal", "urgent",
  "normal", "low", "high", "normal", "high",
  "low", "urgent", "normal", "high", "normal",
  "low", "normal", "high", "normal", "low",
];

const CATEGORY_PATTERN: SupportTicketCategory[] = [
  "marketplace", "payments", "account", "marketplace", "payments",
  "verification", "account", "technical", "marketplace", "freelancer",
  "service_provider", "payments", "account", "marketplace", "employer",
  "verification", "technical", "payments", "marketplace", "account",
];

const SUBJECTS: readonly string[] = [
  "Order marked delivered but never arrived",
  "Refund not received for cancelled order",
  "Cannot log in to my account",
  "Wallet debited twice for one order",
  "Wrong item delivered",
  "How do I update my bank details for sellouts?",
  "Vendor not responding after payment",
  "App keeps signing me out",
  "Delivery to hostel was refused by rider",
  "Freelancer proposal withdrawn by mistake",
  "Service provider not showing verified badge",
  "Card charged but order shows unpaid",
  "Reset my password",
  "Hot meal arrived cold and damaged",
  "Employer wants off-platform communication",
  "National ID verification taking too long",
  "Push notifications not arriving",
  "Promo discount missing at checkout",
  "Delivery address change after dispatch",
  "Account suspended, need help",
];

const DESCRIPTIONS: readonly string[] = [
  "I placed this order last week and the tracking shows delivered, but I never received it at my hostel.",
  "I cancelled the order within the allowed window and the funds have not been returned to my wallet.",
  "The mobile app logs me out and then the login page just spins.",
  "I was charged twice for a single order and only one order was created.",
  "The package I received is a different item from what I ordered.",
  "I need help updating the payout bank details on my store profile.",
  "I paid for an order but the vendor has not responded or dispatched for days.",
  "The app crashes and signs me out whenever I open the chat tab.",
  "The rider refused to drop off at my hostel and returned the order.",
  "I accidentally withdrew my proposal and now it is gone.",
  "My service profile does not show the verified badge even after approval.",
  "The payment page shows my card was charged but the order is unpaid.",
  "I cannot remember my password and the reset email never arrives.",
  "The package contents arrived damaged and the vendor won't reply.",
  "An employer asked me to continue work outside the platform - is that allowed?",
  "I uploaded my National ID days ago and verification is still pending.",
  "Notifications stopped arriving on my device after the last update.",
  "A promo code discount was not applied even though it was active.",
  "I need to change the delivery address after the order was dispatched.",
  "My account was suspended while I was trying to resolve a payment issue.",
];

// ------------------------------------------------------------
// DATASET BUILDER
// ------------------------------------------------------------

export interface SupportDataset {
  tickets: SupportTicket[];
  descriptions: Map<string, string>;
  messages: Map<string, SupportMessage[]>;
  timeline: Map<string, SupportTimelineEvent[]>;
}

/** Builds the deterministic support dataset once per store instance. */
export function buildSupportDataset(): SupportDataset {
  const rand = seededRandom(5601);
  const data: SupportDataset = {
    tickets: [],
    descriptions: new Map(),
    messages: new Map(),
    timeline: new Map(),
  };

  const assignees = SUPPORT_STAFF;

  for (let i = 0; i < TICKET_STATUS_PATTERN.length; i++) {
    const status = TICKET_STATUS_PATTERN[i];
    const priority = PRIORITY_PATTERN[i];
    const category = CATEGORY_PATTERN[i];

    const order = mockOrders[(i * 7 + 3) % mockOrders.length];
    const user =
      mockUsers.find((u) => u.id === order.customerId) ??
      pick(rand, mockUsers);

    const customerName = user.name;
    const customerRole = CUSTOMER_KIND_TO_ROLE[user.kind] ?? "customer";
    const campusId = user.campusId;
    const campusName = getCampusShortName(campusId) ?? null;

    const createdDaysAgo = intBetween(rand, 0, 24);
    const createdAt = daysAgoIso(rand, createdDaysAgo);
    const escalated = status === "open" && priority === "urgent" && rand() > 0.5;

    const assigned = !["closed"].includes(status) && rand() > 0.25;
    const assignee = assigned ? pick(rand, assignees) : null;
    const assigneeName = assignee ? assignee.name : null;

    const subject = SUBJECTS[i % SUBJECTS.length];
    const description = DESCRIPTIONS[i % DESCRIPTIONS.length];

    const respondedAt =
      status === "resolved" || status === "closed" || status === "in_progress"
        ? daysAgoIso(rand, Math.max(0, createdDaysAgo - intBetween(rand, 0, 3)))
        : null;

    const updatedAt = daysAgoIso(
      rand,
      Math.max(0, createdDaysAgo - intBetween(rand, 0, 4))
    );

    const ticket: SupportTicket = {
      id: `tkt-${String(i + 1).padStart(3, "0")}`,
      subject,
      status,
      priority,
      category,
      customer: {
        id: user.id,
        name: customerName,
        role: customerRole,
        campusId,
        campusName,
        joinedAt: user.joinedAt,
        isVerified: user.isVerified,
      },
      assigneeId: assignee ? assignee.id : null,
      assigneeName,
      relatedResource:
        category === "freelancer" || category === "employer"
          ? { type: "job", id: order.id, label: `Order ${order.id}`, href: `/admin/orders/${order.id}` }
          : category === "payments"
            ? { type: "transaction", id: order.id, label: `Transaction ${order.id}`, href: `/admin/transactions/${order.id}` }
            : { type: "order", id: order.id, label: `Order ${order.id}`, href: `/admin/orders/${order.id}` },
      escalated,
      escalation: null,
      createdAt,
      updatedAt,
      lastResponseAt: respondedAt,
      reopenedAt: null,
    };
    data.tickets.push(ticket);
    data.descriptions.set(ticket.id, description);

    // ----- message thread (open -> recent) -----
    const threadLength = intBetween(rand, 1, 3);
    const messages: SupportMessage[] = [];
    let cursor = createdAt;
    const bodies: Record<SupportPostedBy, readonly string[]> = {
      customer: [
        "Please help, I have been waiting for days.",
        "I can share a screenshot if that helps.",
        "Any update on my case?",
      ],
      support: [
        "Hi, thanks for reaching out. Could you confirm the details on the ticket?",
        "We are looking into this and will update you shortly.",
        "We have passed this to the relevant team for review.",
      ],
    };
    messages.push({
      id: `tkt-${i + 1}-m1`,
      ticketId: ticket.id,
      postedBy: "customer",
      authorName: customerName,
      visibility: "customer",
      body: bodies.customer[0],
      attachments: [],
      at: createdAt,
    });
    if (threadLength > 1) {
      for (let m = 1; m < threadLength; m++) {
        const support = m % 2 === 1 || rand() > 0.5;
        cursor = daysAgoIso(rand, 0);
        messages.push({
          id: `tkt-${i + 1}-m${m + 1}`,
          ticketId: ticket.id,
          postedBy: support ? "support" : "customer",
          authorName: support ? assigneeName ?? "Kampmax Support" : customerName,
          visibility: support ? "customer" : "customer",
          body: support ? bodies.support[m % bodies.support.length] : bodies.customer[m % bodies.customer.length],
          attachments: [],
          at: cursor,
        });
      }
    }
    data.messages.set(ticket.id, messages);

    // ----- timeline (oldest -> newest) -----
    const timeline: SupportTimelineEvent[] = [
      {
        id: `tkt-${i + 1}-e1`,
        ticketId: ticket.id,
        kind: "created",
        label: "Ticket created",
        detail: `Opened by ${customerName} (${category})`,
        actorName: customerName,
        at: createdAt,
      },
    ];
    if (assignee) {
      timeline.push({
        id: `tkt-${i + 1}-e2`,
        ticketId: ticket.id,
        kind: "assigned",
        label: "Assigned to agent",
        detail: `Assigned to ${assignee.name}`,
        actorName: assignee.name,
        at: updatedAt,
      });
    }
    if (respondedAt) {
      timeline.push({
        id: `tkt-${i + 1}-e3`,
        ticketId: ticket.id,
        kind: "responded",
        label: "Agent response",
        detail: assigneeName ?? "Kampmax Support",
        actorName: assigneeName ?? "Kampmax Support",
        at: respondedAt,
      });
    }
    data.timeline.set(ticket.id, timeline);
  }

  return data;
}

/** Number of distinct support categories present in the dataset. */
export const SUPPORT_CATEGORIES: readonly SupportTicketCategory[] = [
  "account",
  "marketplace",
  "payments",
  "freelancer",
  "service_provider",
  "employer",
  "verification",
  "technical",
  "other",
];

/** Allowed attachment kinds surfaced in the console. */
export const SUPPORT_ATTACHMENT_KINDS: readonly SupportAttachmentKind[] = [
  "image",
  "pdf",
  "document",
  "other",
];

/** Allowed message visibilities — internal notes never leak to customers. */
export const SUPPORT_MESSAGE_VISIBILITIES: readonly SupportMessageVisibility[] = [
  "customer",
  "internal",
];

export const SUPPORT_DAY_MS = 24 * 60 * 60 * 1000;

export { mockCampuses };