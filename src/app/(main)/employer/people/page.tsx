"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { EmployerPeopleView } from "@/components/employer/people/EmployerPeopleView";
import { PEOPLE_STAGES, type PeopleStage } from "@/services/employer-people";

function PeopleContent() {
  const params = useSearchParams();
  const stage = params.get("stage");
  const jobId = params.get("jobId") ?? undefined;
  return (
    <EmployerPeopleView
      key={`${stage ?? ""}-${jobId ?? ""}`}
      initialStage={PEOPLE_STAGES.includes(stage as PeopleStage) ? (stage as PeopleStage) : undefined}
      jobId={jobId}
    />
  );
}

export default function EmployerPeoplePage() {
  return (
    <Suspense fallback={<div className="text-sm text-neutral-500">Loading…</div>}>
      <PeopleContent />
    </Suspense>
  );
}
