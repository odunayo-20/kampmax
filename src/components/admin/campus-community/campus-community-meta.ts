import {
  BarChart3,
  CalendarDays,
  HelpCircle,
  PackageSearch,
  Megaphone,
  MessagesSquare,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  AnnouncementPriority,
  AnnouncementStatus,
  CommunityCommentStatus,
  CommunityEventStatus,
  CommunityPostStatus,
  CampusPostType,
  CommunityReportReason,
  CommunityReportStatus,
  CommunityReportTargetType,
  ManagedPollStatus,
} from "@/types/admin";

// ------------------------------------------------------------
// POSTS
// ------------------------------------------------------------

export const COMMUNITY_POST_STATUS_LABELS: Record<CommunityPostStatus, string> =
  {
    published: "Published",
    hidden: "Hidden",
    reported: "Reported",
    removed: "Removed",
    under_review: "Under review",
  };

export function communityPostStatusLabel(
  status: CommunityPostStatus
): string {
  return COMMUNITY_POST_STATUS_LABELS[status] ?? status;
}

export function communityPostStatusVariant(
  status: CommunityPostStatus
): BadgeVariant {
  switch (status) {
    case "published":
      return "success";
    case "hidden":
      return "warning";
    case "reported":
      return "error";
    case "under_review":
      return "info";
    default:
      return "neutral"; // removed
  }
}

export const POST_STATUS_FILTER_ORDER: CommunityPostStatus[] = [
  "published",
  "hidden",
  "reported",
  "under_review",
  "removed",
];

export const POST_TYPE_LABELS: Record<CampusPostType, string> = {
  discussion: "Discussion",
  question: "Question",
  event: "Event",
  marketplace: "Marketplace",
  announcement: "Announcement",
  lost_found: "Lost & found",
  poll: "Poll",
};

export function postTypeLabel(type: CampusPostType): string {
  return POST_TYPE_LABELS[type] ?? type;
}

export const POST_TYPE_ICONS: Record<CampusPostType, LucideIcon> = {
  discussion: MessagesSquare,
  question: HelpCircle,
  event: CalendarDays,
  marketplace: ShoppingBag,
  announcement: Megaphone,
  lost_found: PackageSearch,
  poll: BarChart3,
};

/** Post kinds the platform actually produces. */
export const POST_TYPE_FILTER_ORDER: CampusPostType[] = [
  "discussion",
  "poll",
  "announcement",
  "lost_found",
];

/** Which moderation transitions each post status allows. */
export function postActionsFor(p: {
  status: CommunityPostStatus;
  reportsCount: number;
}): {
  hide?: boolean;
  restore?: boolean;
  remove?: boolean;
  reviewReports?: boolean;
} {
  switch (p.status) {
    case "published":
      return { hide: true, remove: true, reviewReports: p.reportsCount > 0 };
    case "reported":
    case "under_review":
      return { hide: true, remove: true, reviewReports: true };
    case "hidden":
      return { restore: true, remove: true, reviewReports: p.reportsCount > 0 };
    case "removed":
      return {};
  }
}

// ------------------------------------------------------------
// COMMENTS
// ------------------------------------------------------------

export const COMMENT_STATUS_LABELS: Record<CommunityCommentStatus, string> = {
  published: "Published",
  hidden: "Hidden",
  removed: "Removed",
};

export function commentStatusLabel(status: CommunityCommentStatus): string {
  return COMMENT_STATUS_LABELS[status] ?? status;
}

export function commentStatusVariant(
  status: CommunityCommentStatus
): BadgeVariant {
  switch (status) {
    case "published":
      return "success";
    case "hidden":
      return "warning";
    default:
      return "neutral"; // removed
  }
}

export const COMMENT_STATUS_FILTER_ORDER: CommunityCommentStatus[] = [
  "published",
  "hidden",
  "removed",
];

// ------------------------------------------------------------
// EVENTS
// ------------------------------------------------------------

export const EVENT_STATUS_LABELS: Record<CommunityEventStatus, string> = {
  upcoming: "Upcoming",
  live: "Live",
  completed: "Completed",
  cancelled: "Cancelled",
};

export function eventStatusLabel(status: CommunityEventStatus): string {
  return EVENT_STATUS_LABELS[status] ?? status;
}

export function eventStatusVariant(
  status: CommunityEventStatus
): BadgeVariant {
  switch (status) {
    case "live":
      return "success";
    case "upcoming":
      return "info";
    case "cancelled":
      return "error";
    default:
      return "neutral"; // completed
  }
}

export const EVENT_STATUS_FILTER_ORDER: CommunityEventStatus[] = [
  "upcoming",
  "live",
  "completed",
  "cancelled",
];

// ------------------------------------------------------------
// ANNOUNCEMENTS
// ------------------------------------------------------------

export const ANNOUNCEMENT_STATUS_LABELS: Record<AnnouncementStatus, string> = {
  published: "Published",
  archived: "Archived",
};

export function announcementStatusLabel(status: AnnouncementStatus): string {
  return ANNOUNCEMENT_STATUS_LABELS[status] ?? status;
}

export function announcementStatusVariant(
  status: AnnouncementStatus
): BadgeVariant {
  switch (status) {
    case "published":
      return "success";
    default:
      return "neutral"; // archived
  }
}

export const ANNOUNCEMENT_STATUS_FILTER_ORDER: AnnouncementStatus[] = [
  "published",
  "archived",
];

export const ANNOUNCEMENT_PRIORITY_LABELS: Record<
  AnnouncementPriority,
  string
> = {
  info: "Info",
  warning: "Warning",
  urgent: "Urgent",
};

export function announcementPriorityLabel(
  priority: AnnouncementPriority
): string {
  return ANNOUNCEMENT_PRIORITY_LABELS[priority] ?? priority;
}

export const ANNOUNCEMENT_PRIORITY_ORDER: AnnouncementPriority[] = [
  "info",
  "warning",
  "urgent",
];

// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------

export const REPORT_STATUS_LABELS: Record<CommunityReportStatus, string> = {
  open: "Open",
  reviewing: "Reviewing",
  actioned: "Actioned",
  dismissed: "Dismissed",
};

export function reportStatusLabel(status: CommunityReportStatus): string {
  return REPORT_STATUS_LABELS[status] ?? status;
}

export function reportStatusVariant(
  status: CommunityReportStatus
): BadgeVariant {
  switch (status) {
    case "open":
      return "error";
    case "reviewing":
      return "warning";
    case "actioned":
      return "success";
    default:
      return "neutral"; // dismissed
  }
}

export const REPORT_STATUS_FILTER_ORDER: CommunityReportStatus[] = [
  "open",
  "reviewing",
  "actioned",
  "dismissed",
];

export const REPORT_TARGET_TYPE_LABELS: Record<
  CommunityReportTargetType,
  string
> = {
  post: "Post",
  comment: "Comment",
  event: "Event",
  poll: "Poll",
};

export const REPORT_REASON_LABELS: Record<CommunityReportReason, string> = {
  spam: "Spam",
  harassment: "Harassment",
  misinformation: "Misinformation",
  scam: "Scam / fraud",
  inappropriate: "Inappropriate",
  other: "Other",
};

// ------------------------------------------------------------
// POLLS
// ------------------------------------------------------------

export const POLL_STATUS_LABELS: Record<ManagedPollStatus, string> = {
  active: "Active",
  closed: "Closed",
};

export function pollStatusLabel(status: ManagedPollStatus): string {
  return POLL_STATUS_LABELS[status] ?? status;
}

export function pollStatusVariant(status: ManagedPollStatus): BadgeVariant {
  return status === "active" ? "success" : "neutral";
}
