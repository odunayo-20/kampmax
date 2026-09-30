"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Wrench, LogIn, User, Home } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/atoms/Button";

/**
 * Public header for the customer-facing service marketplace. Guests can browse
 * everything — authentication is only required for actions (favorite, book,
 * request quote, report). The brand deep-links back to /services.
 */
import { Logo } from "@/components/ui/Logo";

export function ServiceMarketplaceHeader() {
  const { status, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    await logout();
    router.push(`/login?returnTo=${encodeURIComponent(pathname || "/services")}`);
  }

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200/90 shadow-2xs">
      <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <Logo size="sm" href="/home" />
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold border border-purple-200/60">
            Services
          </span>
          <Link
            href="/home"
            className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            Home
          </Link>
          <Link
            href="/explore"
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            Explore
          </Link>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {status === "authenticated" && user ? (
            <>
              <Link
                href="/profile"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-text hover:text-primary-600"
              >
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">My account</span>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Log out
              </Button>
            </>
          ) : (
            <Link
              href="/login?returnTo=/services"
              className="inline-flex items-center gap-1.5 rounded-md bg-kampmax-navy text-white px-4 py-2 text-sm font-semibold hover:bg-kampmax-navy-light"
            >
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}