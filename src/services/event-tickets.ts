import { apiClient, type ApiError } from "@/lib/api-client";
import type {
  AdminOrganizerList,
  ApplyOrganizerInput,
  AttendanceStats,
  AttendeeRow,
  CheckInResult,
  CreateEventInput,
  EventDashboard,
  EventItem,
  MyTicket,
  OrganizerApplication,
  OrganizerStatus,
  Paginated,
  TierInput,
  UpdateEventInput,
} from "@/types/event-ticketing";

// ============================================================
// EVENT TICKETING API
//
// Every call goes to the NestJS events / organizer / admin
// endpoints. Failures throw the ApiError from the client so
// TanStack Query surfaces the backend's message (for example
// "Insufficient wallet balance" or "This ticket type is sold out").
// ============================================================

async function unwrap<T>(
  request: Promise<{ data: T; error: ApiError | null }>
): Promise<T> {
  const { data, error } = await request;
  if (error) throw error;
  return data;
}

function query(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") qs.set(key, String(value));
  }
  const text = qs.toString();
  return text ? `?${text}` : "";
}

// ── Discover / details ────────────────────────────────────────

export interface ListEventsParams {
  campusId?: string;
  categoryId?: string;
  q?: string;
  when?: "today" | "week" | "month";
  page?: number;
  limit?: number;
}

export function listEventsApi(
  params: ListEventsParams = {}
): Promise<Paginated<EventItem>> {
  return unwrap(
    apiClient.get<Paginated<EventItem>>(`/events${query({ limit: 20, ...params })}`)
  );
}

export function getEventApi(id: string): Promise<EventItem> {
  return unwrap(apiClient.get<EventItem>(`/events/${id}`));
}

// ── Tickets ───────────────────────────────────────────────────

export function purchaseTicketApi(
  eventId: string,
  tierId: string
): Promise<MyTicket> {
  return unwrap(
    apiClient.post<{ tierId: string }, MyTicket>(`/events/${eventId}/tickets`, {
      tierId,
    })
  );
}

export function listMyTicketsApi(): Promise<Paginated<MyTicket>> {
  return unwrap(apiClient.get<Paginated<MyTicket>>("/me/tickets?limit=50"));
}

export function getMyTicketApi(id: string): Promise<MyTicket> {
  return unwrap(apiClient.get<MyTicket>(`/me/tickets/${id}`));
}

// ── Organizer application ─────────────────────────────────────

export function getOrganizerStatusApi(): Promise<OrganizerStatus> {
  return unwrap(apiClient.get<OrganizerStatus>("/organizer/me"));
}

export function applyOrganizerApi(
  input: ApplyOrganizerInput
): Promise<OrganizerApplication> {
  return unwrap(
    apiClient.post<ApplyOrganizerInput, OrganizerApplication>(
      "/organizer/apply",
      input
    )
  );
}

// ── Organizer tools ───────────────────────────────────────────

export function listMyEventsApi(): Promise<Paginated<EventItem>> {
  return unwrap(apiClient.get<Paginated<EventItem>>("/events/mine?limit=50"));
}

export function getManagedEventApi(id: string): Promise<EventItem> {
  return unwrap(apiClient.get<EventItem>(`/events/${id}/manage`));
}

export function createEventApi(input: CreateEventInput): Promise<EventItem> {
  return unwrap(apiClient.post<CreateEventInput, EventItem>("/events", input));
}

export function updateEventApi(
  id: string,
  input: UpdateEventInput
): Promise<EventItem> {
  return unwrap(
    apiClient.patch<UpdateEventInput, EventItem>(`/events/${id}`, input)
  );
}

export async function cancelEventApi(id: string): Promise<void> {
  const { error } = await apiClient.delete(`/events/${id}`);
  if (error) throw error;
}

export function addTierApi(id: string, tier: TierInput): Promise<EventItem> {
  return unwrap(apiClient.post<TierInput, EventItem>(`/events/${id}/tiers`, tier));
}

export function updateTierApi(
  id: string,
  tierId: string,
  patch: Partial<TierInput>
): Promise<EventItem> {
  return unwrap(
    apiClient.patch<Partial<TierInput>, EventItem>(
      `/events/${id}/tiers/${tierId}`,
      patch
    )
  );
}

export function removeTierApi(id: string, tierId: string): Promise<EventItem> {
  return unwrap(apiClient.delete<EventItem>(`/events/${id}/tiers/${tierId}`));
}

export function getEventDashboardApi(id: string): Promise<EventDashboard> {
  return unwrap(apiClient.get<EventDashboard>(`/events/${id}/dashboard`));
}

export function listAttendeesApi(
  id: string,
  params: { q?: string; page?: number; limit?: number } = {}
): Promise<Paginated<AttendeeRow>> {
  return unwrap(
    apiClient.get<Paginated<AttendeeRow>>(
      `/events/${id}/attendees${query({ limit: 20, ...params })}`
    )
  );
}

export function getAttendanceApi(id: string): Promise<AttendanceStats> {
  return unwrap(apiClient.get<AttendanceStats>(`/events/${id}/attendance`));
}

export function exportAttendanceApi(
  id: string
): Promise<{ filename: string; csv: string }> {
  return unwrap(
    apiClient.get<{ filename: string; csv: string }>(
      `/events/${id}/attendance/export`
    )
  );
}

export function checkInApi(
  id: string,
  input: { code?: string; ticketNumber?: string }
): Promise<CheckInResult> {
  return unwrap(
    apiClient.post<typeof input, CheckInResult>(`/events/${id}/checkin`, input)
  );
}

export function settleEventApi(
  id: string
): Promise<{ released: number; settledAt: string }> {
  return unwrap(
    apiClient.post<undefined, { released: number; settledAt: string }>(
      `/events/${id}/settle`
    )
  );
}

// ── Admin: organizer applications ─────────────────────────────

export function listOrganizerApplicationsApi(params: {
  status?: string;
  q?: string;
  page?: number;
  limit?: number;
}): Promise<AdminOrganizerList> {
  return unwrap(
    apiClient.get<AdminOrganizerList>(
      `/admin/event-organizers${query({ limit: 20, ...params })}`
    )
  );
}

export function approveOrganizerApi(id: string, note?: string) {
  return unwrap(
    apiClient.post<{ note?: string }, unknown>(
      `/admin/event-organizers/${id}/approve`,
      { note }
    )
  );
}

export function rejectOrganizerApi(id: string, reason: string) {
  return unwrap(
    apiClient.post<{ reason: string }, unknown>(
      `/admin/event-organizers/${id}/reject`,
      { reason }
    )
  );
}

export function suspendOrganizerApi(id: string, reason: string) {
  return unwrap(
    apiClient.post<{ reason: string }, unknown>(
      `/admin/event-organizers/${id}/suspend`,
      { reason }
    )
  );
}

// ── Notifications (real, from the backend) ────────────────────

export interface BackendNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

export async function listEventNotificationsApi(): Promise<BackendNotification[]> {
  const page = await unwrap(
    apiClient.get<{ items: BackendNotification[] }>(
      "/notifications?type=EVENT&limit=50"
    )
  );
  return page.items ?? [];
}

export async function markServerNotificationReadApi(id: string): Promise<void> {
  await apiClient.patch(`/notifications/${id}/read`);
}

export async function markAllServerNotificationsReadApi(): Promise<void> {
  await apiClient.patch("/notifications/read-all");
}
