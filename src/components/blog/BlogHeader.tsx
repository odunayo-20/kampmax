"use client";

import Link from "next/link";
import { LogIn, User } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BLOG_BASE_PATH } from "@/lib/blog";
import { Logo } from "@/components/ui/Logo";

/**
 * Public blog header. Brand on the left, a small set of platform links that
 * collapse away on mobile, and an auth-aware action. The blog is a section of
 * Kampmax, not a separate site, so the brand links back to the platform.
 */
export function BlogHeader() {
  const { status, user } = useAuth();
  const link =
    "text-sm font-medium text-kampmax-text-secondary hover:text-kampmax-blue focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue rounded";
  return (
    <header className="sticky top-0 z-40 border-b border-kampmax-border bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <Logo href="/home" size="sm" />
          <span aria-hidden className="hidden h-5 w-px bg-kampmax-border sm:block" />
          <Link href={BLOG_BASE_PATH} className="text-sm font-semibold text-kampmax-navy">
            Blog
          </Link>
        </div>

        <nav aria-label="Kampmax" className="hidden items-center gap-6 md:flex">
          <Link href="/marketplace" className={link}>Marketplace</Link>
          <Link href="/services" className={link}>Services</Link>
          <Link href="/jobs" className={link}>Jobs</Link>
          <Link href="/events" className={link}>Events</Link>
        </nav>

        {status === "authenticated" && user ? (
          <Link
            href="/profile"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-kampmax-text hover:text-kampmax-blue"
          >
            <User aria-hidden className="h-4 w-4" />
            <span className="hidden sm:inline">My account</span>
            <span className="sr-only sm:hidden">My account</span>
          </Link>
        ) : (
          <Link
            href={`/login?returnTo=${BLOG_BASE_PATH}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-navy px-3.5 text-sm font-semibold text-white hover:bg-kampmax-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kampmax-blue"
          >
            <LogIn aria-hidden className="h-4 w-4" />
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
