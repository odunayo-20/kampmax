"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname, useParams } from "next/navigation";
import type { EmployerApplicationStatus } from "@/types/opportunity";
import {
  APPLICATION_FILTER_TABS,
  APPLICATION_SORT_OPTIONS,
  type EmployerApplicationSortKey,
} from "@/config/applications";
import { isHiringType } from "@/types/opportunity";
import { useEmployerJob } from "@/hooks/use-jobs";
import { EmployerApplicationsView } from "@/components/employer/applications/EmployerApplicationsView";
import { JobApplicantsView } from "@/components/employer/applications/JobApplicantsView";

function JobApplicationsContent({ jobId }: { jobId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const searchParam = searchParams.get("search") ?? "";
  const sortParam = searchParams.get("sort") ?? "";

  const status: EmployerApplicationStatus | "all" = APPLICATION_FILTER_TABS.some(
    (t) => t.value === statusParam
  )
    ? (statusParam as EmployerApplicationStatus | "all")
    : "all";

  const sort: EmployerApplicationSortKey = APPLICATION_SORT_OPTIONS.some(
    (o) => o.value === sortParam
  )
    ? (sortParam as EmployerApplicationSortKey)
    : "newest";

  const syncUrl = useCallback(
    (overrides: {
      status?: EmployerApplicationStatus | "all";
      page?: number;
      search?: string;
      sort?: EmployerApplicationSortKey;
    }) => {
      const params = new URLSearchParams(searchParams.toString());
      const next = {
        status: overrides.status ?? status,
        page: overrides.page ?? pageParam,
        search: overrides.search ?? searchParam,
        sort: overrides.sort ?? sort,
      };
      if (next.status !== "all") params.set("status", next.status);
      else params.delete("status");
      if (next.search) params.set("search", next.search);
      else params.delete("search");
      if (next.sort !== "newest") params.set("sort", next.sort);
      else params.delete("sort");
      if (next.page > 1) params.set("page", String(next.page));
      else params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, status, pageParam, searchParam, sort]
  );

  return (
    <EmployerApplicationsView
      jobId={jobId}
      status={status}
      page={pageParam}
      search={searchParam}
      sort={sort}
      onStatusChange={(s) => syncUrl({ status: s, page: 1 })}
      onPageChange={(p) => syncUrl({ page: p })}
      onSearchChange={(s) => syncUrl({ search: s, page: 1 })}
      onSortChange={(s) => syncUrl({ sort: s, page: 1 })}
    />
  );
}

export default function EmployerJobApplicationsPage() {
  const params = useParams<{ id: string }>();
  const jobId = String(params.id);
  // A gig has proposals; a vacancy or internship has CV applicants.
  const jobQuery = useEmployerJob(jobId);

  if (jobQuery.isPending) {
    return <div className="text-sm text-neutral-500">Loading…</div>;
  }
  if (jobQuery.data && isHiringType(jobQuery.data.opportunityType)) {
    return <JobApplicantsView jobId={jobId} />;
  }
  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">Loading…</div>}>
      <JobApplicationsContent jobId={jobId} />
    </Suspense>
  );
}