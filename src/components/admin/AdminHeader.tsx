"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  UserCog,
} from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { useAdminUI } from "@/lib/admin/admin-ui-context";
import {
  useAdminNotificationList,
  useAdminNotificationOverview,
} from "@/hooks/admin/use-admin-communications";
import {
  notificationTypeIcon,
  notificationTypeLabel,
} from "@/components/admin/notifications/notifications-meta";
import { AdminBreadcrumbs } from "./AdminBreadcrumbs";
import { LogoIcon } from "@/components/ui/Logo";

const ROLE_LABELS = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CAMPUS_ADMIN: "Campus Admin",
} as const;

function useOutsideClose(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointer(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  return ref;
}

export function AdminHeader() {
  const router = useRouter();
  const { setMobileNavOpen } = useAdminUI();
  const { admin, admins, switchAccount, logout } = useAdminSession();

  const { data: notifData, isLoading: notifLoading } = useAdminNotificationList({
    page: 1,
    pageSize: 5,
  });
  const { data: notifOverview } = useAdminNotificationOverview();

  const notifications = notifData?.items;
  const alertCount =
    notifOverview?.counts.unread ??
    (notifications ? notifications.filter((n) => !n.read).length : 0);

  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const notifRef = useOutsideClose(() => setNotifOpen(false));
  const profileRef = useOutsideClose(() => setProfileOpen(false));

  // Rendered only inside the authenticated console chrome, but keep the
  // null-safe check so the component never assumes a session exists.
  if (!admin) return null;

  const isSuperAdmin = admin.role === "SUPER_ADMIN";

  async function handleSignOut() {
    await logout();
    router.push("/admin/login");
    router.refresh();
  }

  async function handleSwitchAccount(accountId: string) {
    const result = await switchAccount(accountId);
    if (result.success) {
      setProfileOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-kampmax-border bg-white px-3 sm:px-4">
      {/* Mobile menu */}
      <button
        type="button"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Open navigation menu"
        className="-ml-1 rounded-md p-2 text-kampmax-text-secondary hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="hidden min-w-0 flex-1 md:block">
        <AdminBreadcrumbs />
      </div>
      <div className="flex items-center gap-2 min-w-0 flex-1 truncate md:hidden">
        <LogoIcon size={22} />
        <span className="truncate text-sm font-semibold text-kampmax-text">
          Kamp<span className="text-primary-600">max</span> Admin
        </span>
      </div>

      {/* Global search */}
      <div className="relative hidden w-72 shrink-0 lg:block xl:w-80">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-secondary" />
        <input
          type="search"
          placeholder="Search orders, users, vendors…"
          aria-label="Global search"
          onFocus={() => setSearchOpen(true)}
          onBlur={() => setSearchOpen(false)}
          className={cn(
            "h-9 w-full rounded-md border border-kampmax-border bg-kampmax-bg pl-9 pr-14 text-sm placeholder:text-kampmax-text-secondary/70",
            "focus:border-kampmax-blue focus:bg-white focus:outline-none focus:ring-1 focus:ring-kampmax-blue/20"
          )}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-kampmax-border bg-white px-1.5 py-0.5 text-[10px] font-medium text-kampmax-text-secondary xl:block">
          ⌘K
        </kbd>
        {searchOpen && (
          <div className="absolute left-0 right-0 top-11 rounded-md border border-kampmax-border bg-white p-3 shadow-lg">
            <p className="text-xs text-kampmax-text-secondary">
              Type to search across orders, users, vendors and products.
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-wide text-kampmax-text-secondary/60">
              Search wiring lands with the API integration phase.
            </p>
          </div>
        )}
      </div>

      {/* Latest notifications across the platform. Read state belongs to each recipient, so admins only view it. */}
      <div className="relative" ref={notifRef}>
        <button
          type="button"
          onClick={() => setNotifOpen((o) => !o)}
          aria-label={`Notifications (${alertCount})`}
          aria-expanded={notifOpen}
          className="relative rounded-md p-2 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
        >
          <Bell className="h-5 w-5" />
          {alertCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-kampmax-error px-1 text-[10px] font-bold leading-none text-white">
              {alertCount > 9 ? "9+" : alertCount}
            </span>
          )}
        </button>

        {notifOpen && (
          <div className="absolute right-0 top-11 z-40 w-80 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-kampmax-border bg-white shadow-lg">
            <div className="flex items-center justify-between border-b border-kampmax-border px-3.5 py-2.5">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-kampmax-text">
                  Platform notifications
                </p>
                {alertCount > 0 && (
                  <span className="rounded-full bg-kampmax-blue/10 px-1.5 py-0.5 text-[10px] font-semibold text-kampmax-blue">
                    {alertCount} unread by recipients
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                <Link
                  href="/admin/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-blue hover:underline"
                >
                  View all
                </Link>
              </div>
            </div>
            {notifLoading ? (
              <div className="space-y-2 p-3.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex gap-2">
                    <div className="h-3.5 w-3.5 shrink-0 animate-pulse rounded-full bg-kampmax-muted" />
                    <div className="h-3.5 flex-1 animate-pulse rounded bg-kampmax-muted" />
                  </div>
                ))}
              </div>
            ) : !notifications || notifications.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-sm text-kampmax-text-secondary">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-kampmax-border/70 max-h-80 overflow-y-auto">
                {notifications.slice(0, 5).map((n) => {
                  const TypeIcon = notificationTypeIcon(n.type);
                  return (
                    <li key={n.id}>
                      <Link
                        href={(typeof n.data?.actionUrl === "string" ? n.data.actionUrl : null) || `/admin/notifications/${n.id}`}
                        onClick={() => setNotifOpen(false)}
                        className={cn(
                          "flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-left transition-colors hover:bg-kampmax-muted/50",
                          !n.read ? "bg-kampmax-blue/[0.05]" : "bg-white opacity-85"
                        )}
                      >
                        <span className="flex items-center justify-between gap-2 text-sm font-medium text-kampmax-text">
                          <span className="flex items-center gap-2 min-w-0">
                            <span
                              aria-hidden
                              className={cn(
                                "h-2 w-2 shrink-0 rounded-full",
                                !n.read ? "bg-kampmax-blue ring-2 ring-kampmax-blue/20" : "bg-neutral-300"
                              )}
                            />
                            <span className={cn("truncate", !n.read ? "font-bold text-kampmax-text" : "font-normal text-kampmax-text/80")}>
                              {n.title}
                            </span>
                          </span>
                          <span className="shrink-0 text-[10px] text-kampmax-text-secondary">
                            {timeAgo(n.createdAt)}
                          </span>
                        </span>
                        <span className={cn("line-clamp-1 pl-4 text-xs", !n.read ? "text-kampmax-text/90 font-medium" : "text-kampmax-text-secondary")}>
                          {n.body}
                        </span>
                        <span className="flex items-center gap-1.5 pl-4 text-[10px] text-kampmax-text-secondary/70">
                          <TypeIcon className="h-3 w-3" />
                          <span>{notificationTypeLabel(n.type)}</span>
                          {n.recipientName && (
                            <>
                              <span>·</span>
                              <span className="truncate">{n.recipientName}</span>
                            </>
                          )}
                          <span className="ml-auto font-medium text-[9px] uppercase tracking-wider text-neutral-400">
                            {n.read ? "Read" : "New"}
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Profile & role */}
      <div className="relative" ref={profileRef}>
        <button
          type="button"
          onClick={() => setProfileOpen((o) => !o)}
          aria-expanded={profileOpen}
          aria-haspopup="menu"
          className="flex items-center gap-2 rounded-md p-1 pr-2 transition-colors hover:bg-kampmax-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-kampmax-blue text-xs font-bold text-white">
            {admin.avatar}
          </span>
          <span className="hidden text-left sm:block">
            <span className="block max-w-[140px] truncate text-xs font-semibold leading-tight text-kampmax-text">
              {admin.name}
            </span>
            <span className="block text-[10px] leading-tight text-kampmax-text-secondary">
              {ROLE_LABELS[admin.role]}
            </span>
          </span>
          <ChevronDown className="hidden h-4 w-4 text-kampmax-text-secondary sm:block" />
        </button>

        {profileOpen && (
          <div
            role="menu"
            className="absolute right-0 top-11 z-40 w-72 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-lg border border-kampmax-border bg-white shadow-lg"
          >
            <div className="border-b border-kampmax-border px-3.5 py-3">
              <p className="truncate text-sm font-semibold text-kampmax-text">{admin.name}</p>
              <p className="mt-0.5 truncate text-xs text-kampmax-text-secondary">{admin.email}</p>
              <p className="mt-1 inline-flex rounded-full bg-kampmax-blue/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-kampmax-blue">
                {ROLE_LABELS[admin.role]}
                {admin.role === "CAMPUS_ADMIN" && admin.campusId ? ` · ${admin.campusId.toUpperCase()}` : ""}
              </p>
            </div>

            {isSuperAdmin && admins.length > 1 && (
              <div className="px-3.5 py-2.5">
                <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-kampmax-text-secondary">
                  Switch account (demo · Super Admin only)
                </p>
                <ul className="space-y-0.5">
                  {admins.map((a) => (
                    <li key={a.id}>
                      <button
                        type="button"
                        role="menuitemradio"
                        aria-checked={a.id === admin.id}
                        onClick={() => void handleSwitchAccount(a.id)}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-kampmax-muted",
                          a.id === admin.id && "font-semibold text-kampmax-blue"
                        )}
                      >
                        <UserCog className="h-3.5 w-3.5 shrink-0 text-kampmax-text-secondary" />
                        <span className="min-w-0 flex-1 truncate">{a.name}</span>
                        <span className="shrink-0 text-[10px] text-kampmax-text-secondary">
                          {ROLE_LABELS[a.role]}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="border-t border-kampmax-border">
              <Link
                href="/admin/settings"
                role="menuitem"
                onClick={() => setProfileOpen(false)}
                className="flex items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/50"
              >
                <Settings className="h-3.5 w-3.5 text-kampmax-text-secondary" />
                Platform settings
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={() => void handleSignOut()}
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-xs font-medium text-kampmax-error transition-colors hover:bg-kampmax-error/5"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}