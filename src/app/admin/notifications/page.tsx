"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { NotificationsOverview } from "@/components/admin/notifications/NotificationsOverview";
import { NotificationFilters } from "@/components/admin/notifications/NotificationFilters";
import { NotificationsTable } from "@/components/admin/notifications/NotificationsTable";
import { useAdminNotificationList } from "@/hooks/admin/use-admin-communications";
import type {
  ManagedNotificationQuery,
  ManagedNotificationRow,
} from "@/types/admin";

export default function AdminNotificationsPage() {
  const router = useRouter();

  const [query, setQuery] = useState<ManagedNotificationQuery>({
    page: 1,
    pageSize: 10,
  });

  const { data, isLoading, error, refetch } = useAdminNotificationList(query);

  const handleOverviewNavigate = useCallback(
    (opts: { read?: "unread" | "read" }) => {
      setQuery((prev) => ({
        ...prev,
        ...opts,
        page: 1,
      }));
    },
    []
  );

  function handleView(row: ManagedNotificationRow) {
    router.push(`/admin/notifications/${row.id}`);
  }

  return (
    <>
      <AdminPageHeader
        title="Notifications"
        description="Administer the shared in-app notification store. In-app is the only wired delivery channel."
        actions={
          <button
            type="button"
            onClick={() => router.push("/admin/notifications/create")}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90"
          >
            <PlusCircle className="h-4 w-4" />
            Create notification
          </button>
        }
      />

      <NotificationsOverview onNavigate={handleOverviewNavigate} />

      <NotificationFilters query={query} onQueryChange={setQuery} />

      <NotificationsTable
        data={data}
        loading={isLoading}
        error={!!error}
        hasActiveFilters={
          (query.search?.trim().length ?? 0) > 0 ||
          (query.type !== undefined && query.type !== "all") ||
          (query.read !== undefined && query.read !== "all")
        }
        onRetry={() => void refetch()}
        onClearFilters={() =>
          setQuery({ page: 1, pageSize: query.pageSize })
        }
        onView={handleView}
        onPageChange={(page) => setQuery((prev) => ({ ...prev, page }))}
      />
    </>
  );
}
