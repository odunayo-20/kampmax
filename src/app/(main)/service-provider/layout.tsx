"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { isServiceProviderDashboardPath } from "@/lib/utils";
import {
  getServiceProviderDashboardAccessApi,
  getSpProfileRecord,
  SERVICE_PROVIDER_DASHBOARD_GATE,
  type ServiceProviderAccess,
} from "@/services/service-provider-dashboard";
import { ServiceProviderAccessGate } from "@/components/service-provider/dashboard/ServiceProviderAccessGate";
import { ServiceProviderSidebar } from "@/components/service-provider/dashboard/ServiceProviderSidebar";
import { ServiceProviderTopbar } from "@/components/service-provider/dashboard/ServiceProviderTopbar";

/**
 * Service Provider module shell.
 *
 * - Public profile (/service-provider/[slug]) passes through untouched — it
 *   renders inside the (main) layout, not the dashboard shell.
 * - Every dashboard path is gated. The gate is backend-authoritative (reads
 *   GET /service-provider/profile/me) — this UI never grants access on its
 *   own.
 */
export default function ServiceProviderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [access, setAccess] = useState<ServiceProviderAccess | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Static dashboard sub-routes take precedence over the dynamic [slug] route.
  const isPublicProfile = !isServiceProviderDashboardPath(pathname);

  useEffect(() => {
    if (isPublicProfile || status !== "authenticated") return;
    let cancelled = false;
    setAccess(null);
    setLoadError(false);
    getServiceProviderDashboardAccessApi()
      .then((result) => { if (!cancelled) setAccess(result); })
      .catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [isPublicProfile, status, pathname]);

  if (isPublicProfile) {
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
      <ServiceProviderAccessGate
        access={{
          kind: SERVICE_PROVIDER_DASHBOARD_GATE.NO_PROVIDER,
          status: null,
          canUseDashboard: false,
          message: "We couldn't load your service provider profile. Please try again.",
        }}
      >
        {children}
      </ServiceProviderAccessGate>
    );
  }

  if (!access.canUseDashboard) {
    return <ServiceProviderAccessGate access={access}>{children}</ServiceProviderAccessGate>;
  }

  const providerName = access.displayName ?? "Service Provider";
  const slug = access.slug;
  const verification = getSpProfileRecord()?.verification.status ?? "not_required";

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <ServiceProviderSidebar providerName={providerName} status={access.status ?? "APPROVED"} />
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
        <span className="truncate text-sm font-bold text-white">{providerName}</span>
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
              <span className="text-sm font-bold text-white">{providerName}</span>
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
              <ServiceProviderSidebar providerName={providerName} status={access.status ?? "APPROVED"} />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <ServiceProviderTopbar providerName={providerName} slug={slug} verification={verification} />
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">
          <div key={pathname}>{children}</div>
        </main>
      </div>
    </div>
  );
}