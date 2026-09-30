"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { DigitalTicket } from "@/components/events/DigitalTicket";
import { useMyTicket } from "@/hooks/use-events";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function TicketPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { data: ticket, isPending, isError, error, refetch } = useMyTicket(id);

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} aria-label="Back" className="text-neutral-500">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold text-neutral-900">My Ticket</h1>
      </div>

      {isPending ? (
        <div className="h-[520px] animate-pulse rounded-3xl bg-neutral-200/70" aria-busy="true" />
      ) : isError || !ticket ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center">
          <p className="text-sm font-semibold text-error-700">Couldn&apos;t load this ticket</p>
          <p className="mt-1 text-xs text-error-700/80">{error?.message}</p>
          <div className="mt-3 flex justify-center gap-2">
            <button onClick={() => refetch()} className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-error-700 shadow-sm">
              Try again
            </button>
            <Link href="/tickets" className="rounded-lg bg-white px-4 py-2 text-xs font-semibold text-neutral-700 shadow-sm">
              All tickets
            </Link>
          </div>
        </div>
      ) : (
        <>
          <DigitalTicket ticket={ticket} />
          <Link
            href={`/events/${ticket.event.id}`}
            className="block text-center text-xs font-semibold text-primary-700"
          >
            View event details
          </Link>
        </>
      )}
    </PageContainer>
  );
}
