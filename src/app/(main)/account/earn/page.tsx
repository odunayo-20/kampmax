"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PROFILE_DEFINITIONS, useMyProfiles, type ProfileId } from "@/hooks/use-my-profiles";

/** Ways to earn, and the one way to hire. Order is the order we suggest them in. */
const EARN: ProfileId[] = ["vendor", "freelancer", "service", "agent"];
const HIRE: ProfileId[] = ["employer"];

/**
 * The single "become a seller / earner" entry. Every place that used to offer
 * its own onboarding link (home strip, menus, empty states) points here, so a
 * person sees all the options once, in one place, instead of seven doors.
 * They all pay into the same wallet; nothing here is a separate account.
 */
export default function EarnPage() {
  const { data: states, isPending } = useMyProfiles();

  const section = (ids: ProfileId[], title: string, subtitle: string) => (
    <section aria-labelledby={`earn-${title}`} className="space-y-3">
      <div>
        <h2 id={`earn-${title}`} className="text-base font-bold text-kampmax-text">
          {title}
        </h2>
        <p className="text-xs text-kampmax-text-secondary">{subtitle}</p>
      </div>
      <ul className="space-y-3">
        {PROFILE_DEFINITIONS.filter((p) => ids.includes(p.id)).map((p) => {
          const Icon = p.icon;
          const held = states?.[p.id]?.status === "active";
          return (
            <li key={p.id}>
              <Link
                href={held ? p.activeHref : p.onboardHref}
                className="flex items-center gap-4 rounded-xl border border-kampmax-border bg-white p-4 transition-colors hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                  <Icon className="h-5 w-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-kampmax-text">
                    {p.onboardLabel}
                    {held && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success-50 px-2 py-0.5 text-[11px] font-medium text-success-700">
                        <Check className="h-3 w-3" aria-hidden /> You&apos;re set up
                      </span>
                    )}
                  </span>
                  <span className="block text-xs text-kampmax-text-secondary">{p.description}</span>
                </span>
                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary-600">
                  {held ? "Open" : "Start"} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Earn on Kampmax</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Pick how you want to earn. You can do more than one later. Everything you earn lands in the same Kampmax wallet.
        </p>
        {isPending && <p className="mt-2 text-xs text-kampmax-text-secondary">Checking what you already have set up…</p>}
      </header>
      {section(EARN, "Earn", "Sell, work or offer your services")}
      {section(HIRE, "Hire", "Post a job and find talent")}
      <p className="text-xs text-kampmax-text-secondary">
        Already earning?{" "}
        <Link href="/account/earnings" className="font-semibold text-primary-600 hover:underline">
          See all your earnings in one place
        </Link>
        .
      </p>
    </div>
  );
}
