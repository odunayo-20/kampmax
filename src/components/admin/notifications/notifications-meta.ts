import {
  Award,
  Bell,
  Briefcase,
  Handshake,
  Heart,
  MessageSquareText,
  Package,
  Receipt,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  ThumbsUp,
  UserCircle,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedNotificationQuery,
  NotificationRecordType,
  NotificationBroadcastAudience,
} from "@/types/admin";

// ------------------------------------------------------------
// TYPE MAPS — mirror the real NotificationType enum exactly (no invented category)
// ------------------------------------------------------------

export const NOTIFICATION_TYPE_LABELS: Record<NotificationRecordType, string> = {
  ORDER: "Order",
  PAYMENT: "Payment",
  MESSAGE: "Message",
  FOLLOW: "Follow",
  LIKE: "Like",
  COMMENT: "Comment",
  VENDOR: "Vendor",
  ADMIN: "Admin notice",
  SYSTEM: "System",
  LOYALTY: "Loyalty",
  JOB: "Job",
  PROPOSAL: "Proposal",
  ENGAGEMENT: "Engagement",
  VERIFICATION: "Verification",
  PROFILE: "Profile",
  REVIEW: "Review",
};

export function notificationTypeLabel(type: NotificationRecordType): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export const NOTIFICATION_TYPE_ICONS: Record<NotificationRecordType, LucideIcon> = {
  ORDER: Package,
  PAYMENT: Receipt,
  MESSAGE: MessageSquareText,
  FOLLOW: UserPlus,
  LIKE: ThumbsUp,
  COMMENT: MessageSquareText,
  VENDOR: Store,
  ADMIN: Send,
  SYSTEM: Sparkles,
  LOYALTY: Award,
  JOB: Briefcase,
  PROPOSAL: Handshake,
  ENGAGEMENT: Heart,
  VERIFICATION: ShieldCheck,
  PROFILE: UserCircle,
  REVIEW: Star,
};

export function notificationTypeIcon(type: NotificationRecordType): LucideIcon {
  return NOTIFICATION_TYPE_ICONS[type] ?? Bell;
}

export function notificationTypeVariant(type: NotificationRecordType): BadgeVariant {
  switch (type) {
    case "ORDER":
      return "success";
    case "PAYMENT":
      return "gold";
    case "VERIFICATION":
      return "info";
    case "ADMIN":
      return "blue";
    case "SYSTEM":
      return "neutral";
    default:
      return "neutral";
  }
}

export const NOTIFICATION_TYPE_FILTER_ORDER: NotificationRecordType[] = [
  "ADMIN",
  "SYSTEM",
  "ORDER",
  "PAYMENT",
  "VENDOR",
  "VERIFICATION",
  "JOB",
  "PROPOSAL",
  "ENGAGEMENT",
  "REVIEW",
  "PROFILE",
  "LOYALTY",
  "MESSAGE",
  "FOLLOW",
  "LIKE",
  "COMMENT",
];

// ------------------------------------------------------------
// READ STATE
// ------------------------------------------------------------

export function readStateLabel(read: boolean): string {
  return read ? "Read" : "Unread";
}

export function readStateVariant(read: boolean): BadgeVariant {
  return read ? "neutral" : "info";
}

// ------------------------------------------------------------
// AUDIENCE
// ------------------------------------------------------------

export const AUDIENCE_LABELS: Record<NotificationBroadcastAudience, string> = {
  specific_user: "Selected user",
  all_users: "All platform users",
  customers: "Customers (students)",
  vendors: "Vendors",
  campus: "Campus users",
};

export function audienceLabel(audience: NotificationBroadcastAudience): string {
  return AUDIENCE_LABELS[audience] ?? audience;
}

export const AUDIENCE_FILTER_ORDER: NotificationBroadcastAudience[] = [
  "all_users",
  "customers",
  "vendors",
  "campus",
  "specific_user",
];

// ------------------------------------------------------------
// FILTER HELPERS
// ------------------------------------------------------------

export function hasActiveNotificationFilters(query: ManagedNotificationQuery): boolean {
  return (
    (query.search?.trim().length ?? 0) > 0 ||
    (query.type !== undefined && query.type !== "all") ||
    (query.read !== undefined && query.read !== "all")
  );
}

export function previewText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "…";
}
