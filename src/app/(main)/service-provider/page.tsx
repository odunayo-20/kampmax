"use client";

import { latestPaymentLine } from "@/lib/hub-common";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useServiceProviderReviewsSummary } from "@/hooks/use-service-provider-dashboard";
import { Skeleton } from "@/components/ui/Skeleton";
import { PROFILE_KEY } from "@/components/service-provider/dashboard/ProfessionalDetailsEditor";
import { cn } from "@/lib/utils";
import {
  availableFooter,
  moneyText,
  onTheWayFooter,
  providerNextStep,
  requestsCallout,
  setupSteps,
  todayLine,
  verificationNotice,
} from "@/lib/provider-hub";
import { fetchProviderBookingSummary, fetchProviderBookings } from "@/services/booking";
import { fetchMyWallet, fetchMyWalletTransactions } from "@/services/wallet";
import { formatNaira } from "@/lib/utils";
import { fetchMyPortfolio } from "@/services/service-provider-media";
import { fetchSpHours, fetchSpProfileDetails, fetchSpServicesLive } from "@/services/service-provider-dashboard";

/** The provider's home: money first, requests waiting, today's job, then the one thing to do next. */
export default function ServiceProviderOverviewPage() {
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: fetchSpProfileDetails, retry: false });
  // Everything else waits for the profile, so a failure there does not fire a string of requests that would fail too.
  const ready = !!profile.data;
  const stats = useQuery({ queryKey: ["bookings", "provider", "summary"], queryFn: fetchProviderBookingSummary, enabled: ready, retry: false });
  const next = useQuery({
    queryKey: ["bookings", "provider", "next"],
    queryFn: async () => (await fetchProviderBookings({ status: "upcoming", limit: 1 })).items[0] ?? null,
    enabled: ready,
    retry: false,
  });
  const wallet = useQuery({ queryKey: ["wallet", "provider-home"], queryFn: fetchMyWallet, enabled: ready, retry: false });
  const services = useQuery({ queryKey: ["service-provider", "services"], queryFn: fetchSpServicesLive, enabled: ready, retry: false });
  const hours = useQuery({ queryKey: ["service-provider", "hours"], queryFn: fetchSpHours, enabled: ready, retry: false });
  const portfolio = useQuery({ queryKey: ["service-provider", "portfolio"], queryFn: fetchMyPortfolio, enabled: ready, retry: false });
  // Optional lines: left out when they can't load.
  const recent = useQuery({ queryKey: ["wallet", "recent"], queryFn: () => fetchMyWalletTransactions({ page: 1, limit: 5 }), enabled: ready, retry: false });
  const reviews = useServiceProviderReviewsSummary().data;

  if (profile.isPending) return <ServiceProviderOverviewSkeleton />;

  if (!profile.data) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        We couldn&apos;t load your dashboard.{" "}
        <button
          type="button"
          onClick={() => void profile.refetch()}
          disabled={profile.isFetching}
          className="font-semibold text-primary-600 hover:underline disabled:opacity-60"
        >
          {profile.isFetching ? "Retrying…" : "Try again"}
        </button>
      </div>
    );
  }

  const p = profile.data;
  const s = stats.data;
  const money = s?.money;
  const requests = requestsCallout(s?.pending ?? 0, money?.awaitingAnswer);
  const today = todayLine(s, next.data);
  const latest = latestPaymentLine(recent.data ?? [], formatNaira);
  const notice = verificationNotice(p.verificationStatus);
  // Wait for the counts so the banner never says "nothing done" while they are still loading.
  const loaded = services.isSuccess && hours.isSuccess && portfolio.isSuccess;
  const step = loaded
    ? providerNextStep(
        setupSteps({
          hasPicture: !!p.logoUrl,
          services: services.data.length,
          liveServices: services.data.filter((x) => x.status === "active").length,
          hours: hours.data.length,
          portfolio: portfolio.data.length,
        })
      )
    : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-kampmax-text">{p.displayName}</h1>
        <Link
          href={`/services/providers/${p.slug}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View public profile
        </Link>
      </div>

      {/* Money: what can be spent, and what is on its way once customers confirm */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/service-provider/financials" className="rounded-xl bg-primary-600 p-5 text-white hover:bg-primary-700">
          <p className="text-xs font-semibold text-primary-100">Available</p>
          <p className="mt-1 text-2xl font-bold">{moneyText(wallet.data?.balance)}</p>
          <p className="mt-1 text-xs text-primary-100">{availableFooter(wallet.data?.pendingAmount, money)}</p>
          <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold">
            Withdraw <ArrowRight className="h-4 w-4" aria-hidden />
          </p>
        </Link>
        <Link href="/service-provider/bookings" className="rounded-xl border border-kampmax-border bg-white p-5 hover:border-primary-300">
          <p className="text-xs font-semibold text-kampmax-text-secondary">On the way</p>
          <p className="mt-1 text-2xl font-bold text-kampmax-text">{moneyText(money?.onTheWay)}</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">{onTheWayFooter(money)}</p>
        </Link>
      </div>

      {latest && (
        <Link href="/service-provider/financials" className="block rounded-xl border border-kampmax-border bg-white px-4 py-3 text-sm text-kampmax-text hover:bg-neutral-50">
          {latest}
        </Link>
      )}

      {requests && (
        <Link
          href="/service-provider/bookings"
          className="flex items-center gap-3 rounded-xl border-2 border-warning-300 bg-white p-4 hover:bg-warning-50"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-kampmax-text">{requests.title}</p>
            <p className="text-sm text-kampmax-text-secondary">{requests.text}</p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning-700">
            Review <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </Link>
      )}

      {today && (
        <Link href="/service-provider/bookings" className="block rounded-xl border border-kampmax-border bg-white p-4 hover:border-primary-300">
          <p className="text-sm font-bold text-kampmax-text">{today.title}</p>
          <p className="text-sm text-kampmax-text-secondary">{today.detail}</p>
        </Link>
      )}

      {notice && (
        <div
          role="status"
          className={cn("rounded-xl p-4 text-sm", notice.blocked ? "bg-error-50 text-error-800" : "bg-warning-50 text-warning-900")}
        >
          <p className="font-bold">{notice.title}</p>
          <p className="mt-0.5">{notice.body}</p>
          {notice.blocked && (
            <Link href="/support" className="mt-2 inline-block font-semibold underline">
              Contact support
            </Link>
          )}
        </div>
      )}

      {s && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Count label="Requests" value={s.pending} tab="pending" />
          <Count label="Upcoming" value={s.upcoming} tab="upcoming" />
          <Count label="In progress" value={s.inProgress} tab="in_progress" />
          <Count label="Completed" value={s.completed} tab="completed" />
        </div>
      )}

      {step && (
        <Link href={step.href} className="flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50 p-4 hover:bg-primary-100">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-primary-700">
              Get more bookings · {step.progress}
            </p>
            <p className="text-sm font-bold text-kampmax-text">{step.title}</p>
            <p className="text-sm text-kampmax-text-secondary">{step.hint}</p>
          </div>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary-600" aria-hidden />
        </Link>
      )}

      {reviews && (
        <Link href="/service-provider/reviews" className="flex items-center justify-between rounded-xl border border-kampmax-border bg-white p-4 hover:border-primary-300">
          <div>
            <p className="text-sm font-bold text-kampmax-text">Reviews</p>
            <p className="text-sm text-kampmax-text-secondary">
              {reviews.averageRating === null
                ? "No reviews yet"
                : `${reviews.averageRating.toFixed(1)} out of 5 from ${reviews.totalCount} ${reviews.totalCount === 1 ? "review" : "reviews"}`}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-neutral-400" aria-hidden />
        </Link>
      )}
    </div>
  );
}

function Count({ label, value, tab }: { label: string; value: number; tab: string }) {
  return (
    <Link href={`/service-provider/bookings?tab=${tab}`} className="rounded-xl border border-kampmax-border bg-white p-4 hover:border-primary-300">
      <p className="text-xs font-semibold text-kampmax-text-secondary">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-kampmax-text">{value}</p>
    </Link>
  );
}

function ServiceProviderOverviewSkeleton() {
  return (
    <div role="status" aria-busy="true" aria-label="Loading dashboard" className="space-y-6">
      <Skeleton className="h-8 w-64 max-w-full" />
      <div className="grid gap-4 sm:grid-cols-2">
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
      <Skeleton className="h-20 rounded-xl" />
      <span className="sr-only">Loading dashboard</span>
    </div>
  );
}
