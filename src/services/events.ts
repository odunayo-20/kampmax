import { apiClient } from "@/lib/api-client";
import { CampusEvent } from "@/types";
import {
  events as mockEvents,
  getEventsByCampus as _getEventsByCampus,
  getEventById as _getEventById,
  getUpcomingEvents as _getUpcomingEvents,
} from "@/data/events";

export async function getEventsApi(campusId: string): Promise<CampusEvent[]> {
  const { data, error } = await apiClient.get<CampusEvent[]>(`/events?campusId=${campusId}`);
  if (!error && Array.isArray(data)) {
    return data;
  }
  return getEvents(campusId);
}

export async function attendEventApi(eventId: string, userId: string): Promise<void> {
  const { error } = await apiClient.post(`/events/${eventId}/attend`);
  attendEvent(eventId, userId);
}

export async function unattendEventApi(eventId: string, userId: string): Promise<void> {
  const { error } = await apiClient.post(`/events/${eventId}/unattend`);
  unattendEvent(eventId, userId);
}

export function getEvents(campusId: string): CampusEvent[] {
  return _getEventsByCampus(campusId);
}

export function getEventById(id: string): CampusEvent | undefined {
  return _getEventById(id);
}

export function getUpcomingEvents(campusId: string): CampusEvent[] {
  return _getUpcomingEvents(campusId);
}

export function attendEvent(eventId: string, userId: string): void {
  const event = mockEvents.find((e) => e.id === eventId);
  if (event && !event.attendees.includes(userId)) {
    event.attendees.push(userId);
  }
}

export function unattendEvent(eventId: string, userId: string): void {
  const event = mockEvents.find((e) => e.id === eventId);
  if (event) {
    event.attendees = event.attendees.filter((id) => id !== userId);
  }
}
