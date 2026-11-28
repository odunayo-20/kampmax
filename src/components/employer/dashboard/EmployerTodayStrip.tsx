"use client";

import Link from "next/link";
import { todayLine } from "@/lib/employer-hub";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";

/** The one posting worth a look today (people waiting, or about to close), like the mobile hub's strip. */
export function EmployerTodayStrip({ query }: { query: EmployerDashboardQuerySource }) {
  const today = todayLine(query.data?.insights.watch ?? []);
  if (!today) return null;
  return (
    <Link
      href={`/employer/jobs/${today.jobId}/applications`}
      className="flex items-center justify-between gap-3 rounded-xl border border-kampmax-gold bg-kampmax-muted px-4 py-3 hover:opacity-90"
    >
      <span className="text-sm font-semibold text-kampmax-text">{today.text}</span>
      <span className="shrink-0 text-xs font-semibold text-kampmax-blue">Review</span>
    </Link>
  );
}
