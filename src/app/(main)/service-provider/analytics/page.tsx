"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { cn, formatNaira } from "@/lib/utils";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  bookingsPerDay,
  busiestDay,
  chartDays,
  compactNaira,
  completionRate,
  dayLabel,
  earningsNote,
  EARNINGS_FOOTNOTE,
  periodName,
  periodWindow,
  PROVIDER_PERIODS,
  statusPercentage,
  statusRows,
  topServices,
  type ProviderPeriod,
} from "@/lib/provider-analytics";
import { fetchProviderAnalytics, type ProviderAnalytics } from "@/services/provider-analytics";

const STATUS_COLOR: Record<string, string> = {
  COMPLETED: "bg-success-500",
  IN_PROGRESS: "bg-primary-500",
  ACCEPTED: "bg-primary-500",
  CONFIRMED: "bg-primary-500",
  PENDING: "bg-warning-500",
};

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** How the service business is doing: what it earned, who booked and when, and which services bring the money. */
export default function ProviderAnalyticsPage() {
  const [period, setPeriod] = useState<ProviderPeriod>("30d");
  const q = useQuery({ queryKey: ["service-provider", "analytics", period], queryFn: () => fetchProviderAnalytics(period), retry: false });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-kampmax-text">Analytics</h1>

      <div role="tablist" aria-label="Period" className="flex flex-wrap gap-2">
        {PROVIDER_PERIODS.map((p) => (
          <button
            key={p.value}
            type="button"
            role="tab"
            aria-selected={period === p.value}
            onClick={() => setPeriod(p.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition-colors",
              period === p.value
                ? "border-primary-600 bg-primary-50 text-primary-700"
                : "border-kampmax-border bg-white text-kampmax-text-secondary hover:border-primary-300"
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {q.isPending ? (
        <div role="status" aria-busy="true" aria-label="Loading analytics" className="space-y-4">
          <Skeleton className="h-36 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
        </div>
      ) : q.isError ? (
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
          We couldn&apos;t load your analytics.{" "}
          <button type="button" onClick={() => void q.refetch()} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <Report data={q.data} period={period} />
      )}
    </div>
  );
}

function Report({ data, period }: { data: ProviderAnalytics; period: ProviderPeriod }) {
  const { bookings } = data;
  const points = bookingsPerDay(bookings, chartDays(periodWindow(period)));
  const most = Math.max(1, ...points.map((p) => p.count));
  const services = topServices(bookings, data.titles);
  const statuses = statusRows(data.statuses);
  const statusTotal = statuses.reduce((n, s) => n + s.count, 0);
  const busiest = busiestDay(points);

  return (
    <>
      <section aria-label="Earnings" className="rounded-xl bg-primary-600 p-6 text-white">
        <p className="text-sm font-semibold text-primary-100">You earned · {periodName(period).toLowerCase()}</p>
        <p className="mt-1 text-3xl font-bold">{formatNaira(data.earnings.net)}</p>
        <p className="mt-1 text-xs text-primary-100">{earningsNote(data.earnings)}</p>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-primary-500 pt-4">
          <Stat label="Bookings" value={String(bookings.length)} />
          <Stat label="Completed" value={String(bookings.filter((b) => b.status === "COMPLETED").length)} />
          <Stat label="Finished well" value={bookings.length > 0 ? `${completionRate(bookings)}%` : "–"} />
        </dl>
      </section>

      <Card title="When people book" hint={bookings.length ? "Bookings made each day, for the last 10 days of this period." : undefined}>
        {bookings.length === 0 ? (
          <p className="text-sm text-kampmax-text-secondary">Nobody booked in this period. Share your page to get started.</p>
        ) : (
          <>
            <div className="flex h-36 items-end gap-2" role="img" aria-label={busiest ?? "Bookings per day"}>
              {points.map((p) => (
                <div key={p.day} className="flex flex-1 flex-col items-center justify-end gap-1">
                  <span className="text-xs font-semibold text-kampmax-text-secondary">{p.count || ""}</span>
                  <div className="w-full rounded-t bg-primary-500" style={{ height: `${Math.max(p.count > 0 ? 6 : 2, (p.count / most) * 100)}%`, opacity: p.count > 0 ? 1 : 0.25 }} />
                  <span className="text-[11px] text-kampmax-text-muted">{dayLabel(p.day).split(" ")[1]}</span>
                </div>
              ))}
            </div>
            {busiest && <p className="mt-3 text-sm text-kampmax-text-secondary">{busiest}</p>}
          </>
        )}
      </Card>

      <Card title="Services that earn" hint="Completed jobs in this period, best first.">
        {services.length === 0 ? (
          <p className="text-sm text-kampmax-text-secondary">No completed jobs in this period yet. Money shows here once a customer confirms a job.</p>
        ) : (
          <ul className="divide-y divide-kampmax-border">
            {services.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-kampmax-text">{s.title}</p>
                  <p className="text-xs text-kampmax-text-secondary">{plural(s.jobs, "job")}</p>
                </div>
                <span className="shrink-0 text-sm font-bold tabular-nums text-primary-700">{compactNaira(s.revenue)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="Where your bookings are" hint={statusTotal ? `${plural(statusTotal, "booking")} in total, all time.` : undefined}>
        {statuses.length === 0 ? (
          <p className="text-sm text-kampmax-text-secondary">No bookings yet.</p>
        ) : (
          <ul className="space-y-3">
            {statuses.map((s) => {
              const pct = statusPercentage(s.count, statusTotal);
              return (
                <li key={s.status}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-kampmax-text">{s.label}</span>
                    <span className="text-kampmax-text-secondary">
                      {s.count} · {pct}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-200">
                    <div className={cn("h-full rounded-full", STATUS_COLOR[s.status] ?? "bg-neutral-400")} style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-xs text-kampmax-text-muted">{EARNINGS_FOOTNOTE}</p>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-primary-100">{label}</dt>
      <dd className="text-lg font-bold">{value}</dd>
    </div>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-5">
      <h2 className="text-base font-bold text-kampmax-text">{title}</h2>
      {hint && <p className="mt-0.5 text-xs text-kampmax-text-muted">{hint}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}
