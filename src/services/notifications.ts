
import { NotificationCategory } from "@/types";

const categoryLabels: Record<NotificationCategory, string> = {
  orders: "Orders",
  messages: "Messages",
  marketplace: "Marketplace",
  campus: "Campus",
  payments: "Payments",
  account: "Account",
  promotions: "Promotions",
  bookings: "Bookings",
  events: "Events",
};

export { categoryLabels };

export interface NotificationCategorySummary {
  id: NotificationCategory | "all";
  label: string;
  count: number;
  unread: number;
}