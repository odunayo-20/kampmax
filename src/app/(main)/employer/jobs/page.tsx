"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { OpportunityStatus, OpportunityType } from "@/types/opportunity";
import { EMPLOYER_JOB_FILTER_TABS, EMPLOYER_JOB_TYPE_TABS } from "@/config/jobs";
import { EmployerJobsView } from "@/components/employer/jobs/EmployerJobsView";

function EmployerJobsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status") ?? "";
  const typeParam = searchParams.get("type") ?? "";
  const pageParam = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const status: OpportunityStatus | "all" = EMPLOYER_JOB_FILTER_TABS.some(
    (t) => t.value === statusParam
  )
    ? (statusParam as OpportunityStatus | "all")
    : "all";

  const type: OpportunityType | "all" = EMPLOYER_JOB_TYPE_TABS.some((t) => t.value === typeParam)
    ? (typeParam as OpportunityType | "all")
    : "all";

  const syncUrl = useCallback(
    (overrides: {
      status?: OpportunityStatus | "all";
      type?: OpportunityType | "all";
      page?: number;
    }) => {
      const nextStatus = overrides.status ?? status;
      const nextType = overrides.type ?? type;
      const nextPage = overrides.page ?? pageParam;
      const params = new URLSearchParams(searchParams.toString());
      if (nextStatus !== "all") params.set("status", nextStatus);
      else params.delete("status");
      if (nextType !== "all") params.set("type", nextType);
      else params.delete("type");
      if (nextPage > 1) params.set("page", String(nextPage));
      else params.delete("page");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams, status, type, pageParam]
  );

  return (
    <EmployerJobsView
      status={status}
      type={type}
      page={pageParam}
      onStatusChange={(s) => syncUrl({ status: s, page: 1 })}
      onTypeChange={(t) => syncUrl({ type: t, page: 1 })}
      onPageChange={(p) => syncUrl({ page: p })}
    />
  );
}

export default function EmployerJobsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">Loading…</div>}>
      <EmployerJobsContent />
    </Suspense>
  );
}