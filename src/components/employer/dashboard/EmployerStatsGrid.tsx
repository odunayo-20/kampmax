"use client";

import { Briefcase, ClipboardList, FileText, Star, Users } from "lucide-react";
import { Skeleton } from "@/components/home/Skeleton";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { peopleHref } from "@/services/employer-people";
import { EmployerStatCard } from "./EmployerStatCard";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";

export function EmployerStatsGrid({ query }: { query: EmployerDashboardQuerySource }) {
  if (query.isPending && !query.data) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-kampmax-border bg-white p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="mt-2 h-7 w-10" />
            <Skeleton className="mt-1.5 h-2.5 w-20" />
          </div>
        ))}
      </div>
    );
  }

  if (query.isError && !query.data) {
    return (
      <div className="rounded-xl border border-error-200 bg-error-50 px-4 py-4 text-center">
        <p className="text-sm font-medium text-error-700">
          {getFriendlyErrorMessage(query.error)}
        </p>
      </div>
    );
  }

  const s = query.data;
  if (!s) return null;

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      <EmployerStatCard
        label="Active jobs"
        value={s.jobCounts.open}
        context={`${s.jobCounts.all} posted total`}
        icon={Briefcase}
        href="/employer/jobs?status=open"
      />
      <EmployerStatCard
        label="New applicants"
        value={s.insights.pipeline.new}
        context="waiting for your first look"
        icon={Users}
        href={peopleHref("NEW")}
      />
      <EmployerStatCard
        label="Shortlisted"
        value={s.insights.pipeline.shortlisted}
        context="candidates in the pipeline"
        icon={Star}
        href={peopleHref("SHORTLISTED")}
      />
      <EmployerStatCard
        label="Active contracts"
        value={s.contracts.active}
        context={`${s.contracts.awaitingClientReview} awaiting your review`}
        icon={FileText}
        href="/employer/contracts"
      />
      <EmployerStatCard
        label="Pending actions"
        value={s.pendingActions}
        context="need your attention"
        icon={ClipboardList}
        href="#attention"
      />
    </div>
  );
}