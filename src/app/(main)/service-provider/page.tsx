"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, ExternalLink, Images, Plus, Sparkles, Wrench, X } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import {
  computeProfileCompletionFromLive,
  fetchSpDashboardLive,
  fetchSpReviewsSummaryLive,
} from "@/services/service-provider-dashboard";
import { ServiceProviderMetricCard } from "@/components/service-provider/dashboard/ServiceProviderMetricCard";
import { ServiceProviderVerificationBadge } from "@/components/service-provider/dashboard/ServiceProviderStatusBadge";
import type {
  ServiceProviderActivityEvent,
  ServiceProviderDashboardMetric,
  ServiceProviderDashboardRecord,
  ServiceProviderProfileCompletion,
  ServiceProviderReviewsSummary,
} from "@/types/service-provider-dashboard";
import type { ServiceProviderActivityKind } from "@/types/service-provider-dashboard";

const ACTIVITY_ICON: Record<ServiceProviderActivityKind, string> = {
  profile_approved: "✅",
  verification_updated: "🛡️",
  service_activated: "🚀",
  service_deactivated: "⏸️",
  service_updated: "🔧",
  service_created: "➕",
  review_received: "⭐",
  portfolio_item_added: "🖼️",
  portfolio_item_updated: "🖼️",
  availability_updated: "🗓️",
  booking_request: "📅",
  payout_update: "💰",
  system_announcement: "📢",
};

export default function ServiceProviderOverviewPage() {
  const [dashboard, setDashboard] = useState<{
    record: ServiceProviderDashboardRecord;
    metrics: ServiceProviderDashboardMetric[];
    activity: ServiceProviderActivityEvent[];
  } | null>(null);
  const [completion, setCompletion] = useState<ServiceProviderProfileCompletion | null>(null);
  const [reviews, setReviews] = useState<ServiceProviderReviewsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    fetchSpDashboardLive()
      .then((live) => {
        if (cancelled) return;
        setDashboard(live);
        setCompletion(computeProfileCompletionFromLive(live.record));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
      });

    fetchSpReviewsSummaryLive()
      .then((revs) => {
        if (!cancelled) setReviews(revs);
      })
      .catch(() => {
        // The rest of the page still works; the ratings card is simply left out.
      });

    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loading && !dashboard) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!dashboard || !completion) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        {failed ? "We couldn't load your dashboard." : "Dashboard isn't available right now."}{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { record, metrics, activity } = dashboard;
  const nextStep = completion.missing[0];

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Hey {record.profile.displayName}!</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Here&apos;s what&apos;s happening with your services today.
          </p>
        </div>
        <Link
          href={`/services/providers/${record.slug}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View Public Profile
        </Link>
      </div>

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
                Complete your profile and keep your services up to date to get found by students near {record.location.primaryCampusId ?? "your campus"}.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {metrics.map((metric) => (
          <ServiceProviderMetricCard key={metric.key} metric={metric} />
        ))}
      </div>

      {/* Completion + quick actions */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-kampmax-border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-kampmax-text">Finish setting up your profile</h2>
            <span className="text-sm font-bold text-primary-600">{completion.percentage}%</span>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-neutral-200" role="progressbar" aria-valuenow={completion.percentage} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={cn("h-full rounded-full", completion.percentage === 100 ? "bg-success-600" : "bg-primary-600")}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {completion.percentage === 100 ? (
            <p className="mt-4 text-sm text-kampmax-text-secondary">
              Your profile is fully set up. 🎉 Keep your services and availability fresh to stay at the top of results.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {completion.missing.slice(0, 5).map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-kampmax-text hover:bg-neutral-50"
                >
                  <span className="h-1.5 w-1.5 grow-0 rounded-full bg-primary-600" aria-hidden />
                  <span className="flex-1">
                    <span className="font-medium">{item.label}</span>
                    <span className="ml-2 text-kampmax-text-muted">{item.description}</span>
                  </span>
                  <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden />
                </Link>
              ))}
              {nextStep && (
                <Link
                  href={nextStep.href}
                  className="mt-1 inline-flex items-center gap-1 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
                >
                  {nextStep.label} <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-kampmax-text">Quick actions</h2>
          <QuickActionLink href="/service-provider/services/new" icon={Plus} title="Add a service" description="Create a new service listing" />
          <QuickActionLink href="/service-provider/availability" icon={CalendarDays} title="Update availability" description="Weekly schedule & fees" />
          <QuickActionLink href="/service-provider/portfolio" icon={Images} title="Manage portfolio" description="Showcase your best work" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent activity */}
        <div className="rounded-xl border border-kampmax-border bg-white p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-kampmax-text">Recent activity</h2>
            <Link href="/service-provider/services" className="text-xs font-medium text-primary-600 hover:underline">
              View services
            </Link>
          </div>
          <ul className="mt-4 divide-y divide-kampmax-border">
            {activity.slice(0, 6).map((event) => (
              <li key={event.id}>
                {event.href ? (
                  <Link href={event.href} className="flex items-start gap-3 py-3 hover:bg-neutral-50">
                    <ActivityRow icon={ACTIVITY_ICON[event.kind]} title={event.title} message={event.message} createdAt={event.createdAt} />
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 py-3">
                    <ActivityRow icon={ACTIVITY_ICON[event.kind]} title={event.title} message={event.message} createdAt={event.createdAt} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>

        {/* Reviews + verification summary */}
        <div className="space-y-4">
          {reviews && (
            <div className="rounded-xl border border-kampmax-border bg-white p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-kampmax-text">Ratings & reviews</h2>
                <Link href="/service-provider/reviews" className="text-xs font-medium text-primary-600 hover:underline">
                  View all
                </Link>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="text-3xl font-bold text-kampmax-text">{reviews.averageRating === null ? "—" : reviews.averageRating.toFixed(1)}</span>
                <span className="text-yellow-500" aria-label={`${reviews.averageRating ?? 0} out of 5`}>
                  {"★★★★★".slice(0, Math.round(reviews.averageRating ?? 0))}
                  <span className="text-neutral-300">{"★★★★★".slice(Math.round(reviews.averageRating ?? 0))}</span>
                </span>
                <span className="text-xs text-kampmax-text-muted">({reviews.totalCount} reviews)</span>
              </div>
              <div className="mt-3 space-y-1">
                {reviews.distribution.map((d) => (
                  <div key={d.stars} className="flex items-center gap-2 text-xs text-kampmax-text-secondary">
                    <span className="w-6 text-right">{d.stars}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-neutral-200">
                      <div
                        className="h-full rounded-full bg-yellow-400"
                        style={{ width: `${reviews.totalCount ? (d.count / reviews.totalCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="w-6 text-kampmax-text-muted">{d.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-kampmax-border bg-white p-5">
            <h2 className="text-sm font-bold text-kampmax-text">Verification</h2>
            <div className="mt-3 flex items-center justify-between">
              <ServiceProviderVerificationBadge status={record.verification.status} />
              <Wrench className="h-5 w-5 text-neutral-300" aria-hidden />
            </div>
            <p className="mt-2 text-xs text-kampmax-text-muted">
              Verification status is set by Kampmax. You can&apos;t change it from the dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({ icon, title, message, createdAt }: { icon: string; title: string; message: string; createdAt: string }) {
  return (
    <>
      <span className="mt-0.5 text-base" aria-hidden>
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-kampmax-text">{title}</span>
        <span className="block text-xs text-kampmax-text-secondary">{message}</span>
      </span>
      <span className="shrink-0 text-[11px] text-kampmax-text-muted">{timeAgo(createdAt)}</span>
    </>
  );
}

function QuickActionLink({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof Plus;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-start gap-3 rounded-xl border border-kampmax-border bg-white p-4 hover:border-primary-300 hover:shadow-sm"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
        <Icon className="h-4 w-4" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-semibold text-kampmax-text">{title}</h3>
        <p className="text-xs text-kampmax-text-secondary">{description}</p>
      </div>
      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
    </Link>
  );
}