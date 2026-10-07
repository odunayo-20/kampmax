import { AdminNotification } from "@/types/admin";

export interface AdminNotificationService {
  list(): Promise<AdminNotification[]>;
  send(input: {
    title: string;
    body: string;
    audience: AdminNotification["audience"];
    campusId: string | null;
    scheduledFor?: string | null;
  }): Promise<AdminNotification>;
}
