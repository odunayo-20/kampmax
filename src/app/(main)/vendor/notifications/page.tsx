"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bell,
  CheckCheck,
  Package,
  ShieldAlert,
  Star,
  DollarSign,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs, BreadcrumbItem } from "@/components/layout/Breadcrumbs";
import { formatDate } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

interface VendorNotification {
  id: string;
  type: "order" | "dispute" | "review" | "escrow" | "stock";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
}

interface BackendNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

const TYPE_MAP: Record<string, VendorNotification["type"]> = {
  ORDER: "order",
  PAYMENT: "escrow",
  VENDOR: "dispute",
};

/** Notifications addressed to the user as a shopper are hidden from the store view. */
function isVendorFacing(n: BackendNotification): boolean {
  return n.data?.audience !== "customer";
}

function mapNotification(n: BackendNotification): VendorNotification {
  return {
    id: n.id,
    type: TYPE_MAP[n.type] ?? "order",
    title: n.title,
    message: n.body,
    timestamp: n.createdAt,
    read: Boolean(n.readAt),
    link: typeof n.data?.link === "string" ? n.data.link : undefined,
  };
}

const NOTIFICATIONS_KEY = ["vendor-notifications"] as const;

async function fetchVendorNotifications(): Promise<VendorNotification[]> {
  const { data, error } = await apiClient.get<{ items: BackendNotification[] }>("/notifications?limit=50");
  if (error) throw error;
  return (data?.items ?? []).filter(isVendorFacing).map(mapNotification);
}

export default function VendorNotificationsPage() {
  const { status } = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread" | "order" | "dispute">("all");

  const query = useQuery({
    queryKey: NOTIFICATIONS_KEY,
    queryFn: fetchVendorNotifications,
    enabled: status === "authenticated",
    refetchInterval: 60_000,
  });
  const notifications = query.data ?? [];
  const isLoading = query.isPending;

  const invalidate = () => queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_KEY });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const { error } = await apiClient.patch("/notifications/read-all", {});
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await apiClient.patch(`/notifications/${id}/read`, {});
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const markAllRead = () => markAllReadMutation.mutate();
  const toggleRead = (id: string) => {
    if (notifications.find((n) => n.id === id)?.read) return; // the API only marks as read
    markReadMutation.mutate(id);
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "order") return n.type === "order";
    if (filter === "dispute") return n.type === "dispute";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const breadcrumbs: BreadcrumbItem[] = [
    { label: "Vendor Portal", href: "/vendor/dashboard" },
    { label: "Notifications" },
  ];

  return (
    <PageContainer>
      <div className="space-y-4 max-w-3xl mx-auto">
        <Breadcrumbs items={breadcrumbs} />

        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/vendor/dashboard"
              className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
            >
              <ArrowLeft className="h-5 w-5 text-kampmax-text" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-kampmax-text">Store Notifications</h1>
                {unreadCount > 0 && (
                  <span className="bg-kampmax-blue text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {unreadCount} NEW
                  </span>
                )}
              </div>
              <p className="text-xs text-kampmax-text-secondary">
                Orders, payments, customer claims & stock alerts.
              </p>
            </div>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-kampmax-muted hover:bg-kampmax-border text-kampmax-navy text-xs font-semibold rounded-xl transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "All Alerts" },
            { id: "unread", label: `Unread (${unreadCount})` },
            { id: "order", label: "Orders" },
            { id: "dispute", label: "Disputes" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors shrink-0 ${
                filter === tab.id
                  ? "bg-kampmax-navy text-white shadow-xs"
                  : "bg-white border border-kampmax-border text-kampmax-text-secondary hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        {isLoading ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-kampmax-border p-6 space-y-2">
            <Loader2 className="w-8 h-8 text-kampmax-blue animate-spin mx-auto" />
            <p className="text-xs text-kampmax-text-secondary">Loading notifications from backend...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-kampmax-border p-6 space-y-2">
            <Bell className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-kampmax-text">No Notifications Found</h3>
            <p className="text-xs text-kampmax-text-secondary">
              No store notifications match the selected filter.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map((n) => {
              const iconMap = {
                order: Package,
                dispute: ShieldAlert,
                review: Star,
                escrow: DollarSign,
                stock: AlertTriangle,
              };
              const Icon = iconMap[n.type];

              return (
                <div
                  key={n.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    n.read
                      ? "bg-white border-kampmax-border"
                      : "bg-blue-50/40 border-blue-200 shadow-xs"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-xl shrink-0 ${
                        n.type === "dispute"
                          ? "bg-rose-100 text-rose-700"
                          : n.type === "escrow"
                          ? "bg-emerald-100 text-emerald-700"
                          : n.type === "review"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-kampmax-text truncate">{n.title}</h4>
                        <span className="text-[10px] text-kampmax-text-secondary shrink-0">
                          {formatDate(new Date(n.timestamp))}
                        </span>
                      </div>
                      <p className="text-xs text-kampmax-text-secondary mt-0.5 leading-relaxed">
                        {n.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2.5">
                        {n.link && (
                          <Link
                            href={n.link}
                            className="text-xs font-semibold text-kampmax-blue hover:underline"
                          >
                            View Details →
                          </Link>
                        )}
                        {!n.read && (
                          <button
                            onClick={() => toggleRead(n.id)}
                            className="text-[11px] font-medium text-kampmax-text-secondary hover:text-kampmax-text"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageContainer>
  );
}
