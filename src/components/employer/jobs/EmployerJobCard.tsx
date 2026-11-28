"use client";

import Link from "next/link";
import { CalendarDays, Clock, Users, Wallet, Briefcase } from "lucide-react";
import type { Opportunity } from "@/types/opportunity";
import { isHiringType } from "@/types/opportunity";
import {
  DURATION_LABEL,
  WORK_ARRANGEMENT_LABEL,
} from "@/config/opportunity";
import { formatDate, timeAgo } from "@/lib/utils";
import { closesText, monthsText, openingsText } from "@/lib/opportunity-display";
import { LAPSED_NOTE, postingLapsed, reviewLink } from "@/lib/employer-job-groups";
import { OpportunityStatusBadge } from "@/components/freelancer/opportunities/StatusBadges";
import { budgetText } from "@/components/freelancer/opportunities/OpportunityCard";
import { EmployerJobActions } from "./EmployerJobActions";
import { OpportunityTypeBadge } from "./OpportunityTypeBadge";

/**
 * Compact, status-aware row for an employer's own jobs. Shows spine status,
 * job meta and the actions valid for that status.
 */
export function EmployerJobCard({ job }: { job: Opportunity }) {
  const category = job.categoryName ?? "Other";
  const hiring = isHiringType(job.opportunityType);
  const lapsed = postingLapsed(job);
  const closes = job.status === "open" && !lapsed ? closesText(job.deadline) : null;
  const review = job.status === "draft" ? null : reviewLink(job);

  return (
    <article className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wider text-primary-600">
              {category}
            </span>
            <OpportunityTypeBadge type={job.opportunityType} />
          </div>
          <h3 className="mt-1 text-base font-semibold text-neutral-900">{job.title}</h3>
        </div>
        {lapsed ? (
          <span className="rounded-full bg-warning-50 px-2 py-0.5 text-xs font-semibold text-warning-700">Expired</span>
        ) : (
          <OpportunityStatusBadge status={job.status} />
        )}
      </div>

      {job.summary && <p className="mt-2 line-clamp-2 text-sm text-neutral-600">{job.summary}</p>}
      {lapsed && <p className="mt-2 text-sm font-medium text-warning-700">{LAPSED_NOTE}</p>}

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-neutral-600 sm:grid-cols-3">
        <div className="flex items-center gap-1.5">
          <Wallet className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{budgetText(job)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Briefcase className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>{WORK_ARRANGEMENT_LABEL[job.workArrangement]}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
          <span>
            {hiring
              ? job.hiring.durationMonths !== undefined
                ? monthsText(job.hiring.durationMonths)
                : "Length not set"
              : DURATION_LABEL[job.duration]}
          </span>
        </div>
        {closes && (
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            <span>{closes}</span>
          </div>
        )}
        {hiring && (
          <div className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-neutral-400" aria-hidden />
            <span>{openingsText(job.hiring.openings)}</span>
          </div>
        )}
      </dl>

      <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3">
        <span className="text-[11px] text-neutral-400">Posted {timeAgo(job.postedAt)}</span>
        {hiring && job.expiresAt && (
          <span className="text-[11px] text-neutral-400">
            {job.status === "expired" || new Date(job.expiresAt).getTime() <= Date.now()
              ? `Expired ${formatDate(job.expiresAt)}`
              : `Live until ${formatDate(job.expiresAt)}`}
          </span>
        )}
      </div>

      {review && (
        <div className="mt-3">
          {review.enabled ? (
            <Link
              href={review.href}
              className={review.strong ? "inline-flex rounded-md bg-primary-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-primary-700" : "inline-flex rounded-md border border-neutral-300 px-3 py-1.5 text-sm font-semibold text-neutral-800 hover:bg-neutral-50"}
            >
              {review.label}
            </Link>
          ) : (
            <span className="text-sm text-neutral-500">{review.label}</span>
          )}
        </div>
      )}

      <EmployerJobActions job={job} />
    </article>
  );
}