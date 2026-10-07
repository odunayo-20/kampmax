import { Campus, CampusStatus } from "@/types/admin";

export interface AdminCampusService {
  list(): Promise<Campus[]>;
  getById(id: string): Promise<Campus | null>;
  setStatus(id: string, status: CampusStatus): Promise<Campus>;
}
