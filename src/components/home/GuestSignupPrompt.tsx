"use client";

import Link from "next/link";
import { UserPlus } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

/**
 * A quiet invitation at the end of the home page for visitors who aren't signed in:
 * after they've browsed, it says what an account unlocks. Shown only once we know they
 * are signed out, so signed-in people never see it flash up while the session loads.
 */
export function GuestSignupPrompt() {
  const { status } = useAuth();
  if (status !== "unauthenticated") return null;

  return (
    <section
      aria-label="Join Kampmax"
      className="flex flex-col gap-4 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-600 shadow-xs">
          <UserPlus className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="text-sm font-bold text-neutral-900">Ready to buy, sell or hire?</h2>
          <p className="mt-0.5 text-xs text-neutral-600">
            Create a free account to order, book services, message sellers and freelancers, and post your own listings.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        <Link
          href="/register"
          className="flex-1 rounded-xl bg-primary-600 px-4 py-2 text-center text-xs font-bold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2 sm:flex-none"
        >
          Create free account
        </Link>
        <Link
          href="/login"
          className="flex-1 rounded-xl border border-primary-200 bg-white px-4 py-2 text-center text-xs font-bold text-primary-700 transition-colors hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 sm:flex-none"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}
