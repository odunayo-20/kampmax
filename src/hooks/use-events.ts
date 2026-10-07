"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  eventKeys,
  organizerKeys,
  ticketKeys,
} from "@/lib/query-keys";
import {
  addTierApi,
  applyOrganizerApi,
  approveOrganizerApi,
  cancelEventApi,
  checkInApi,
  createEventApi,
  exportAttendanceApi,
  getAttendanceApi,
  getEventApi,
  getEventDashboardApi,
  getManagedEventApi,
  getMyTicketApi,
  getOrganizerStatusApi,
  listAttendeesApi,
  listEventsApi,
  listMyEventsApi,
  listMyTicketsApi,
  listOrganizerApplicationsApi,
  purchaseTicketApi,
  rejectOrganizerApi,
  removeTierApi,
  settleEventApi,
  suspendOrganizerApi,
  updateEventApi,
  updateTierApi,
  type ListEventsParams,
} from "@/services/event-tickets";
import type {
  ApplyOrganizerInput,
  CreateEventInput,
  TierInput,
  UpdateEventInput,
} from "@/types/event-ticketing";

// ── Student: discover, details, tickets ───────────────────────

export function useEvents(params: ListEventsParams = {}) {
  return useQuery({
    queryKey: eventKeys.list({
      campusId: params.campusId,
      q: params.q,
      when: params.when,
      categoryId: params.categoryId,
      limit: params.limit ? String(params.limit) : undefined,
    }),
    queryFn: () => listEventsApi(params),
    select: (page) => page.items,
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: eventKeys.detail(id),
    queryFn: () => getEventApi(id),
    enabled: Boolean(id),
  });
}

export function useMyTickets() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: ticketKeys.mine(userId),
    queryFn: listMyTicketsApi,
    enabled: Boolean(userId),
    select: (page) => page.items,
  });
}

export function useMyTicket(id: string) {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: ticketKeys.detail(userId, id),
    queryFn: () => getMyTicketApi(id),
    enabled: Boolean(userId && id),
  });
}

/** Buys a ticket. Refreshes seat counts, "my tickets" and (for paid tiers) the wallet. */
export function usePurchaseTicket(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (tierId: string) => purchaseTicketApi(eventId, tierId),
    onSuccess: () => {
      // The backend writes the confirmation notifications a moment after the
      // purchase commits; refresh the feed shortly after.
      window.setTimeout(() => {
        queryClient.removeQueries({ queryKey: ["notifications", "feed"] });
        queryClient.invalidateQueries({ queryKey: ["notifications"] });
      }, 1500);
      queryClient.invalidateQueries({ queryKey: eventKeys.all });
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

// ── Organizer application ─────────────────────────────────────

export function useOrganizerStatus() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: organizerKeys.status(userId),
    queryFn: getOrganizerStatusApi,
    enabled: Boolean(userId),
  });
}

export function useApplyOrganizer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApplyOrganizerInput) => applyOrganizerApi(input),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: organizerKeys.all }),
  });
}

// ── Organizer tools ───────────────────────────────────────────

export function useMyEvents() {
  const { user } = useAuth();
  const userId = user?.id ?? "";
  return useQuery({
    queryKey: organizerKeys.events(userId),
    queryFn: listMyEventsApi,
    enabled: Boolean(userId),
    select: (page) => page.items,
  });
}

export function useManagedEvent(id: string) {
  return useQuery({
    queryKey: organizerKeys.event(id),
    queryFn: () => getManagedEventApi(id),
    enabled: Boolean(id),
  });
}

export function useEventDashboard(id: string) {
  return useQuery({
    queryKey: organizerKeys.dashboard(id),
    queryFn: () => getEventDashboardApi(id),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useAttendees(id: string, q: string, page: number) {
  return useQuery({
    queryKey: organizerKeys.attendees(id, q, page),
    queryFn: () => listAttendeesApi(id, { q, page, limit: 20 }),
    enabled: Boolean(id),
    placeholderData: (previous) => previous,
  });
}

export function useAttendance(id: string) {
  return useQuery({
    queryKey: organizerKeys.attendance(id),
    queryFn: () => getAttendanceApi(id),
    enabled: Boolean(id),
    refetchInterval: 15_000,
  });
}

function useInvalidateOrganizer() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: organizerKeys.all });
    queryClient.invalidateQueries({ queryKey: eventKeys.all });
  };
}

export function useCreateEvent() {
  const invalidate = useInvalidateOrganizer();
  return useMutation({
    mutationFn: (input: CreateEventInput) => createEventApi(input),
    onSuccess: invalidate,
  });
}

export function useUpdateEvent(id: string) {
  const invalidate = useInvalidateOrganizer();
  return useMutation({
    mutationFn: (input: UpdateEventInput) => updateEventApi(id, input),
    onSuccess: invalidate,
  });
}

export function useCancelEvent(id: string) {
  const invalidate = useInvalidateOrganizer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => cancelEventApi(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    },
  });
}

export function useTierMutations(id: string) {
  const invalidate = useInvalidateOrganizer();
  return {
    add: useMutation({
      mutationFn: (tier: TierInput) => addTierApi(id, tier),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: (v: { tierId: string; patch: Partial<TierInput> }) =>
        updateTierApi(id, v.tierId, v.patch),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (tierId: string) => removeTierApi(id, tierId),
      onSuccess: invalidate,
    }),
  };
}

export function useCheckIn(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { code?: string; ticketNumber?: string }) =>
      checkInApi(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: organizerKeys.dashboard(id) });
      queryClient.invalidateQueries({ queryKey: organizerKeys.attendance(id) });
      queryClient.invalidateQueries({ queryKey: ["organizer", "attendees", id] });
    },
  });
}

export function useSettleEvent(id: string) {
  const invalidate = useInvalidateOrganizer();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => settleEventApi(id),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["wallet"] });
    },
  });
}

export function useExportAttendance(id: string) {
  return useMutation({ mutationFn: () => exportAttendanceApi(id) });
}

// ── Admin ─────────────────────────────────────────────────────

export function useOrganizerApplications(filters: {
  status?: string;
  q?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: organizerKeys.adminApplications(filters),
    queryFn: () => listOrganizerApplicationsApi(filters),
    placeholderData: (previous) => previous,
  });
}

export function useReviewOrganizer() {
  const queryClient = useQueryClient();
  const done = () =>
    queryClient.invalidateQueries({ queryKey: organizerKeys.all });
  return {
    approve: useMutation({
      mutationFn: (v: { id: string; note?: string }) =>
        approveOrganizerApi(v.id, v.note),
      onSuccess: done,
    }),
    reject: useMutation({
      mutationFn: (v: { id: string; reason: string }) =>
        rejectOrganizerApi(v.id, v.reason),
      onSuccess: done,
    }),
    suspend: useMutation({
      mutationFn: (v: { id: string; reason: string }) =>
        suspendOrganizerApi(v.id, v.reason),
      onSuccess: done,
    }),
  };
}
