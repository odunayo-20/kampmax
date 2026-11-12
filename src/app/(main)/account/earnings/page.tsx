"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { WalletWithdrawals } from "@/components/wallet/WalletWithdrawals";
import { WalletActivity } from "@/components/wallet/WalletActivity";
import { PROFILE_DEFINITIONS, useMyProfiles, type ProfileId } from "@/hooks/use-my-profiles";

/** Where each profile keeps its own detailed reports, beyond the shared wallet. */
const DETAIL_LINKS: Partial<Record<ProfileId, { href: string; label: string }>> = {
  vendor: { href: "/vendor/financials", label: "Sales statements and payouts" },
  freelancer: { href: "/freelancer/earnings", label: "Freelance earnings" },
  service: { href: "/service-provider/financials", label: "Service bookings and payouts" },
};

/**
 * One Earnings surface. Every earning role (vendor, freelancer, service
 * provider, agent) is paid into the same per-user wallet, so the balance,
 * withdrawals and activity are shown once here instead of three copies. Role
 * specific reporting (e.g. a vendor's sales statements) stays one link away.
 */
export default function EarningsPage() {
  const { data: states } = useMyProfiles();
  const details = PROFILE_DEFINITIONS.filter((p) => states?.[p.id]?.status === "active" && DETAIL_LINKS[p.id]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-kampmax-text">Earnings</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Everything you earn on Kampmax, from every profile, in one wallet. Withdraw to your bank account any time.
        </p>
      </header>

      <WalletWithdrawals />

      <section aria-labelledby="recent-activity" className="space-y-3">
        <h2 id="recent-activity" className="text-lg font-semibold text-kampmax-text">
          Recent activity
        </h2>
        <WalletActivity />
      </section>

      {details.length > 0 && (
        <section aria-labelledby="detailed-reports" className="space-y-2">
          <h2 id="detailed-reports" className="text-sm font-bold text-kampmax-text">
            Detailed reports
          </h2>
          <ul className="space-y-2">
            {details.map((p) => (
              <li key={p.id}>
                <Link
                  href={DETAIL_LINKS[p.id]!.href}
                  className="flex items-center justify-between rounded-lg border border-kampmax-border bg-white px-4 py-3 text-sm font-semibold text-kampmax-text hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  <span>
                    {p.label}: <span className="font-medium text-kampmax-text-secondary">{DETAIL_LINKS[p.id]!.label}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-primary-600" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
