"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  EMPLOYER_DASHBOARD_GATE,
  getEmployerDashboardAccessApi,
  isEmployerDashboardPath,
  isEmployerGateExemptPath,
  type EmployerAccess,
} from "@/services/employer";
import { EmployerAccessGate } from "@/components/employer/EmployerAccessGate";
import { EmployerSidebar } from "@/components/employer/EmployerSidebar";
import { EmployerOnboardingStatus } from "@/types/employer";
import { ProfileSwitcher } from "@/components/vendor-dashboard/ProfileSwitcher";

/**
 * Employer module shell.
 *
 * - The dashboard path is gated. The gate is backend-authoritative (reads
 *   GET /employers/me via getEmployerDashboardAccessApi) — this UI never
 *   grants access on its own.
 * - Mirrors the freelancer dashboard shell pattern (Module 26A/B).
 */
export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [access, setAccess] = useState<EmployerAccess | null>(null);
  const [loadError, setLoadError] = useState(false);

  const dashboardPath = isEmployerDashboardPath(pathname);

  useEffect(() => {
    if (!dashboardPath || status !== "authenticated") return;
    let cancelled = false;
    setAccess(null);
    setLoadError(false);
    getEmployerDashboardAccessApi()
      .then((result) => { if (!cancelled) setAccess(result); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [dashboardPath, status, pathname]);

  if (!dashboardPath) {
    return <>{children}</>;
  }

  if (status === "loading" || (status === "authenticated" && !access && !loadError)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kampmax-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-kampmax-blue/20 border-t-kampmax-blue" />
      </div>
    );
  }

  if (loadError || !access) {
    return (
      <EmployerAccessGate
        access={{
          kind: EMPLOYER_DASHBOARD_GATE.NO_EMPLOYER,
          status: null,
          canUseDashboard: false,
          message: "We couldn't load your employer profile. Please try again.",
        }}
      >
        {children}
      </EmployerAccessGate>
    );
  }

  const gateExempt = isEmployerGateExemptPath(pathname);

  // The profile page is exempt from the approval gate so an employer can view /
  // edit their profile in any onboarding state (an onboarding CTA is shown when
  // incomplete). Everything else inside the shell is gated.
  if (!gateExempt && !access.canUseDashboard) {
    return <EmployerAccessGate access={access}>{children}</EmployerAccessGate>;
  }

  const displayName = access.displayName ?? "Employer";
  const statusLabel = access.status ?? ("APPROVED" as EmployerOnboardingStatus);

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <EmployerSidebar name={displayName} status={statusLabel} />
      </aside>

      {/* Mobile header with drawer */}
      <div className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-kampmax-border bg-kampmax-navy px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-md p-1.5 text-white hover:bg-white/10"
        >
          <Menu className="h-5 w-5" aria-hidden />
        </button>
        <span className="truncate text-sm font-bold text-white">{displayName}</span>
        <div className="[&_button]:text-white [&_button:hover]:bg-white/10">
          <ProfileSwitcher />
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-kampmax-navy/60"
            aria-hidden
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-72 bg-kampmax-navy">
            <div className="flex items-center justify-between px-4 pt-3">
              <span className="text-sm font-bold text-white">{displayName}</span>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="rounded-md p-1.5 text-white hover:bg-white/10"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">
              <EmployerSidebar name={displayName} status={statusLabel} />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <div className="hidden items-center justify-end border-b border-kampmax-border bg-white px-4 py-2 lg:flex lg:px-8">
          <ProfileSwitcher />
        </div>
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <div key={pathname}>{children}</div>
        </main>
      </div>
    </div>
  );
}