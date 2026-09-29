"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  NOTIFICATION_TYPE_FILTER_ORDER,
  notificationTypeLabel,
  hasActiveNotificationFilters,
} from "./notifications-meta";
import type { ManagedNotificationQuery, NotificationRecordType } from "@/types/admin";

interface NotificationFiltersProps {
  query: ManagedNotificationQuery;
  onQueryChange: (query: ManagedNotificationQuery) => void;
}

export function NotificationFilters({
  query,
  onQueryChange,
}: NotificationFiltersProps) {
  const hasActive = hasActiveNotificationFilters(query);

  return (
    <div className="my-3 flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-64">
        <Input
          value={query.search ?? ""}
          placeholder="Search title or body…"
          leftIcon={<Search className="h-4 w-4" />}
          aria-label="Search notifications"
          onChange={(e) =>
            onQueryChange({ ...query, search: e.target.value, page: 1 })
          }
        />
      </div>
      <Select
        value={query.type ?? "all"}
        aria-label="Filter by type"
        onChange={(e) =>
          onQueryChange({
            ...query,
            type: (e.target.value || "all") as NotificationRecordType | "all",
            page: 1,
          })
        }
        className="w-auto h-9 text-xs"
      >
        <option value="all">All types</option>
        {NOTIFICATION_TYPE_FILTER_ORDER.map((t) => (
          <option key={t} value={t}>
            {notificationTypeLabel(t)}
          </option>
        ))}
      </Select>
      {hasActive && (
        <button
          type="button"
          onClick={() =>
            onQueryChange({ page: 1, pageSize: query.pageSize })
          }
          className="text-xs font-medium text-kampmax-blue hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
