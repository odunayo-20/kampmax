"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { MobileHeader } from "@/components/layout/MobileHeader";
import { DesktopNavigation } from "@/components/layout/DesktopNavigation";
import { BottomNavigation } from "@/components/layout/BottomNavigation";
import { useAuth } from "@/lib/auth-context";
import { Footer } from "@/components/layout/footer/Footer";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { isServiceProviderDashboardPath } from "@/lib/utils";
import { isFreelancerDashboardPath } from "@/services/freelancer-dashboard";
import { isEmployerDashboardPath } from "@/services/employer";

const PROTECTED_PREFIXES = [
  "/checkout",
  "/pay",
  "/orders",
  "/tickets",
  "/chat",
  "/profile",
  "/notifications",
  "/customer",
  "/scan",
  "/organizer",
  "/hub",
  "/community/create",
];

export function isProtectedPath(pathname: string): boolean {
  if (
    pathname.startsWith("/vendor") ||
    isServiceProviderDashboardPath(pathname) ||
    isFreelancerDashboardPath(pathname) ||
    isEmployerDashboardPath(pathname)
  ) {
    return true;
  }

  if (
    PROTECTED_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(prefix + "/")
    )
  ) {
    return true;
  }

  // Event checkout requires an authenticated account to issue tickets
  if (pathname.includes("/events/") && pathname.endsWith("/checkout")) {
    return true;
  }

  return false;
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const [bannerDismissed, setBannerDismissed] = useState(false);

  // Dashboard sections render their own full-screen shell (sidebar/header)
  const isVendorSection = pathname.startsWith("/vendor");
  const isServiceProviderSection = isServiceProviderDashboardPath(pathname);
  const isFreelancerSection = isFreelancerDashboardPath(pathname);
  const isEmployerSection = isEmployerDashboardPath(pathname);
  const isDashboardSection =
    isVendorSection || isServiceProviderSection || isFreelancerSection || isEmployerSection;

  const isProtected = isProtectedPath(pathname);

  useEffect(() => {
    if (status === "unauthenticated" && isProtected) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [status, isProtected, pathname, router]);

  // Session storage check for guest banner dismissal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("kampmax_guest_banner_dismissed");
      if (dismissed === "true") {
        setBannerDismissed(true);
      }
    }
  }, []);

  const handleDismissBanner = () => {
    setBannerDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("kampmax_guest_banner_dismissed", "true");
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-kampmax-bg">
        <div className="h-8 w-8 border-[3px] border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
      </div>
    );
  }

  // Block protected routes for unauthenticated users while redirect takes effect
  if (status === "unauthenticated" && isProtected) {
    return null;
  }

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Guest Mode Discovery Banner */}
      {status === "unauthenticated" && !isDashboardSection && !bannerDismissed && (
        <aside
          aria-label="Guest exploration notice"
          className="sticky top-0 z-50 bg-gradient-to-r from-blue-700 via-primary-700 to-indigo-800 text-white text-xs px-3.5 py-2 shadow-sm"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="inline-flex items-center gap-1 font-bold bg-white/20 px-2 py-0.5 rounded-full text-[10px] tracking-wide uppercase shrink-0">
                <Sparkles className="h-3 w-3" /> Guest Mode
              </span>
              <p className="truncate text-white/95 text-xs">
                <span className="hidden sm:inline">You are browsing Kampmax as a guest. </span>
                <span>Sign in to purchase, chat, save favorites, or post listings.</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/login?returnTo=${encodeURIComponent(pathname)}`}
                className="font-bold underline underline-offset-2 hover:text-white text-white/90 text-xs transition-colors"
              >
                Sign In
              </Link>
              <span className="text-white/40">|</span>
              <Link
                href="/register"
                className="bg-white text-primary-700 font-bold px-2.5 py-1 rounded-md text-[11px] hover:bg-neutral-100 transition-colors shadow-2xs"
              >
                Join
              </Link>
              <button
                onClick={handleDismissBanner}
                aria-label="Dismiss guest mode notice"
                className="p-1 hover:bg-white/20 rounded-md transition-colors ml-0.5 text-white/80 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </aside>
      )}

      {!isDashboardSection && <MobileHeader />}
      {!isDashboardSection && <DesktopNavigation />}
      <main className={isDashboardSection ? "" : "pb-20 lg:pb-6"}>{children}</main>
      {!isDashboardSection && <BottomNavigation />}
      {!isDashboardSection && <Footer />}
      {!isDashboardSection && <CartDrawer />}
    </div>
  );
}
