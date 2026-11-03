import { apiClient, type ApiError } from "@/lib/api-client";
import type { MilestoneStatus } from "@/services/jobs";

// ============================================================
// TIMESHEETS — LIVE API LAYER (hourly contracts)
// ============================================================
//   GET    /engagements/:id/timesheet[?week=n]   either party reads a week
//   POST   /engagements/:id/time-entries         freelancer logs time
//   DELETE /engagements/:id/time-entries/:entry  freelancer removes an entry
//
// Every rule is enforced by the backend (the funded window, the daily and
// weekly limits, who may log, and when). This layer only carries requests.

export interface TimeEntry {
  id: string;
  /** The day the work was done (YYYY-MM-DD). */
  workDate: string;
  minutes: number;
  note: string;
  createdAt: string;
}

/** One billing week of an hourly contract, with the time logged in it. */
export interface Timesheet {
  engagementId: string;
  hourlyRate: number;
  weeklyHourLimit: number;
  week: {
    position: number;
    title: string;
    status: MilestoneStatus;
    /** The seven days time can be logged; null until the week is funded. */
    periodStart: string | null;
    periodEnd: string | null;
    loggedMinutes: number;
    limitMinutes: number;
    /** What the hours logged so far are worth at the contract's rate. */
    worth: number;
    /** The most the week can cost: what is (or will be) held in escrow. */
    capAmount: number;
    /** What was actually paid, once the week is settled. */
    paidAmount: number | null;
  };
  entries: TimeEntry[];
  /** True when the viewer is the freelancer and the week is open for time. */
  canEdit: boolean;
}

export interface LogTimeInput {
  workDate: string;
  minutes: number;
  note?: string;
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

export const fetchTimesheet = (engagementId: string, week?: number) =>
  unwrap(apiClient.get<Timesheet>(`/engagements/${engagementId}/timesheet${week ? `?week=${week}` : ""}`));

export const logTimeApi = (engagementId: string, input: LogTimeInput) =>
  unwrap(apiClient.post<LogTimeInput, Timesheet>(`/engagements/${engagementId}/time-entries`, input));

export const deleteTimeEntryApi = (engagementId: string, entryId: string) =>
  unwrap(apiClient.delete<Timesheet>(`/engagements/${engagementId}/time-entries/${entryId}`));
