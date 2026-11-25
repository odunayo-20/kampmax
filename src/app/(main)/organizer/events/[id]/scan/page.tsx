"use client";

import { use, useCallback, useState } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Keyboard, XCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { QrScanner } from "@/components/events/QrScanner";
import { useAttendance, useCheckIn } from "@/hooks/use-events";
import { cn } from "@/lib/utils";
import { describeCheckInError, normalizeTicketNumber, parseTicketQr, type ScanProblem } from "@/lib/ticket-scan";
import { eventTime } from "@/components/events/event-format";
import type { CheckInResult } from "@/types/event-ticketing";

interface PageProps {
  params: Promise<{ id: string }>;
}

type Outcome =
  | { kind: "approved"; result: CheckInResult }
  | ({ kind: "problem" } & ScanProblem);

export default function ScanTicketPage({ params }: PageProps) {
  const { id } = use(params);
  const checkIn = useCheckIn(id);
  const attendance = useAttendance(id);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [manual, setManual] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [numberError, setNumberError] = useState<string | null>(null);

  const submit = useCallback(
    (input: { code?: string; ticketNumber?: string }) => {
      if (checkIn.isPending) return;
      checkIn.mutate(input, {
        onSuccess: (result) => setOutcome({ kind: "approved", result }),
        onError: (err) => setOutcome({ kind: "problem", ...describeCheckInError(err as { status?: number; code?: string; message?: string }) }),
      });
    },
    [checkIn]
  );

  // Anything that isn't a Kampmax ticket is refused here, without a request.
  function onScan(data: string) {
    const parsed = parseTicketQr(data);
    if (parsed.ok) submit({ code: parsed.code });
    else setOutcome({ kind: "problem", tone: "bad", title: "Not a Kampmax ticket", detail: parsed.reason });
  }

  function submitNumber(e: React.FormEvent) {
    e.preventDefault();
    const ticketNumber = normalizeTicketNumber(manual);
    if (!ticketNumber) {
      setNumberError("Enter the ticket number, like KMX-82941.");
      return;
    }
    setNumberError(null);
    submit({ ticketNumber });
  }

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
          <div className="text-center">
            <h1 className="text-base font-bold">Scan tickets</h1>
            {attendance.data && (
              <p className="text-xs text-white/70">
                {attendance.data.checkedIn.toLocaleString("en-NG")} of {attendance.data.total.toLocaleString("en-NG")} checked in
              </p>
            )}
          </div>
          <span className="w-5" />
        </div>

        <QrScanner
          paused={outcome !== null}
          busy={checkIn.isPending}
          onScan={onScan}
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

        {outcome?.kind === "problem" && (
          <div role="alert" className="space-y-3 rounded-2xl bg-white p-5 text-center text-neutral-900">
            {outcome.tone === "warn" ? (
              <AlertTriangle className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
            ) : (
              <XCircle className="mx-auto h-10 w-10 text-error-600" aria-hidden />
            )}
            <p className={cn("text-sm font-extrabold", outcome.tone === "warn" ? "text-amber-700" : "text-error-600")}>
              {outcome.title}
            </p>
            {outcome.detail && <p className="text-sm text-neutral-700">{outcome.detail}</p>}
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
              <form onSubmit={submitNumber} className="flex gap-2">
                <input
                  value={manual}
                  onChange={(e) => setManual(e.target.value.toUpperCase())}
                  placeholder="KMX-82941"
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
            {showManual && numberError && (
              <p role="alert" className="text-center text-xs text-amber-300">{numberError}</p>
            )}
          </div>
        )}
      </PageContainer>
    </div>
  );
}
