"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, X, ArrowRight, Bell, Handshake } from "lucide-react";
import { timeAgo } from "@/lib/utils";
import { getFreelancerDashboardApi, getFreelancerDashboardAccessApi, getFreelancerNotificationSummary } from "@/services/freelancer-dashboard";
import { FreelancerMetricCard } from "@/components/freelancer/dashboard/FreelancerMetricCard";
import { FreelancerQuickActions } from "@/components/freelancer/dashboard/FreelancerQuickActions";
import { FreelancerProfileStatusCard } from "@/components/freelancer/dashboard/FreelancerProfileStatusCard";
import { FreelancerProfilePreview } from "@/components/freelancer/dashboard/FreelancerProfilePreview";
import { FreelancerAvailability } from "@/components/freelancer/dashboard/FreelancerAvailability";
import { FreelancerActivityFeed } from "@/components/freelancer/dashboard/FreelancerActivityFeed";
import { FreelancerEmptySection } from "@/components/freelancer/dashboard/FreelancerEmptySection";
import { FreelancerNextContractAction } from "@/components/freelancer/dashboard/FreelancerNextContractAction";
import { FreelancerFinancialSummary } from "@/components/freelancer/dashboard/FreelancerFinancialSummary";

export default function FreelancerDashboardPage() {
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getFreelancerDashboardApi>>>(null);
  const [loading, setLoading] = useState(true);
  const [notif] = useState(() => getFreelancerNotificationSummary());
  const [showWelcome, setShowWelcome] = useState(true);
  const [displayName, setDisplayName] = useState("Freelancer");

  useEffect(() => {
    void Promise.all([getFreelancerDashboardApi(), getFreelancerDashboardAccessApi()]).then(([data, access]) => {
      setDashboard(data);
      setDisplayName(access.displayName ?? "Freelancer");
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  if (!dashboard) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        Dashboard isn&apos;t available right now. Please refresh and try again.
      </div>
    );
  }

  const { profile, profileStatus, metrics, availability, activity } = dashboard;

  return (
    <div className="space-y-6">
      <FreelancerQuickActions displayName={displayName} />

      {/* Welcome guidance (dismissible) */}
      {showWelcome && (
        <div className="relative overflow-hidden rounded-xl border border-primary-200 bg-primary-50 p-5">
          <button
            type="button"
            onClick={() => setShowWelcome(false)}
            aria-label="Dismiss guidance"
            className="absolute right-3 top-3 rounded-md p-1 text-primary-400 hover:bg-primary-100 hover:text-primary-700"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-primary-600 ring-1 ring-primary-200">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-bold text-kampmax-text">Make the most of your profile</h2>
              <p className="mt-1 text-sm text-kampmax-text-secondary">
                Keep your profile complete and your availability up to date to get found by clients.
                Browse-work, proposals and contracts are coming soon.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <FreelancerMetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      {/* Profile status + availability */}
      <div className="grid gap-4 lg:grid-cols-2">
        <FreelancerProfileStatusCard profileStatus={profileStatus} />
        <div className="space-y-4">
          <FreelancerAvailability status={availability.status} label={availability.label} />
          <div className="rounded-xl border border-kampmax-border bg-white p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-kampmax-text-secondary" aria-hidden />
              <h2 className="text-sm font-bold text-kampmax-text">Notifications</h2>
              {notif.unreadCount > 0 && (
                <span className="rounded-full bg-error-50 px-2 py-0.5 text-[10px] font-semibold text-error-700">
                  {notif.unreadCount} unread
                </span>
              )}
            </div>
            {notif.sample.length > 0 ? (
              <ul className="mt-3 space-y-2">
                {notif.sample.slice(0, 3).map((n) => (
                  <li key={n.id}>
                    <p className="text-sm text-kampmax-text">{n.title}</p>
                    <p className="text-xs text-kampmax-text-secondary">{n.body}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-xs text-kampmax-text-secondary">You&apos;re all caught up.</p>
            )}
          </div>
        </div>
      </div>

      {/* Profile preview */}
      <FreelancerProfilePreview profile={profile} displayName={displayName} />

      {/* Future-module empty sections (M23–M25) */}
      <section aria-label="Your work at a glance">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-kampmax-text">Find work & grow</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FreelancerEmptySection id="opportunities" href="/freelancer/dashboard" />
          <FreelancerEmptySection id="proposals" href="/freelancer/dashboard" />
          <Link
            href="/freelancer/contracts"
            className="group relative flex flex-col items-start gap-3 rounded-xl border border-kampmax-border bg-white p-5 transition-shadow hover:shadow-md"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success-50 text-success-600">
              <Handshake className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <p className="text-sm font-bold text-kampmax-text">Your contracts</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">
                {dashboard.contracts.active} active · {dashboard.contracts.completed} completed
              </p>
            </div>
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 group-hover:underline">
              Manage contracts <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
          <FreelancerFinancialSummary />
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FreelancerActivityFeed events={activity} />
        </div>
        <div className="space-y-4">
          <FreelancerNextContractAction />
          <div className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="text-sm font-bold text-kampmax-text">Next steps</h2>
            <ul className="mt-3 space-y-2">
              {profileStatus.missing.length > 0 ? (
                profileStatus.missing.slice(0, 4).map((m) => (
                  <li key={m.key}>
                    <a
                      href={m.href}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-kampmax-text hover:bg-neutral-50"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary-600" aria-hidden />
                      <span className="flex-1">{m.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
                    </a>
                  </li>
                ))
              ) : (
                <li className="text-sm text-kampmax-text-secondary">
                  Your profile is complete. {timeAgo(new Date().toISOString())}
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
