"use client";

import { Suspense, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { OpportunityType } from "@/types/opportunity";
import { EMPLOYER_JOB_TYPE_TABS } from "@/config/jobs";
import { EmployerJobsView } from "@/components/employer/jobs/EmployerJobsView";
import { groupFromParams } from "@/lib/employer-job-groups";

/** `?type=` keeps the kind filter in the address; `?group=` (from the dashboard) opens on live, not-live or ended jobs. */
function EmployerJobsContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type") ?? "";
  const type: OpportunityType | "all" = EMPLOYER_JOB_TYPE_TABS.some((t) => t.value === typeParam) ? (typeParam as OpportunityType | "all") : "all";

  const setType = useCallback(
    (next: OpportunityType | "all") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next !== "all") params.set("type", next);
      else params.delete("type");
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  return <EmployerJobsView type={type} onTypeChange={setType} initialGroup={groupFromParams(searchParams)} />;
}

export default function EmployerJobsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">Loading…</div>}>
      <EmployerJobsContent />
    </Suspense>
  );
}
