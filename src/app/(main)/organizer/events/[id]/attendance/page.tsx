"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Loader2, LogIn, UserX } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { useAttendance, useExportAttendance } from "@/hooks/use-events";
import { eventTime } from "@/components/events/event-format";

interface PageProps {
  params: Promise<{ id: string }>;
}

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function AttendancePage({ params }: PageProps) {
  const { id } = use(params);
  const { data, isPending, isError, error, refetch } = useAttendance(id);
  const exportCsv = useExportAttendance(id);

  function download() {
    exportCsv.mutate(undefined, {
      onSuccess: ({ filename, csv }) => {
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      },
    });
  }

  return (
    <PageContainer narrow className="space-y-4 pb-14">
      <div className="flex items-center justify-between">
        <Link href={`/organizer/events/${id}`} aria-label="Back to dashboard" className="text-neutral-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-base font-bold text-neutral-900">Attendance</h1>
        <span className="w-5" />
      </div>

      {isPending ? (
        <div className="h-64 animate-pulse rounded-2xl bg-neutral-200/70" aria-busy="true" />
      ) : isError ? (
        <div role="alert" className="rounded-2xl border border-error-100 bg-error-50 p-6 text-center text-xs text-error-700">
          {error.message}{" "}
          <button onClick={() => refetch()} className="font-bold underline">Retry</button>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm">
            <div className="relative h-36 w-36">
              <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${data.percentage}% checked in`}>
                <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#E5E7EB" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r={RADIUS}
                  fill="none"
                  stroke="#16A34A"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={CIRCUMFERENCE}
                  strokeDashoffset={CIRCUMFERENCE * (1 - data.percentage / 100)}
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-extrabold text-neutral-900">{data.percentage}%</span>
              </div>
            </div>
            <p className="mt-3 text-lg font-extrabold text-neutral-900">
              {data.checkedIn} / {data.total}
            </p>
            <p className="text-xs text-neutral-500">Checked in</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
              <LogIn className="h-5 w-5 text-emerald-600" aria-hidden />
              <div>
                <p className="text-[11px] text-neutral-500">Checked in</p>
                <p className="text-xl font-extrabold text-emerald-600">{data.checkedIn}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-sm">
              <UserX className="h-5 w-5 text-error-600" aria-hidden />
              <div>
                <p className="text-[11px] text-neutral-500">Not yet</p>
                <p className="text-xl font-extrabold text-error-600">{data.notYet}</p>
              </div>
            </div>
          </div>

          <section className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-sm font-bold text-neutral-900">Check-in timeline</h2>
            {data.timeline.length === 0 ? (
              <p className="mt-3 text-xs text-neutral-500">Nobody has checked in yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-neutral-100">
                {data.timeline.map((slot) => (
                  <li key={slot.at} className="flex items-center justify-between py-2.5 text-sm">
                    <span className="text-neutral-600">{eventTime(slot.at)}</span>
                    <span className="font-semibold text-neutral-900">
                      {slot.count} {slot.count === 1 ? "person" : "people"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <button
            onClick={download}
            disabled={exportCsv.isPending}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-600 text-sm font-bold text-white disabled:opacity-60"
          >
            {exportCsv.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            Download Attendance List
          </button>
          {exportCsv.isError && <p role="alert" className="text-center text-xs text-error-700">{exportCsv.error.message}</p>}
        </>
      )}
    </PageContainer>
  );
}
