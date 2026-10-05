"use client";

// ============================================================
// ADMIN SHELL + AUTH BOUNDARY (Module 34)
//
// Every /admin route passes through this boundary. The frontend never
// authorizes: it only gates the UI for UX (spinner while the session
// resolves, clear 401/403 states). Authorization itself lives in the
// admin auth service (the backend surrogate) - this guard is the last
// layer of presentation, never a security claim. The /admin/login and
// /admin/access-denied routes render standalone (no console chrome).
// ============================================================

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";
import { Ban, Eye, Lock, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminUI } from "@/lib/admin/admin-ui-context";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canSeeSection, AdminNavItemKey } from "@/lib/admin/permissions";
import { AdminSidebar, AdminMobileSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import type { AdminRole } from "@/types/admin";

const SEGMENT_TO_KEY: Record<string, AdminNavItemKey> = {
  users: "users",
  campuses: "campuses",
  vendors: "vendors",
  marketplace: "marketplace",
  jobs: "jobs",
  freelancers: "freelancers",
  employers: "employers",
  verifications: "verifications",
  products: "products",
  categories: "categories",
  orders: "orders",
  transactions: "transactions",
  payouts: "payouts",
  finance: "finance",
  wallet: "wallet",
  withdrawals: "withdrawals",
  promotions: "promotions",
  campus: "campusFeed",
  reports: "reports",
  reviews: "reviews",
  disputes: "disputes",
  notifications: "notifications",
  settings: "settings",
  permissions: "permissions",
  "audit-logs": "auditLogs",
  security: "security",
  support: "support",
  blog: "blog",
};

function sectionDenied(pathname: string, role: AdminRole): boolean {
  if (pathname === "/admin") return false;
  const segment = pathname.split("/")[2];
  if (!segment) return false;
  const key = SEGMENT_TO_KEY[segment];
  if (!key) return false; // unknown/detail segment - let the route render
  return !canSeeSection(role, key);
}

function SessionLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-kampmax-bg">
      <div className="flex h-10 w-10 animate-pulse items-center justify-center rounded-md bg-kampmax-navy text-sm font-black text-kampmax-gold">
        K
      </div>
      <p className="text-sm text-kampmax-text-secondary">Checking session…</p>
    </div>
  );
}

function UnauthorizedState() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-kampmax-bg p-4">
      <div className="w-full max-w-sm rounded-lg border border-kampmax-border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-kampmax-error/10">
          <Lock className="h-5 w-5 text-kampmax-error" />
        </div>
        <h1 className="mt-3 text-base font-semibold text-kampmax-text">
          Admin sign-in required
        </h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          This area is restricted to platform operators. Sign in with an
          operator account to continue.
        </p>
        <Link
          href="/admin/login"
          className="mt-4 inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-kampmax-blue px-4 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue-dark"
        >
          Sign in to Kampmax Admin
        </Link>
        <p className="mt-3 text-[11px] leading-relaxed text-kampmax-text-secondary/70">
          401 · The session could not be restored. If you were signed in, your
          session may have expired.
        </p>
      </div>
    </div>
  );
}

function ForbiddenState() {
  const { logout } = useAdminSession();

  return (
    <div className="flex min-h-screen items-center justify-center bg-kampmax-bg p-4">
      <div className="w-full max-w-sm rounded-lg border border-kampmax-border bg-white p-6 text-center shadow-sm">
        <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-kampmax-warning/15">
          <Ban className="h-5 w-5 text-amber-600" />
        </div>
        <h1 className="mt-3 text-base font-semibold text-kampmax-text">
          Access denied
        </h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Your operator role does not include permission for this section.
          Super Admins can adjust role permissions in the console.
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <Link
            href="/admin"
            className="inline-flex h-9 items-center justify-center rounded-md border border-kampmax-border bg-white px-4 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60"
          >
            Back to dashboard
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex h-9 items-center justify-center rounded-md bg-kampmax-navy px-4 text-sm font-medium text-white transition-colors hover:bg-kampmax-navy/90"
          >
            Sign out
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-kampmax-text-secondary/70">
          403 · This is a frontend guard only. The backend enforces the real
          permission boundary for every admin request.
        </p>
      </div>
    </div>
  );
}

function RouteUnauthorized() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-kampmax-bg">
      <div className="flex items-center gap-2 text-sm text-kampmax-text-secondary">
        <ShieldAlert className="h-4 w-4" />
        You are already signed in. Redirecting…
      </div>
    </div>
  );
}

/**
 * Impersonation-visibility banner (Module 52). While one operator is
 * viewing the console as another account, the switched identity stays
 * on screen with a one-click return to the original sign-in.
 */
function SwitchedAccountBanner() {
  const { admin, baseAdmin, isSwitchedAccount, switchBackToBase } =
    useAdminSession();
  if (!isSwitchedAccount || !admin) return null;
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-b border-amber-200 bg-amber-50 px-4 py-1.5 text-xs text-amber-900">
      <Eye className="h-3.5 w-3.5 shrink-0" />
      <span>
        Viewing as <span className="font-semibold">{admin.name}</span>
        <span className="text-amber-700"> ({admin.role})</span>
        {baseAdmin ? (
          <>
            {" · "}
            signed in as <span className="font-semibold">{baseAdmin.name}</span>
          </>
        ) : null}
      </span>
      <button
        type="button"
        onClick={() => void switchBackToBase()}
        className="rounded-md border border-amber-300 bg-white px-2 py-0.5 font-medium text-amber-900 transition-colors hover:bg-amber-100"
      >
        {baseAdmin
          ? `Return to ${baseAdmin.name}`
          : "Return to your account"}
      </button>
    </div>
  );
}

/**
 * Guard + chrome. The server layout renders this one component for the
 * whole /admin group, so pages stay free of auth concerns.
 */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { collapsed } = useAdminUI();
  const { status, admin } = useAdminSession();

  const isLoginPage = pathname === "/admin/login";

  if (isLoginPage) {
    return status === "authenticated" ? <RouteUnauthorized /> : children;
  }

  if (status === "loading") return <SessionLoading />;

  if (status === "unauthenticated") return <UnauthorizedState />;

  // At this point there IS an authenticated operator. Role-scope the UX.
  if (admin && sectionDenied(pathname, admin.role) && pathname !== "/admin/access-denied") {
    return <ForbiddenState />;
  }

  return (
    <div className="min-h-screen bg-kampmax-bg">
      <AdminSidebar />
      <AdminMobileSidebar />

      <div
        className={cn(
          "flex min-h-screen flex-col transition-[padding] duration-150",
          collapsed ? "lg:pl-[68px]" : "lg:pl-64"
        )}
      >
        <AdminHeader />
        <SwitchedAccountBanner />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-4 lg:px-6 lg:py-5">
          {children}
        </main>
      </div>
    </div>
  );
}