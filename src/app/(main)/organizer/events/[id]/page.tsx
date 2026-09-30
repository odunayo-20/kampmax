"use client";

import { use, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Loader2,
  MapPin,
  ScanLine,
  Search,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useDebounce } from "@/hooks/use-debounce";
import {
  useAttendees,
  useEventDashboard,
  useManagedEvent,
  useSettleEvent,
} from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { eventDate, eventTimeRange, naira } from "@/components/events/event-format";
import { TicketsTab } from "@/components/events/organizer/TicketsTab";
import { SettingsTab } from "@/components/events/organizer/SettingsTab";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Tab = "attendees" | "tickets" | "revenue" | "settings";
const TABS: { id: Tab; label: string }[] = [
  { id: "attendees", label: "Attendees" },
  { id: "tickets", label: "Tickets" },
  { id: "revenue", label: "Revenue" },
  { id: "settings", label: "Settings" },
];

export default function OrganizerEventPage({ params }: PageProps) {
  const { id } = use(params);
  const [tab, setTab] = useState<Tab>("attendees");
  const event = useManagedEvent(id);
  const dashboard = useEventDashboard(id);

  if (event.isPending || dashboard.isPending) {
    return (
      <PageContainer narrow className="space-y-3" >
        <div className="h-32 animate-pulse rounded-2xl bg-neutral-200/70" aria-busy="true" />
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-200/70" />
      </PageContainer>
    );
  }
  if (event.isError || dashboard.isError || !event.data || !dashboard.data) {
    const message = event.error?.message ?? dashboard.error?.message ?? "Couldn't load this event.";
    return (
      <PageContainer narrow>
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center">
          <p className="text-sm font-semibold text-error-700">{message}</p>
          <Link href="/organizer" className="mt-3 inline-block text-xs font-bold text-error-700 underline">
            Back to organizer hub
          </Link>
        </div>
      </PageContainer>
    );
  }

  const e = event.data;
  const d = dashboard.data;
  const cancelled = e.status === "CANCELLED";
  const ended = new Date(e.endsAt).getTime() < Date.now();
  const live = !cancelled && !ended;

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <div className="flex items-center justify-between">
        <Link href="/organizer" aria-label="Back" className="text-neutral-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-neutral-900">Event Dashboard</h1>
        <span className="w-5" />
      </div>

      <div className="flex gap-3 rounded-2xl bg-white p-3 shadow-sm">
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-primary-950">
          {e.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={e.coverImageUrl} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-bold text-neutral-900">{e.title}</p>
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold",
                cancelled ? "bg-error-100 text-error-700" : ended ? "bg-neutral-200 text-neutral-700" : "bg-emerald-100 text-emerald-700"
              )}
            >
              {cancelled ? "Cancelled" : ended ? "Ended" : "Active"}
            </span>
          </div>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
            <Calendar className="h-3 w-3" /> {eventDate(e.startsAt)} &middot; {eventTimeRange(e.startsAt, e.endsAt)}
          </p>
          <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
            <MapPin className="h-3 w-3" /> {e.location}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Capacity" value={d.capacity} />
        <Stat label="Tickets sold" value={d.ticketsSold} />
        <Stat label="Paid" value={d.paid} />
        <Stat label="Free" value={d.free} />
        <Stat label="Checked in" value={d.checkedIn} />
        <Stat label="Refunded" value={d.refunded} />
      </div>

      {live && (
        <div className="grid grid-cols-2 gap-2">
          <Link
            href={`/organizer/events/${id}/scan`}
            className="flex h-11 items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700"
          >
            <ScanLine className="h-4 w-4" /> Scan tickets
          </Link>
          <Link
            href={`/organizer/events/${id}/attendance`}
            className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary-600 text-sm font-bold text-primary-700"
          >
            <BarChart3 className="h-4 w-4" /> Attendance
          </Link>
        </div>
      )}
      {!live && !cancelled && (
        <Link
          href={`/organizer/events/${id}/attendance`}
          className="flex h-11 items-center justify-center gap-2 rounded-xl border border-primary-600 text-sm font-bold text-primary-700"
        >
          <BarChart3 className="h-4 w-4" /> Attendance report
        </Link>
      )}

      <div role="tablist" aria-label="Event sections" className="flex border-b border-neutral-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 border-b-2 py-2.5 text-xs font-bold transition-colors",
              tab === t.id ? "border-primary-600 text-primary-700" : "border-transparent text-neutral-500"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "attendees" && <AttendeesTab eventId={id} />}
        {tab === "tickets" && <TicketsTab event={e} dashboard={d} canEdit={!cancelled && !ended} />}
        {tab === "revenue" && <RevenueTab eventId={id} dashboard={d} />}
        {tab === "settings" && <SettingsTab event={e} canEdit={!cancelled && !ended} />}
      </div>
    </PageContainer>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-3 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="text-xl font-extrabold text-neutral-900">{value}</p>
    </div>
  );
}

function AttendeesTab({ eventId }: { eventId: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const q = useDebounce(search.trim(), 300);
  const { data, isPending, isError, error } = useAttendees(eventId, q, page);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
        <input
          value={search}
          onChange={(ev) => {
            setSearch(ev.target.value);
            setPage(1);
          }}
          placeholder="Search attendees..."
          aria-label="Search attendees"
          className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
        />
      </div>

      {isPending ? (
        <div className="h-32 animate-pulse rounded-xl bg-neutral-200/70" aria-busy="true" />
      ) : isError ? (
        <p role="alert" className="rounded-xl bg-error-50 p-3 text-xs text-error-700">{error.message}</p>
      ) : data.items.length === 0 ? (
        <p className="rounded-xl bg-white p-6 text-center text-sm text-neutral-500">
          {q ? "No attendees match your search." : "No tickets have been booked yet."}
        </p>
      ) : (
        <>
          <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
            {data.items.map((a) => (
              <li key={a.id} className="flex items-center gap-3 p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xs font-bold text-primary-700">
                  {a.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.avatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    a.name.slice(0, 1).toUpperCase()
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900">{a.name}</p>
                  <p className="truncate font-mono text-[11px] text-neutral-500">{a.ticketNumber} &middot; {a.tierName}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", a.payment === "PAID" ? "bg-emerald-100 text-emerald-700" : "bg-neutral-100 text-neutral-600")}>
                    {a.payment === "PAID" ? "Paid" : "Free"}
                  </span>
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", a.attendance === "CHECKED_IN" ? "bg-primary-100 text-primary-700" : "bg-neutral-100 text-neutral-500")}>
                    {a.attendance === "CHECKED_IN" ? "Checked in" : "Not yet"}
                  </span>
                </div>
              </li>
            ))}
          </ul>
          {data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between text-xs text-neutral-600">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span>Page {data.meta.page} of {data.meta.totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                disabled={page >= data.meta.totalPages}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RevenueTab({
  eventId,
  dashboard,
}: {
  eventId: string;
  dashboard: NonNullable<ReturnType<typeof useEventDashboard>["data"]>;
}) {
  const settle = useSettleEvent(eventId);
  const r = dashboard.revenue;

  return (
    <div className="space-y-3">
      <div className="space-y-2 rounded-2xl bg-white p-4 shadow-sm">
        <Line label="Ticket sales" value={naira(r.gross)} />
        <Line label="Service fees (paid by students)" value={naira(r.serviceFees)} muted />
        <div className="border-t border-neutral-100 pt-2">
          <Line label="You receive" value={naira(r.net)} bold />
        </div>
      </div>

      <ul className="divide-y divide-neutral-100 rounded-2xl bg-white shadow-sm">
        {dashboard.tiers.map((t) => (
          <li key={t.id} className="flex items-center justify-between p-3 text-sm">
            <span className="text-neutral-700">{t.name} <span className="text-xs text-neutral-400">&times; {t.sold}</span></span>
            <span className="font-semibold text-neutral-900">{naira(t.revenue)}</span>
          </li>
        ))}
      </ul>

      {r.settled ? (
        <p className="rounded-xl bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
          Revenue was released to your wallet
          {r.settledAt ? ` on ${eventDate(r.settledAt)}` : ""}.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="rounded-xl bg-neutral-100 p-3 text-xs text-neutral-600">
            Ticket money is held safely by Kampmax while the event runs. Once it ends, your share is
            paid into your Kampmax wallet automatically. If it hasn&apos;t arrived yet, you can release
            it below. From your wallet you can withdraw to your bank (identity verification required).
          </p>
          <button
            onClick={() => settle.mutate()}
            disabled={!r.canSettle || settle.isPending}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 text-sm font-bold text-white disabled:opacity-50"
          >
            {settle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {r.canSettle ? `Release ${naira(r.net)} to wallet now` : "Paid out automatically after the event ends"}
          </button>
          {settle.isError && <p role="alert" className="text-xs text-error-700">{settle.error.message}</p>}
        </div>
      )}
    </div>
  );
}

function Line({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between text-sm", bold ? "font-extrabold text-neutral-900" : muted ? "text-neutral-400" : "text-neutral-600")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
