// ============================================================
// EVENT TICKETING DOMAIN TYPES
//
// Mirrors the NestJS events module (EventResponse, TicketResponse, ...).
// Dates arrive as ISO strings; amounts are naira numbers.
// The backend is the authority for every status, price and seat count.
// ============================================================

export interface EventTier {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  sold: number;
  remaining: number;
  /** Few seats left - shown as a "Limited" badge. */
  isLimited: boolean;
  soldOut: boolean;
}

export type EventStatus = "ACTIVE" | "CANCELLED";

export interface EventItem {
  id: string;
  campusId: string;
  organizerId: string;
  organizerName: string;
  organizationName: string | null;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  endsAt: string;
  coverImageUrl: string | null;
  capacity: number | null;
  isFeatured: boolean;
  status: EventStatus;
  category: { id: string; name: string; slug: string } | null;
  attendeeCount: number;
  ticketsSold: number;
  seatsLeft: number;
  minPrice: number;
  serviceFee: number;
  tiers: EventTier[];
  attending: boolean;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export type TicketStatus = "VALID" | "USED" | "REFUNDED";

export interface MyTicket {
  id: string;
  ticketNumber: string;
  status: TicketStatus;
  tier: { id: string; name: string };
  price: number;
  serviceFee: number;
  total: number;
  paymentReference: string | null;
  checkedInAt: string | null;
  /** Text encoded in the QR code. */
  qrPayload: string;
  holderName: string;
  event: {
    id: string;
    title: string;
    location: string;
    startsAt: string;
    endsAt: string;
    coverImageUrl: string | null;
    status: EventStatus;
    organizerName: string;
  };
  createdAt: string;
}

// ── Organizer application ─────────────────────────────────────

export type OrganizerApplicationStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "SUSPENDED";

export interface OrganizerApplication {
  id: string;
  status: OrganizerApplicationStatus;
  campusId: string;
  organizationName: string;
  description: string;
  proofUrl: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface OrganizerStatus {
  isOrganizer: boolean;
  application: OrganizerApplication | null;
}

export interface ApplyOrganizerInput {
  campusId: string;
  organizationName: string;
  description: string;
  proofUrl?: string;
}

// ── Organizer tools ───────────────────────────────────────────

export interface TierInput {
  name: string;
  description?: string;
  price: number;
  quantity: number;
}

export interface CreateEventInput {
  campusId: string;
  title: string;
  description?: string;
  location: string;
  startsAt: string;
  endsAt?: string;
  categoryId?: string;
  coverImageUrl?: string;
  capacity?: number;
  tiers?: TierInput[];
}

export type UpdateEventInput = Partial<
  Omit<CreateEventInput, "campusId" | "tiers">
>;

export interface EventDashboard {
  event: {
    id: string;
    title: string;
    location: string;
    startsAt: string;
    endsAt: string;
    coverImageUrl: string | null;
    status: EventStatus;
    capacity: number | null;
  };
  capacity: number;
  ticketsSold: number;
  paid: number;
  free: number;
  checkedIn: number;
  refunded: number;
  revenue: {
    gross: number;
    serviceFees: number;
    net: number;
    settled: boolean;
    settledAt: string | null;
    canSettle: boolean;
  };
  tiers: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
    sold: number;
    revenue: number;
  }>;
}

export interface AttendeeRow {
  id: string;
  ticketNumber: string;
  avatar: string | null;
  name: string;
  tierName: string;
  price: number;
  payment: "PAID" | "FREE";
  attendance: "CHECKED_IN" | "NOT_YET";
  checkedInAt: string | null;
  createdAt: string;
}

export interface AttendanceStats {
  total: number;
  checkedIn: number;
  notYet: number;
  percentage: number;
  timeline: Array<{ at: string; count: number }>;
}

export interface CheckInResult {
  result: "APPROVED";
  ticketNumber: string;
  holderName: string;
  holderAvatar: string | null;
  eventTitle: string;
  tierName: string;
  checkedInAt: string;
}

// ── Admin review ──────────────────────────────────────────────

export interface AdminOrganizerRow {
  id: string;
  userId: string;
  campusId: string;
  campusName: string | null;
  organizationName: string;
  description: string;
  proofUrl: string | null;
  status: OrganizerApplicationStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  applicantName: string;
  applicantEmail: string;
}

export interface AdminOrganizerList extends Paginated<AdminOrganizerRow> {
  counts: Record<OrganizerApplicationStatus, number>;
}
