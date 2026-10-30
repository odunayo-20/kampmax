"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";

const START_HREF = "/onboarding/service-provider/1";
const REGISTER_HREF = "/register?role=service_provider";
const SIGN_IN_HREF = `/login?returnTo=${encodeURIComponent(START_HREF)}`;

const BUTTON_CLASS =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-primary-600 px-8 text-base font-semibold tracking-tight text-white transition-colors hover:bg-[#1258C7] active:bg-[#0F4CAD] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 sm:w-auto";

/**
 * The page's main call to action. A signed-in visitor starts the application; a
 * guest — the usual visitor of this page — is asked to create an account first and
 * lands back in the application afterwards, rather than at a dead end on step 1.
 *
 * While the session is still being checked it offers the signed-in link, which is
 * safe: the application itself sends a guest to sign in (see `useRequireSignIn`).
 */
export function StartApplicationCta({
  compact = false,
  className,
}: {
  /** Drops the "already have an account" line, for tight spaces like the sticky bar. */
  compact?: boolean;
  className?: string;
}) {
  const { status } = useAuth();
  const isGuest = status === "unauthenticated";

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <Link href={isGuest ? REGISTER_HREF : START_HREF} className={BUTTON_CLASS}>
        {isGuest ? "Create a free account to start" : "Start Your Application"}
        <ArrowRight className="h-5 w-5" aria-hidden />
      </Link>
      {isGuest && !compact && (
        <p className="text-sm text-kampmax-text-secondary">
          Already have an account?{" "}
          <Link href={SIGN_IN_HREF} className="font-semibold text-primary-600 hover:underline">
            Sign in
          </Link>
        </p>
      )}
    </div>
  );
}

/** The same call to action pinned to the bottom of the screen on phones. */
export function StickyStartApplicationBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-kampmax-border bg-white/95 px-4 py-3 backdrop-blur sm:hidden">
      <StartApplicationCta compact />
    </div>
  );
}
