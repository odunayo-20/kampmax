"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  getVendorAccess,
  getVendorPermissions,
} from "@/services/vendor-dashboard";
import { VENDOR_DASHBOARD_GATE } from "@/types/vendor-dashboard";
import { VendorAccessGate } from "@/components/vendor-dashboard/VendorAccessGate";
import { VendorSidebar } from "@/components/vendor-dashboard/VendorSidebar";
import { VendorTopbar } from "@/components/vendor-dashboard/VendorTopbar";

import { VerificationStatusBanner } from "@/components/verification/VerificationStatusBanner";
import { getVendorKycState } from "@/services/verification";

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const access = getVendorAccess();
  const permissions = getVendorPermissions();
  const kycState = getVendorKycState();

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-kampmax-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-kampmax-blue/20 border-t-kampmax-blue" />
      </div>
    );
  }

  if (!access.canUseDashboard || access.kind !== VENDOR_DASHBOARD_GATE.APPROVED) {
    return <VendorAccessGate access={access} />;
  }

  const storeName = access.storeName ?? "Vendor Dashboard";
  const storeSlug = access.storeSlug;

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <VendorSidebar
          storeName={storeName}
          permissions={permissions}
          status="approved"
        />
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
        <span className="truncate text-sm font-bold text-white">{storeName}</span>
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
              <span className="text-sm font-bold text-white">{storeName}</span>
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
              <VendorSidebar
                storeName={storeName}
                permissions={permissions}
                status="approved"
              />
            </div>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="lg:pl-64">
        <VendorTopbar storeName={storeName} storeSlug={storeSlug} />
        <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8 space-y-5">
          {pathname !== "/vendor/verification" && (
            <VerificationStatusBanner
              status={kycState.status}
              role="vendor"
              verificationHref="/vendor/verification"
            />
          )}
          <div key={pathname}>{children}</div>
        </main>
      </div>
    </div>
  );
}