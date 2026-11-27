/**
 * An accommodation agent's properties and their rooms: the forms with the backend's own limits, what students see of
 * the place, the campus picker, and when archiving is safe. The mobile app's lib/agent-portal.ts says the same
 * things. Pure rules, no network.
 */

import type { AccommodationProperty, AccommodationUnit } from "@/types/accommodation";
import { pluralize } from "./utils";

export type Furnishing = AccommodationUnit["furnishingStatus"];
export type RoomAvailability = AccommodationUnit["availabilityStatus"];

export const FURNISHING_OPTIONS: { id: Furnishing; label: string }[] = [
  { id: "UNFURNISHED", label: "Unfurnished" },
  { id: "SEMI_FURNISHED", label: "Partly furnished" },
  { id: "FURNISHED", label: "Furnished" },
];

export const FURNISHING_LABEL: Record<string, string> = Object.fromEntries(FURNISHING_OPTIONS.map((o) => [o.id, o.label]));

export interface Pin {
  latitude: number;
  longitude: number;
}

const one = (s: string) => s.replace(/\s+/g, " ").trim();

// ---------- rooms ----------

export interface UnitForm {
  unitName: string;
  unitType: string;
  bedrooms: string;
  bathrooms: string;
  occupancyCapacity: string;
  furnishingStatus: Furnishing;
  availabilityStatus: RoomAvailability;
}

export type UnitErrors = Partial<Record<"unitName" | "unitType" | "bedrooms" | "bathrooms" | "occupancyCapacity", string>>;

export const emptyUnit = (): UnitForm => ({ unitName: "", unitType: "", bedrooms: "1", bathrooms: "1", occupancyCapacity: "1", furnishingStatus: "UNFURNISHED", availabilityStatus: "AVAILABLE" });

export function formFromUnit(u: AccommodationUnit): UnitForm {
  return {
    unitName: u.unitName,
    unitType: u.unitType,
    bedrooms: String(u.bedrooms ?? 0),
    bathrooms: String(u.bathrooms ?? 0),
    occupancyCapacity: String(u.occupancyCapacity ?? 1),
    furnishingStatus: u.furnishingStatus ?? "UNFURNISHED",
    availabilityStatus: u.availabilityStatus ?? "AVAILABLE",
  };
}

/** Whole numbers only: "2.5 bedrooms" and "1e2" are mistakes, not numbers. */
function wholeNumber(text: string, min: number, max: number): number | null {
  const t = text.trim();
  if (!/^\d{1,3}$/.test(t)) return null;
  const n = Number(t);
  return n >= min && n <= max ? n : null;
}

export function unitProblems(f: UnitForm): UnitErrors {
  const e: UnitErrors = {};
  const name = one(f.unitName);
  if (name.length < 1) e.unitName = 'Give the room or flat a name, like "Room 4".';
  else if (name.length > 80) e.unitName = "Keep this under 80 characters.";
  const type = one(f.unitType);
  if (type.length < 2) e.unitType = 'Say what it is, like "Single room" or "Self-contain".';
  else if (type.length > 60) e.unitType = "Keep this under 60 characters.";
  if (wholeNumber(f.bedrooms, 0, 50) === null) e.bedrooms = "Enter 0 to 50.";
  if (wholeNumber(f.bathrooms, 0, 50) === null) e.bathrooms = "Enter 0 to 50.";
  if (wholeNumber(f.occupancyCapacity, 1, 100) === null) e.occupancyCapacity = "Enter 1 to 100.";
  return e;
}

/** The body for adding or updating a room. Call only after `unitProblems` found nothing. */
export function unitBody(f: UnitForm) {
  return {
    unitName: one(f.unitName),
    unitType: one(f.unitType),
    bedrooms: wholeNumber(f.bedrooms, 0, 50) ?? 0,
    bathrooms: wholeNumber(f.bathrooms, 0, 50) ?? 0,
    occupancyCapacity: wholeNumber(f.occupancyCapacity, 1, 100) ?? 1,
    furnishingStatus: f.furnishingStatus,
    availabilityStatus: f.availabilityStatus,
  };
}

/** "2 bed · 1 bath · Furnished", for a room row. */
export function unitSummary(u: Pick<AccommodationUnit, "bedrooms" | "bathrooms" | "furnishingStatus">): string {
  const bed = u.bedrooms === 0 ? "Studio" : `${u.bedrooms} bed`;
  return [bed, `${u.bathrooms} bath`, FURNISHING_LABEL[u.furnishingStatus] ?? null].filter(Boolean).join(" · ");
}

/** Two rooms in one property cannot share a name (the server refuses it). `ignoreId` is the room being edited. */
export function unitNameTaken(name: string, units: Pick<AccommodationUnit, "id" | "unitName">[], ignoreId?: string): boolean {
  const wanted = one(name).toLowerCase();
  return !!wanted && units.some((u) => u.id !== ignoreId && one(u.unitName).toLowerCase() === wanted);
}

export const UNIT_NAME_TAKEN = "This property already has a room with that name.";

/** "3 rooms", or "No rooms yet". */
export const roomsLine = (n: number): string => (n === 0 ? "No rooms yet" : pluralize(n, "room"));

// ---------- the property ----------

export interface PropertyForm {
  title: string;
  categoryId: string;
  state: string;
  city: string;
  neighbourhood: string;
  address: string;
  landmark: string;
  description: string;
  /** The campus this property serves; empty when none is chosen. */
  campusId: string;
  /** Where it is on the map; null until the agent pins it. */
  pin: Pin | null;
}

export type PropertyErrors = Partial<Record<keyof PropertyForm, string>>;

export const emptyProperty = (): PropertyForm => ({ title: "", categoryId: "", state: "", city: "", neighbourhood: "", address: "", landmark: "", description: "", campusId: "", pin: null });

export function formFromProperty(p: AccommodationProperty): PropertyForm {
  return {
    title: p.title,
    categoryId: p.categoryId,
    state: p.state,
    city: p.city,
    neighbourhood: p.neighbourhood ?? "",
    address: p.address,
    landmark: p.landmark ?? "",
    description: p.description ?? "",
    campusId: p.campusId ?? "",
    pin: p.latitude !== null && p.longitude !== null ? { latitude: p.latitude, longitude: p.longitude } : null,
  };
}

export function propertyProblems(f: PropertyForm): PropertyErrors {
  const e: PropertyErrors = {};
  const title = one(f.title);
  if (title.length < 3) e.title = 'Give the property a name, like "Sunrise Lodge".';
  else if (title.length > 160) e.title = "Keep this under 160 characters.";
  if (!f.categoryId) e.categoryId = "Choose what kind of property it is.";
  if (one(f.state).length < 2) e.state = "Enter the state.";
  else if (one(f.state).length > 80) e.state = "Keep this under 80 characters.";
  if (one(f.city).length < 2) e.city = "Enter the city or town.";
  else if (one(f.city).length > 80) e.city = "Keep this under 80 characters.";
  if (one(f.neighbourhood).length > 120) e.neighbourhood = "Keep this under 120 characters.";
  const address = one(f.address);
  if (address.length < 3) e.address = "Enter the street address. Students never see it.";
  else if (address.length > 300) e.address = "Keep this under 300 characters.";
  if (one(f.landmark).length > 160) e.landmark = "Keep this under 160 characters.";
  if (f.description.trim().length > 5000) e.description = "Keep this under 5,000 characters.";
  return e;
}

export interface PropertyBody {
  title: string;
  categoryId: string;
  state: string;
  city: string;
  neighbourhood?: string;
  address: string;
  landmark?: string;
  description?: string;
  campusId?: string;
  latitude?: number;
  longitude?: number;
}

/** The body for a new property. Optional fields that are empty are left out. */
export function propertyBody(f: PropertyForm): PropertyBody {
  const body: PropertyBody = { title: one(f.title), categoryId: f.categoryId, state: one(f.state), city: one(f.city), address: one(f.address) };
  if (one(f.neighbourhood)) body.neighbourhood = one(f.neighbourhood);
  if (one(f.landmark)) body.landmark = one(f.landmark);
  if (f.description.trim()) body.description = f.description.trim();
  if (f.campusId) body.campusId = f.campusId;
  if (f.pin) Object.assign(body, f.pin);
  return body;
}

/** Only what changed. The area, landmark and description can be cleared; a campus and a pin can be set or moved, not removed. */
export function propertyPatch(f: PropertyForm, original: AccommodationProperty): Partial<PropertyBody> {
  const was = formFromProperty(original);
  const patch: Partial<PropertyBody> = {};
  (["title", "state", "city", "address"] as const).forEach((k) => {
    if (one(f[k]) !== one(was[k])) patch[k] = one(f[k]);
  });
  if (f.categoryId !== was.categoryId) patch.categoryId = f.categoryId;
  if (one(f.neighbourhood) !== one(was.neighbourhood)) patch.neighbourhood = one(f.neighbourhood);
  if (one(f.landmark) !== one(was.landmark)) patch.landmark = one(f.landmark);
  if (f.description.trim() !== was.description.trim()) patch.description = f.description.trim();
  if (f.campusId && f.campusId !== was.campusId) patch.campusId = f.campusId;
  if (f.pin && (f.pin.latitude !== was.pin?.latitude || f.pin.longitude !== was.pin?.longitude)) Object.assign(patch, f.pin);
  return patch;
}

/** "Akoka, Yaba, Lagos": what students see. The street address is never part of it. */
export function publicPlace(p: Pick<AccommodationProperty, "neighbourhood" | "city" | "state">): string {
  return [p.neighbourhood, p.city, p.state].filter((x) => x && x.trim()).join(", ");
}

/** Campuses matching what was typed, by name, short name or place, ignoring case. */
export function filterCampuses<T extends { name: string; abbreviation?: string; location?: string }>(campuses: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return campuses;
  return campuses.filter((c) => [c.name, c.abbreviation, c.location].some((x) => x && x.toLowerCase().includes(q)));
}

// ---------- archiving ----------

export function archivePropertyWarning(units: number): string {
  return units > 0 ? `This also archives ${units === 1 ? "its room" : `its ${units} rooms`}. This cannot be undone.` : "This cannot be undone.";
}

/**
 * Archiving hides a place at once, but a paid listing for it would keep running and could renew. So anything but a
 * plain draft must end first. Returns the reason to show, or null when it is safe. Pass `unitId` to check one room.
 */
export function archiveBlocker(listings: { propertyId: string; unitId: string; moderationStatus: string }[], propertyId: string, unitId?: string): string | null {
  const inUse = listings.filter((l) => l.propertyId === propertyId && (!unitId || l.unitId === unitId) && l.moderationStatus !== "DRAFT");
  if (inUse.length === 0) return null;
  const what = unitId ? "This room has" : "This property has";
  const n = inUse.length;
  return `${what} ${n === 1 ? "a listing" : `${n} listings`} that ${n === 1 ? "is" : "are"} live or in review. Turn off auto-renewal and let ${n === 1 ? "it" : "them"} end first, so nothing keeps running or renewing for a place that is gone.`;
}

export const ARCHIVE_CHECK_FAILED = "We could not check whether a listing still depends on this, so nothing was archived. Check your connection and try again.";

export const LOST_PROPERTY = "We lost the connection, so we cannot tell if it was saved. Check your properties before trying again.";

export const PROPERTIES_EMPTY = {
  title: "No properties yet",
  text: "Add a hostel, house or flat with its first room. You will list each room separately, with its own rent and photos.",
};
