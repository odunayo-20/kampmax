"use client";

import Link from "next/link";
import { reputationChips, reputationHint } from "@/services/employer-insights";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";

const STAGES = [
  { key: "new", label: "New" },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "interviewing", label: "Interviewing" },
  { key: "hired", label: "Hired" },
] as const;

/**
 * Where people stand across your open postings, and how candidates see you:
 * how fast you reply, how many you answer, how many you have hired.
 */
export function EmployerHiringSnapshot({ query }: { query: EmployerDashboardQuerySource }) {
  const insights = query.data?.insights;
  if (!insights) return null;

  const { pipeline, reputation } = insights;
  const chips = reputationChips(reputation);
  const hint = reputationHint(reputation);

  return (
    <section
      aria-labelledby="hiring-snapshot"
      className="rounded-xl border border-kampmax-border bg-white px-4 py-4 sm:px-5"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 id="hiring-snapshot" className="text-sm font-bold text-kampmax-text">
          Your hiring
        </h2>
        <Link
          href="/employer/people"
          className="text-xs font-semibold text-kampmax-blue hover:underline"
        >
          Review applicants
        </Link>
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STAGES.map((s) => (
          <li key={s.key}>
            <Link
              href={`/employer/people?stage=${s.key.toUpperCase()}`}
              className={
                s.key === "new" && pipeline.new > 0
                  ? "block rounded-lg border border-kampmax-gold bg-kampmax-muted px-3 py-2.5 hover:opacity-90"
                  : "block rounded-lg border border-kampmax-border px-3 py-2.5 hover:bg-kampmax-muted"
              }
            >
              <span className="block text-xl font-bold text-kampmax-text">{pipeline[s.key]}</span>
              <span className="block text-xs text-kampmax-text-secondary">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-kampmax-border pt-3">
        <p className="text-xs font-semibold text-kampmax-text-secondary">How candidates see you</p>
        {chips.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {chips.map((c) => (
              <li
                key={c}
                className="rounded-full bg-kampmax-muted px-3 py-1 text-xs font-semibold text-kampmax-text"
              >
                {c}
              </li>
            ))}
          </ul>
        )}
        {hint && <p className="mt-2 text-xs text-kampmax-text-secondary">{hint}</p>}
      </div>
    </section>
  );
}
