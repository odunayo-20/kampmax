"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  FREELANCER_DASHBOARD_GATE,
  getFreelancerDashboardAccessApi,
  isFreelancerDashboardPath,
  type FreelancerAccess,
} from "@/services/freelancer-dashboard";
import { FreelancerAccessGate } from "@/components/freelancer/dashboard/FreelancerAccessGate";
import { FreelancerSidebar } from "@/components/freelancer/dashboard/FreelancerSidebar";
import { FreelancerTopbar } from "@/components/freelancer/dashboard/FreelancerTopbar";
import { FREELANCER_ONBOARDING_STATUS } from "@/types/freelancer";
import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { getFreelancerKycState } from "@/services/verification";

/**
 * Freelancer module shell.
 *
 * - The dashboard path is gated. The gate is backend-authoritative (reads
 *   GET /freelancers/me via getFreelancerDashboardAccessApi) — this UI
 *   never grants access on its own.
 * - Multi-role: the affirmed authenticated identity decides the freelancer
 *   record served. ProfileSwitcher in the topbar lets the user move between
 *   their Kampmax roles without breaking out of the authenticated session.
 */
export default function FreelancerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [access, setAccess] = useState<FreelancerAccess | null>(null);
  const [loadError, setLoadError] = useState(false);

  const dashboardPath = isFreelancerDashboardPath(pathname);

  useEffect(() => {
    if (!dashboardPath || status !== "authenticated") return;
    let cancelled = false;
    setAccess(null);
    setLoadError(false);
    getFreelancerDashboardAccessApi()
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
      <FreelancerAccessGate
        access={{
          kind: FREELANCER_DASHBOARD_GATE.NO_FREELANCER,
          status: null,
          canUseDashboard: false,
          message: "We couldn't load your freelancer profile. Please try again.",
        }}
      >
        {children}
      </FreelancerAccessGate>
    );
  }

  if (!access.canUseDashboard) {
    return <FreelancerAccessGate access={access}>{children}</FreelancerAccessGate>;
  }

  const displayName = access.displayName ?? "Freelancer";
  const statusLabel = access.status ?? FREELANCER_ONBOARDING_STATUS.APPROVED;

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <FreelancerSidebar name={displayName} status={statusLabel} />
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
        <span className="w-8" aria-hidden />
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
              <FreelancerSidebar name={displayName} status={statusLabel} />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <FreelancerTopbar displayName={displayName} status={statusLabel} />
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 space-y-5">
          {pathname !== "/freelancer/verification" && (
            <VerificationStatusBanner
              status={getFreelancerKycState().status}
              role="freelancer"
              verificationHref="/freelancer/verification"
            />
          )}
          <div key={pathname}>{children}</div>
        </main>
      </div>
    </div>
  );
}
