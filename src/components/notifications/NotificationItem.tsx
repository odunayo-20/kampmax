"use client";

import { cn } from "@/lib/utils";
import { Notification } from "@/types";
import { Trash2, ChevronRight } from "lucide-react";
import { getNotificationCategoryMeta } from "@/components/notifications/notification-meta";

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  onNavigate?: (url: string) => void;
  compact?: boolean;
  /** The coloured category icon. The full page leaves it out because its group headings already name the category. */
  showIcon?: boolean;
}

function formatNotifTime(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString("en-NG", { month: "short", day: "numeric" });
}

export function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
  compact,
  showIcon = true,
}: NotificationItemProps) {
  const config = getNotificationCategoryMeta(notification.category);
  const Icon = config.icon;

  function handleClick() {
    if (!notification.read) onMarkAsRead?.(notification.id);
    if (notification.actionUrl) onNavigate?.(notification.actionUrl);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      className={cn(
        "w-full flex items-start gap-3 text-left transition-colors group cursor-pointer",
        compact ? "px-3 py-2.5" : "px-4 py-3.5",
        notification.read
          ? "bg-white hover:bg-kampmax-muted/30"
          : "bg-kampmax-blue/[0.03] hover:bg-kampmax-blue/[0.06]"
      )}
    >
      {/* Unread dot */}
      <div className="flex flex-col items-center gap-1 pt-0.5 flex-shrink-0">
        {!notification.read && (
          <span className="w-2 h-2 rounded-full bg-kampmax-blue" />
        )}
        {notification.read && <span className="w-2 h-2" />}
      </div>

      {showIcon && (
        <div
          className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            config.bg
          )}
        >
          <Icon className={cn("h-5 w-5", config.color)} />
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p
            className={cn(
              "text-sm leading-snug",
              notification.read
                ? "font-medium text-kampmax-text-secondary"
                : "font-semibold text-kampmax-text"
            )}
          >
            {notification.title}
          </p>
          <span className="text-[10px] text-kampmax-text-secondary/60 whitespace-nowrap flex-shrink-0">
            {formatNotifTime(notification.createdAt)}
          </span>
        </div>
        <p className="text-xs text-kampmax-text-secondary mt-0.5 line-clamp-2">
          {notification.message}
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(notification.id);
            }}
            aria-label="Delete notification"
            className="p-1 rounded-md hover:bg-kampmax-error/10 text-kampmax-text-secondary/40 hover:text-kampmax-error"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        {notification.actionUrl && (
          <ChevronRight className="h-4 w-4 text-kampmax-text-secondary/30" />
        )}
      </div>
    </div>
  );
}
