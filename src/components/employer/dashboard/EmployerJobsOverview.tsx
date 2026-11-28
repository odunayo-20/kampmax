"use client";

import Link from "next/link";
import { formatNaira, timeAgo } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  EmployerDashboardEmpty,
  EmployerDashboardError,
  EmployerDashboardSection,
  EmployerDashboardSkeleton,
} from "./EmployerDashboardSection";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";

export function EmployerJobsOverview({ query }: { query: EmployerDashboardQuerySource }) {
  const jobs = query.data?.recentJobs ?? [];

  if (query.isPending && !query.data) {
    return (
      <EmployerDashboardSection title="Recent jobs" action={{ href: "/employer/jobs", label: "All jobs" }}>
        <EmployerDashboardSkeleton rows={4} />
      </EmployerDashboardSection>
    );
  }

  if (query.isError && !query.data) {
    return (
      <EmployerDashboardSection title="Recent jobs" action={{ href: "/employer/jobs", label: "All jobs" }}>
        <EmployerDashboardError message={getFriendlyErrorMessage(query.error)} onRetry={query.refetch} />
      </EmployerDashboardSection>
    );
  }

  return (
    <EmployerDashboardSection title="Recent jobs" action={{ href: "/employer/jobs", label: "All jobs" }}>
      {jobs.length === 0 ? (
        <EmployerDashboardEmpty
          title="No jobs yet"
          detail="Create your first job to start receiving applications."
          action={{ href: "/employer/jobs/create", label: "Post a job" }}
        />
      ) : (
        <ul className="divide-y divide-kampmax-border/70">
          {jobs.map((job) => (
            <li key={job.id}>
              <Link
                href={`/employer/jobs/${job.id}`}
                className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 rounded"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-kampmax-text">
                    {job.title}
                  </span>
                  <span className="block text-xs text-kampmax-text-secondary">
                    {timeAgo(job.postedAt)} · {job.applications}{" "}
                    {job.applications === 1 ? "application" : "applications"}
                    {job.budgetMax ? ` · ${formatNaira(job.budgetMax)}` : ""}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold capitalize text-neutral-700">
                  {job.status.replace(/_/g, " ")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </EmployerDashboardSection>
  );
}