/**
 * Rules for publishing an event, matching the mobile app. The limits mirror the backend's
 * CreateEventDto and TicketTierInputDto (title 3-150, venue 2-200, description up to 3000, up to 6
 * ticket types, price 0 to 1,000,000 naira with at most two decimals, quantity 1 to 100,000, and the
 * ticket quantities may not exceed the capacity), so a request the server would refuse is caught first.
 *
 * Publishing is not idempotent: sending POST /events again after it went through makes a second event.
 * So a failure is sorted into "refused" (safe to fix and resend) and "unclear" (no answer: it may exist),
 * and the organizer's own events are checked for a likely copy before anything is sent.
 */

import type { CreateEventInput, TierInput, UpdateEventInput } from "@/types/event-ticketing";

export const TITLE_MIN = 3;
export const TITLE_MAX = 150;
export const LOCATION_MIN = 2;
export const LOCATION_MAX = 200;
export const DESCRIPTION_MAX = 3000;
export const TIER_NAME_MIN = 2;
export const TIER_NAME_MAX = 80;
export const TIER_DESCRIPTION_MAX = 300;
export const MAX_TIERS = 6;
export const MAX_TICKET_PRICE = 1_000_000;
export const MAX_TIER_QUANTITY = 100_000;

export interface TierDraft {
  name: string;
  description: string;
  price: string;
  quantity: string;
}

export interface EventDraft {
  title: string;
  description: string;
  location: string;
  categoryId: string;
  /** `datetime-local` values: "2026-12-15T18:00". */
  startsAt: string;
  endsAt: string;
  capacity: string;
  tiers: TierDraft[];
}

export interface TierErrors {
  name?: string;
  description?: string;
  price?: string;
  quantity?: string;
}

export interface EventErrors {
  campus?: string;
  title?: string;
  description?: string;
  location?: string;
  startsAt?: string;
  endsAt?: string;
  capacity?: string;
  tiers?: string;
  tier?: (TierErrors | undefined)[];
}

const squash = (s: string) => s.trim().replace(/\s+/g, " ");
const naira = (n: number) => n.toLocaleString("en-NG");

/** "1500", "1,500", "₦1,500.50" or "" (free) to naira, kept to two decimals. Null if it isn't a price. */
export function parsePrice(input: string): number | null {
  const raw = input.trim().toLowerCase();
  if (raw === "" || raw === "free" || raw === "0") return 0;
  const cleaned = raw.replace(/[₦,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Math.round(Number(cleaned) * 100) / 100;
  return Number.isFinite(value) && value <= MAX_TICKET_PRICE ? value : null;
}

/** A whole number of tickets, 1 to 100,000. Null otherwise. */
export function parseQuantity(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, "");
  if (!/^\d{1,6}$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return n >= 1 && n <= MAX_TIER_QUANTITY ? n : null;
}

/** One ticket type's fields. `sold` stops the quantity going below what people already bought. */
export function validateTierDraft(
  draft: TierDraft,
  { sold = 0, otherNames = [] }: { sold?: number; otherNames?: string[] } = {}
): { ok: true; value: TierInput } | { ok: false; errors: TierErrors } {
  const errors: TierErrors = {};
  const name = squash(draft.name);
  if (name.length < TIER_NAME_MIN) errors.name = "Name this ticket type.";
  else if (name.length > TIER_NAME_MAX) errors.name = `Keep it under ${TIER_NAME_MAX} characters.`;
  else if (otherNames.some((other) => squash(other).toLowerCase() === name.toLowerCase())) {
    errors.name = "Two ticket types have the same name.";
  }

  const description = draft.description.trim();
  if (description.length > TIER_DESCRIPTION_MAX) errors.description = `Keep it under ${TIER_DESCRIPTION_MAX} characters.`;

  const price = parsePrice(draft.price);
  if (price === null) errors.price = `Enter a price from 0 to ${naira(MAX_TICKET_PRICE)}, with up to two decimals.`;
  const quantity = parseQuantity(draft.quantity);
  if (quantity === null) errors.quantity = `A whole number from 1 to ${naira(MAX_TIER_QUANTITY)}.`;
  else if (quantity < sold) errors.quantity = `${naira(sold)} already sold, so it can't go below that.`;

  if (Object.keys(errors).length > 0 || price === null || quantity === null) return { ok: false, errors };
  return { ok: true, value: { name, ...(description ? { description } : {}), price, quantity } };
}

export function validateEventDraft(
  draft: EventDraft,
  campusId: string | null | undefined,
  now: Date
): { ok: true; value: CreateEventInput & { tiers: TierInput[] } } | { ok: false; errors: EventErrors } {
  const errors: EventErrors = {};
  if (!campusId) errors.campus = "Choose your campus first.";

  const title = squash(draft.title);
  if (title.length < TITLE_MIN) errors.title = `Give your event a name (at least ${TITLE_MIN} characters).`;
  else if (title.length > TITLE_MAX) errors.title = `Keep the name under ${TITLE_MAX} characters.`;

  const location = squash(draft.location);
  if (location.length < LOCATION_MIN) errors.location = "Where is it happening?";
  else if (location.length > LOCATION_MAX) errors.location = `Keep the venue under ${LOCATION_MAX} characters.`;

  const description = draft.description.trim();
  if (description.length > DESCRIPTION_MAX) errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;

  const start = draft.startsAt ? new Date(draft.startsAt) : null;
  if (!start || Number.isNaN(start.getTime())) errors.startsAt = "Choose when the event starts.";
  else if (start.getTime() <= now.getTime()) errors.startsAt = "That time has already passed. Choose a future date and time.";

  const end = draft.endsAt ? new Date(draft.endsAt) : null;
  if (end && Number.isNaN(end.getTime())) errors.endsAt = "Choose a valid end time, or leave it empty.";
  else if (end && start && end.getTime() <= start.getTime()) errors.endsAt = "The event must end after it starts.";

  let capacity: number | undefined;
  if (draft.capacity.trim() !== "") {
    const c = parseQuantity(draft.capacity);
    if (c === null) errors.capacity = `Capacity must be a whole number from 1 to ${naira(MAX_TIER_QUANTITY)}, or empty.`;
    else capacity = c;
  }

  const tiers: TierInput[] = [];
  const tierErrors: (TierErrors | undefined)[] = [];
  if (draft.tiers.length === 0) errors.tiers = "Add at least one ticket type.";
  else if (draft.tiers.length > MAX_TIERS) errors.tiers = `An event can have at most ${MAX_TIERS} ticket types.`;
  draft.tiers.forEach((t, i) => {
    const result = validateTierDraft(t, { otherNames: draft.tiers.slice(0, i).map((x) => x.name) });
    if (result.ok) tiers.push(result.value);
    else tierErrors[i] = result.errors;
  });
  if (tierErrors.some(Boolean)) errors.tier = tierErrors;

  if (capacity !== undefined && tiers.length === draft.tiers.length) {
    const total = tiers.reduce((sum, t) => sum + t.quantity, 0);
    if (total > capacity) {
      errors.capacity = `Your ticket types add up to ${naira(total)}, which is more than the capacity of ${naira(capacity)}.`;
    }
  }

  if (Object.keys(errors).length > 0 || !campusId || !start) return { ok: false, errors };
  return {
    ok: true,
    value: {
      campusId,
      title,
      ...(description ? { description } : {}),
      location,
      startsAt: start.toISOString(),
      ...(end ? { endsAt: end.toISOString() } : {}),
      ...(draft.categoryId ? { categoryId: draft.categoryId } : {}),
      ...(capacity !== undefined ? { capacity } : {}),
      tiers,
    },
  };
}

// ---- editing a published event -------------------------------------------------

export interface EventEditDraft {
  title: string;
  description: string;
  location: string;
  categoryId: string;
  startsAt: string;
  endsAt: string;
  capacity: string;
  coverImageUrl: string;
}

export type EventEditErrors = EventErrors & { categoryId?: string };

/** ISO -> value for `<input type="datetime-local">` in the viewer's timezone. */
export function toLocalInput(iso: string | null | undefined): string {
  const d = new Date(iso ?? "");
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Only what changed is sent: an event that already started can't be "moved" to a past start, but
 * its title or venue can still be fixed. The server clears the end whenever the start changes
 * without one, so the two go together. A category or capacity can be changed but not removed.
 */
export function validateEventEdit(
  original: EventEditDraft & { ticketsSold: number },
  draft: EventEditDraft,
  now: Date
): { ok: true; patch: UpdateEventInput } | { ok: false; errors: EventEditErrors } {
  const errors: EventEditErrors = {};
  const patch: UpdateEventInput = {};

  const title = squash(draft.title);
  if (title.length < TITLE_MIN) errors.title = `The name needs at least ${TITLE_MIN} characters.`;
  else if (title.length > TITLE_MAX) errors.title = `Keep the name under ${TITLE_MAX} characters.`;
  else if (title !== squash(original.title)) patch.title = title;

  const location = squash(draft.location);
  if (location.length < LOCATION_MIN) errors.location = "Where is it happening?";
  else if (location.length > LOCATION_MAX) errors.location = `Keep the venue under ${LOCATION_MAX} characters.`;
  else if (location !== squash(original.location)) patch.location = location;

  const description = draft.description.trim();
  if (description.length > DESCRIPTION_MAX) errors.description = `Keep the description under ${DESCRIPTION_MAX} characters.`;
  else if (description !== original.description.trim()) patch.description = description;

  if (draft.categoryId !== original.categoryId) {
    if (draft.categoryId) patch.categoryId = draft.categoryId;
    else errors.categoryId = "A category can be changed but not removed.";
  }

  const startChanged = draft.startsAt !== original.startsAt;
  const start = draft.startsAt ? new Date(draft.startsAt) : null;
  if (!start) errors.startsAt = "Choose when the event starts.";
  else if (startChanged && start.getTime() <= now.getTime()) {
    errors.startsAt = "That time has already passed. Choose a future date and time.";
  } else if (startChanged) patch.startsAt = start.toISOString();

  const end = draft.endsAt ? new Date(draft.endsAt) : null;
  if (!end) {
    if (original.endsAt) errors.endsAt = "An end time can be changed but not removed.";
  } else if (start && end.getTime() <= start.getTime()) errors.endsAt = "The event must end after it starts.";
  else if (startChanged || draft.endsAt !== original.endsAt) patch.endsAt = end.toISOString();

  if (draft.capacity.trim() === "") {
    if (original.capacity !== "") errors.capacity = "A capacity can be changed but not removed.";
  } else {
    const capacity = parseQuantity(draft.capacity);
    if (capacity === null) errors.capacity = `Capacity must be a whole number from 1 to ${naira(MAX_TIER_QUANTITY)}.`;
    else if (capacity < original.ticketsSold) {
      errors.capacity = `${naira(original.ticketsSold)} tickets are already sold, so the capacity can't be lower than that.`;
    } else if (String(capacity) !== original.capacity) patch.capacity = capacity;
  }

  if (draft.coverImageUrl !== original.coverImageUrl) patch.coverImageUrl = draft.coverImageUrl;

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, patch };
}

/** A refusal the organizer can act on is shown as the server worded it; anything else gets `fallback`. */
export function actionError(error: unknown, fallback: string): string {
  const e = error as { status?: number; message?: string } | null;
  const text = e?.message?.trim();
  return (e?.status === 400 || e?.status === 409) && text && text.length <= 200 ? text : fallback;
}

// ---- failures and duplicates ---------------------------------------------------

export type FailureKind = "refused" | "unclear" | "rate" | "forbidden" | "signed-out";

export function classifyEventError(
  error: { status?: number; code?: string | number; message?: string } | null | undefined
): { kind: FailureKind; message: string } {
  const status = error?.status;
  if (status === undefined || error?.code === "NETWORK_ERROR" || status >= 500) {
    return {
      kind: "unclear",
      message:
        "We couldn't confirm whether the event was created. We'll check your events before sending it again, so it isn't published twice.",
    };
  }
  if (status === 401) return { kind: "signed-out", message: "Your session has ended. Sign in again, then publish." };
  if (status === 403) {
    return { kind: "forbidden", message: "Your account isn't allowed to publish events right now. Check your organizer status." };
  }
  if (status === 429) return { kind: "rate", message: "Too many attempts. Please wait a minute and try again." };
  const text = error?.message?.trim();
  return {
    kind: "refused",
    message: text && text.length <= 200 ? text : "The event couldn't be created. Check the details and try again.",
  };
}

const norm = (s: string) => s.trim().replace(/\s+/g, " ").toLowerCase();

/** The organizer's event this payload most likely already created: same name, starting within a minute. */
export function findLikelyDuplicate<T extends { id: string; title: string; startsAt: string }>(
  existing: readonly T[],
  payload: { title: string; startsAt: string },
  toleranceMs = 60_000
): T | null {
  const wanted = norm(payload.title);
  const at = new Date(payload.startsAt).getTime();
  if (!Number.isFinite(at)) return null;
  for (const e of existing) {
    const t = new Date(e.startsAt).getTime();
    if (Number.isFinite(t) && norm(e.title) === wanted && Math.abs(t - at) <= toleranceMs) return e;
  }
  return null;
}
