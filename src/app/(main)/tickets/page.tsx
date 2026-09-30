"use client";

import Link from "next/link";
import { ArrowLeft, Calendar, ChevronRight, MapPin, Ticket } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useMyTickets } from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { eventDate, eventTime } from "@/components/events/event-format";
import type { MyTicket } from "@/types/event-ticketing";

function badge(ticket: MyTicket): { label: string; cls: string } {
  if (ticket.event.status === "CANCELLED") return { label: "Cancelled", cls: "bg-error-100 text-error-700" };
  if (ticket.status === "USED") return { label: "Used", cls: "bg-neutral-200 text-neutral-700" };
  if (ticket.status === "REFUNDED") return { label: "Refunded", cls: "bg-error-100 text-error-700" };
  return { label: "Valid", cls: "bg-emerald-100 text-emerald-700" };
}

export default function MyTicketsPage() {
  const { data, isPending, isError, error, refetch } = useMyTickets();
  const tickets = data ?? [];
  const now = Date.now();
  const upcoming = tickets.filter(
    (t) => t.status === "VALID" && t.event.status === "ACTIVE" && new Date(t.event.endsAt).getTime() > now
  );
  const past = tickets.filter((t) => !upcoming.includes(t));

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <div className="flex items-center gap-3">
        <Link href="/events" aria-label="Back to events" className="text-neutral-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-neutral-900">My Tickets</h1>
      </div>

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200/70" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center">
          <p className="text-sm font-semibold text-error-700">Couldn&apos;t load your tickets</p>
          <p className="mt-1 text-xs text-error-700/80">{error.message}</p>
          <button onClick={() => refetch()} className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-error-700 shadow-sm">
            Try again
          </button>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm font-semibold text-neutral-800">No tickets yet</p>
          <p className="mt-1 text-xs text-neutral-500">Tickets you get for campus events show up here.</p>
          <Link href="/events" className="mt-4 inline-block rounded-xl bg-primary-600 px-5 py-2.5 text-xs font-bold text-white">
            Browse events
          </Link>
        </div>
      ) : (
        <>
          <Section title="Upcoming" tickets={upcoming} />
          <Section title="Past & cancelled" tickets={past} muted />
        </>
      )}
    </PageContainer>
  );
}

function Section({ title, tickets, muted }: { title: string; tickets: MyTicket[]; muted?: boolean }) {
  if (tickets.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-500">{title}</h2>
      {tickets.map((t) => {
        const b = badge(t);
        return (
          <Link
            key={t.id}
            href={`/tickets/${t.id}`}
            className={cn(
              "flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xs transition hover:border-primary-300",
              muted && "opacity-80"
            )}
          >
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-primary-950">
              {t.event.coverImageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={t.event.coverImageUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-neutral-900">{t.event.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-500">
                <Calendar className="h-3 w-3" /> {eventDate(t.event.startsAt)} &middot; {eventTime(t.event.startsAt)}
              </p>
              <p className="flex items-center gap-1 truncate text-[11px] text-neutral-500">
                <MapPin className="h-3 w-3" /> {t.event.location}
              </p>
              <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold", b.cls)}>
                {b.label} &middot; {t.tier.name}
              </span>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
          </Link>
        );
      })}
    </section>
  );
}
