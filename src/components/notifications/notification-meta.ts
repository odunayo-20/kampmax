import { NotificationCategory, NotificationType } from "@/types";
import {
  Package,
  MessageCircle,
  ShoppingCart,
  GraduationCap,
  CreditCard,
  User,
  Tag,
  CalendarCheck,
  Ticket,
  Bell,
  type LucideIcon,
} from "lucide-react";

export interface NotificationCategoryMeta {
  label: string;
  icon: LucideIcon;
  bg: string;
  color: string;
}

/**
 * Presentation metadata for notification categories. When a category is
 * unknown (new backend value not yet mirrored in the frontend) the safe
 * fallback below is used so the UI never crashes and always stays legible.
 */
export const NOTIFICATION_CATEGORY_META: Record<
  NotificationCategory,
  NotificationCategoryMeta
> = {
  orders: {
    label: "Orders",
    icon: Package,
    bg: "bg-kampmax-blue/10",
    color: "text-kampmax-blue",
  },
  messages: {
    label: "Messages",
    icon: MessageCircle,
    bg: "bg-kampmax-success/10",
    color: "text-kampmax-success",
  },
  marketplace: {
    label: "Marketplace",
    icon: ShoppingCart,
    bg: "bg-kampmax-gold/10",
    color: "text-kampmax-gold-dark",
  },
  campus: {
    label: "Campus",
    icon: GraduationCap,
    bg: "bg-kampmax-gold/10",
    color: "text-kampmax-gold",
  },
  payments: {
    label: "Payments",
    icon: CreditCard,
    bg: "bg-kampmax-success/10",
    color: "text-kampmax-success",
  },
  account: {
    label: "Account",
    icon: User,
    bg: "bg-kampmax-muted",
    color: "text-kampmax-text-secondary",
  },
  promotions: {
    label: "Promotions",
    icon: Tag,
    bg: "bg-kampmax-error/10",
    color: "text-kampmax-error",
  },
  bookings: {
    label: "Bookings",
    icon: CalendarCheck,
    bg: "bg-primary-100",
    color: "text-primary-700",
  },
  events: {
    label: "Events",
    icon: Ticket,
    bg: "bg-kampmax-gold/10",
    color: "text-kampmax-gold-dark",
  },
};

const FALLBACK_CATEGORY_META: NotificationCategoryMeta = {
  label: "Update",
  icon: Bell,
  bg: "bg-kampmax-muted",
  color: "text-kampmax-text-secondary",
};

export function getNotificationCategoryMeta(
  category: string
): NotificationCategoryMeta {
  return (
    NOTIFICATION_CATEGORY_META[category as NotificationCategory] ??
    FALLBACK_CATEGORY_META
  );
}

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  order_update: "Order",
  message: "Message",
  marketplace: "Marketplace",
  campus: "Campus",
  payments: "Payment",
  account: "Account",
  promotion: "Promotion",
  booking_update: "Booking",
  event: "Event",
  system: "System",
};

export function getNotificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type as NotificationType] ?? "Update";
}