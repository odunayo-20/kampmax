import { mockCampuses } from "./campuses";

/**
 * Mock campus options still used by the /admin/support and /admin/disputes
 * consoles. The /admin/campus console reads real campuses from the API
 * (see services/admin/community.api.ts).
 */
export function communityCampusOptions(): {
  id: string;
  name: string;
  shortName: string;
}[] {
  return mockCampuses.map((c) => ({
    id: c.id,
    name: c.name,
    shortName: c.shortName,
  }));
}
