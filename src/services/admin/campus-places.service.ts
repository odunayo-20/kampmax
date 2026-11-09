// ============================================================
// CAMPUS PLACES SERVICE CONTRACT
// ============================================================
//
// What the team can do with named places on a campus (gates, hostels,
// markets): add them, edit or hide them, and review what students suggest.
// The live implementation is campus-places.api.ts.
// ============================================================

import type { Paginated } from "@/types/admin";
import type {
  AdminCampusPlace,
  CampusPlaceInput,
  CampusPlaceStatus,
  CampusPlaceType,
} from "@/types/campus-places";

export interface CampusPlacesQuery {
  campusId?: string;
  status?: CampusPlaceStatus;
  type?: CampusPlaceType;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface CampusPlacesPage extends Paginated<AdminCampusPlace> {
  /** Across the campus filter, whatever the other filters. */
  counts: { pending: number; active: number; hidden: number; rejected: number };
}

export interface CampusPlacePatch extends Partial<Omit<CampusPlaceInput, "campusId">> {
  status?: "ACTIVE" | "HIDDEN";
}

export interface AdminCampusPlacesService {
  /** GET /admin/campus-places */
  list(query?: CampusPlacesQuery): Promise<CampusPlacesPage>;
  /** POST /admin/campus-places: live straight away. */
  create(input: CampusPlaceInput): Promise<AdminCampusPlace>;
  /** PATCH /admin/campus-places/:id */
  update(id: string, patch: CampusPlacePatch): Promise<AdminCampusPlace>;
  /** POST /admin/campus-places/:id/approve: puts a suggestion on the map. */
  approve(id: string): Promise<AdminCampusPlace>;
  /** POST /admin/campus-places/:id/reject: the reason is shown to the student. */
  reject(id: string, reason: string): Promise<AdminCampusPlace>;
  /** DELETE /admin/campus-places/:id */
  remove(id: string): Promise<void>;
}
