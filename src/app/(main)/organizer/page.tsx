"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarPlus,
  ChevronRight,
  Clock,
  ScanLine,
  ShieldAlert,
  Ticket,
  XCircle,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useMyEvents, useOrganizerStatus } from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { eventDate, eventTime } from "@/components/events/event-format";

export default function OrganizerHubPage() {
  const status = useOrganizerStatus();

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <div className="flex items-center gap-3">
        <Link href="/events" aria-label="Back to events" className="text-neutral-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold text-neutral-900">Event organizer</h1>
      </div>

      {status.isPending ? (
        <div className="h-40 animate-pulse rounded-2xl bg-neutral-200/70" aria-busy="true" />
      ) : status.isError ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center">
          <p className="text-sm font-semibold text-error-700">Couldn&apos;t load your organizer status</p>
          <p className="mt-1 text-xs text-error-700/80">{status.error.message}</p>
          <button onClick={() => status.refetch()} className="mt-3 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-error-700 shadow-sm">
            Try again
          </button>
        </div>
      ) : status.data.isOrganizer ? (
        <OrganizerEvents />
      ) : (
        <ApplicationState application={status.data.application} />
      )}
    </PageContainer>
  );
}

function ApplicationState({
  application,
}: {
  application: { status: string; organizationName: string; reviewNote: string | null } | null;
}) {
  if (application?.status === "PENDING") {
    return (
      <StateCard
        icon={<Clock className="h-8 w-8 text-amber-500" />}
        title="Application under review"
        body={`We're reviewing your request for ${application.organizationName}. You'll get a notification as soon as an admin decides.`}
      />
    );
  }
  if (application?.status === "SUSPENDED") {
    return (
      <StateCard
        icon={<ShieldAlert className="h-8 w-8 text-error-600" />}
        title="Organizer access suspended"
        body={application.reviewNote ?? "Contact support to restore your access."}
      />
    );
  }
  const rejected = application?.status === "REJECTED";
  return (
    <div className="space-y-4">
      {rejected && (
        <StateCard
          icon={<XCircle className="h-8 w-8 text-error-600" />}
          title="Application declined"
          body={application?.reviewNote ?? "Your last request wasn't approved."}
        />
      )}
      <div className="rounded-2xl bg-gradient-to-br from-primary-900 to-primary-700 p-6 text-white">
        <CalendarPlus className="h-8 w-8 text-amber-400" />
        <h2 className="mt-3 text-lg font-extrabold">Host events on Kampmax</h2>
        <p className="mt-1 text-sm text-white/80">
          Create events, sell tickets with Kampmax Pay, and check students in at the door with a QR
          scanner. Organizers are approved by an admin first.
        </p>
        <Link
          href="/organizer/apply"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-white px-5 text-sm font-bold text-primary-800"
        >
          {rejected ? "Apply again" : "Ask for organizer access"}
        </Link>
      </div>
    </div>
  );
}

function StateCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm">
      <div className="flex justify-center">{icon}</div>
      <h2 className="mt-3 text-base font-bold text-neutral-900">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600">{body}</p>
    </div>
  );
}

function OrganizerEvents() {
  const { data, isPending, isError, error, refetch } = useMyEvents();
  const events = data ?? [];

  return (
    <div className="space-y-4">
      <Link
        href="/organizer/events/new"
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white hover:bg-primary-700"
      >
        <CalendarPlus className="h-4 w-4" /> Create an event
      </Link>

      {isPending ? (
        <div className="space-y-3" aria-busy="true">
          {[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200/70" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-5 text-center text-xs text-error-700">
          {error.message}{" "}
          <button onClick={() => refetch()} className="font-bold underline">Retry</button>
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center">
          <Ticket className="mx-auto h-10 w-10 text-neutral-300" />
          <p className="mt-3 text-sm font-semibold text-neutral-800">You haven&apos;t created an event yet</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => {
            const cancelled = e.status === "CANCELLED";
            const ended = new Date(e.endsAt).getTime() < Date.now();
            const label = cancelled ? "Cancelled" : ended ? "Ended" : "Active";
            return (
              <li
                key={e.id}
                className="flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white p-3 shadow-2xs hover:border-primary-300"
              >
                <Link
                  href={`/organizer/events/${e.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-primary-950">
                    {e.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.coverImageUrl} alt="" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-neutral-900">{e.title}</p>
                    <p className="text-[11px] text-neutral-500">
                      {eventDate(e.startsAt)} &middot; {eventTime(e.startsAt)}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-[11px] text-neutral-600">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-bold",
                          cancelled ? "bg-error-100 text-error-700" : ended ? "bg-neutral-200 text-neutral-700" : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {label}
                      </span>
                      <span className="inline-flex items-center gap-1"><Ticket className="h-3 w-3" /> {e.ticketsSold} sold</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300" />
                </Link>
                {!cancelled && !ended && (
                  <Link
                    href={`/organizer/events/${e.id}/scan`}
                    aria-label={`Scan tickets for ${e.title}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-50 text-primary-700"
                  >
                    <ScanLine className="h-4 w-4" />
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
