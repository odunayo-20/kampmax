// What an admin sees of campus places (/admin/campus-places).

export type CampusPlaceType =
  | "SCHOOL_GATE"
  | "HOSTEL"
  | "LECTURE_HALL"
  | "LIBRARY"
  | "CAFETERIA"
  | "MARKET"
  | "PARK_STOP"
  | "LANDMARK"
  | "DELIVERY_POINT"
  | "OTHER";

export type CampusPlaceStatus = "ACTIVE" | "PENDING" | "HIDDEN" | "REJECTED";

export const CAMPUS_PLACE_TYPE_LABELS: Record<CampusPlaceType, string> = {
  SCHOOL_GATE: "School gate",
  HOSTEL: "Hostel",
  LECTURE_HALL: "Lecture hall",
  LIBRARY: "Library",
  CAFETERIA: "Cafeteria",
  MARKET: "Market",
  PARK_STOP: "Park / bus stop",
  LANDMARK: "Landmark",
  DELIVERY_POINT: "Delivery point",
  OTHER: "Other",
};

export const CAMPUS_PLACE_TYPES = Object.keys(CAMPUS_PLACE_TYPE_LABELS) as CampusPlaceType[];

export interface AdminCampusPlace {
  id: string;
  campusId: string;
  campusName: string | null;
  name: string;
  type: CampusPlaceType;
  aliases: string[];
  description: string | null;
  latitude: number;
  longitude: number;
  status: CampusPlaceStatus;
  suggestedByName: string | null;
  /** True when a student proposed it rather than an admin adding it. */
  suggestedByStudent: boolean;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

/** What the form sends when adding a place. */
export interface CampusPlaceInput {
  campusId: string;
  name: string;
  type: CampusPlaceType;
  aliases: string[];
  description: string;
  latitude: number;
  longitude: number;
}
