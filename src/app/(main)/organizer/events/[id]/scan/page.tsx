"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Keyboard, XCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { QrScanner } from "@/components/events/QrScanner";
import { useCheckIn } from "@/hooks/use-events";
import { eventTime } from "@/components/events/event-format";
import type { CheckInResult } from "@/types/event-ticketing";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Outcome =
  | { kind: "approved"; result: CheckInResult }
  | { kind: "denied"; message: string };

export default function ScanTicketPage({ params }: PageProps) {
  const { id } = use(params);
  const checkIn = useCheckIn(id);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);

  const submit = useCallback(
    (input: { code?: string; ticketNumber?: string }) => {
      if (checkIn.isPending) return;
      checkIn.mutate(input, {
        onSuccess: (result) => setOutcome({ kind: "approved", result }),
        onError: (err) => setOutcome({ kind: "denied", message: err.message || "Couldn't verify that ticket." }),
      });
    },
    [checkIn]
  );

  function next() {
    setOutcome(null);
    setManual("");
    checkIn.reset();
  }

  return (
    <div className="min-h-screen bg-kampmax-navy text-white">
      <PageContainer narrow className="space-y-4">
        <div className="flex items-center justify-between">
          <Link href={`/organizer/events/${id}`} aria-label="Back to dashboard" className="text-white/80">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-base font-bold">Scan Ticket</h1>
          <span className="w-5" />
        </div>

        <QrScanner
          paused={outcome !== null}
          busy={checkIn.isPending}
          onScan={(code) => submit({ code })}
        />
        <p className="text-center text-xs text-white/70">Scan student&apos;s QR code</p>

        {outcome?.kind === "approved" && (
          <div role="status" className="space-y-3 rounded-2xl bg-white p-5 text-center text-neutral-900">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" aria-hidden />
            <p className="text-xs font-extrabold tracking-wide text-emerald-600">ENTRY APPROVED</p>
            <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-primary-100 text-xl font-bold text-primary-700">
              {outcome.result.holderAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={outcome.result.holderAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                outcome.result.holderName.slice(0, 1).toUpperCase()
              )}
            </div>
            <div>
              <p className="text-base font-bold">{outcome.result.holderName}</p>
              <p className="font-mono text-xs text-neutral-500">{outcome.result.ticketNumber}</p>
              <p className="mt-1 text-xs text-neutral-600">{outcome.result.eventTitle}</p>
              <p className="text-xs text-neutral-500">
                {outcome.result.tierName} &middot; Checked in: {eventTime(outcome.result.checkedInAt)}
              </p>
            </div>
            <button onClick={next} className="h-11 w-full rounded-xl bg-emerald-600 text-sm font-bold text-white">
              Done
            </button>
          </div>
        )}

        {outcome?.kind === "denied" && (
          <div role="alert" className="space-y-3 rounded-2xl bg-white p-5 text-center text-neutral-900">
            <XCircle className="mx-auto h-10 w-10 text-error-600" aria-hidden />
            <p className="text-xs font-extrabold tracking-wide text-error-600">ENTRY DENIED</p>
            <p className="text-sm text-neutral-700">{outcome.message}</p>
            <button onClick={next} className="h-11 w-full rounded-xl bg-kampmax-navy text-sm font-bold text-white">
              Scan next
            </button>
          </div>
        )}

        {outcome === null && (
          <div className="space-y-2">
            <button
              onClick={() => setShowManual((v) => !v)}
              className="mx-auto flex items-center gap-1.5 text-xs font-semibold text-white/80"
            >
              <Keyboard className="h-4 w-4" /> Enter ticket number instead
            </button>
            {showManual && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (manual.trim()) submit({ ticketNumber: manual.trim() });
                }}
                className="flex gap-2"
              >
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value.toUpperCase())}
                  placeholder="KMX-123456"
                  autoCapitalize="characters"
                  aria-label="Ticket number"
                  className="h-11 flex-1 rounded-xl border border-white/20 bg-white/10 px-3 font-mono text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <button
                  type="submit"
                  disabled={!manual.trim() || checkIn.isPending}
                  className="h-11 rounded-xl bg-white px-4 text-sm font-bold text-kampmax-navy disabled:opacity-50"
                >
                  Check in
                </button>
              </form>
            )}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
