"use client";

import { useEffect, useState } from "react";
import { listSavedJobs } from "@/services/jobs";
import { jobToOpportunity } from "@/lib/job-api-mapping";
import type { Opportunity } from "@/types/opportunity";
import {
  SavedJobsHeader,
  OpportunityList,
  OpportunityEmptyState,
} from "@/components/freelancer/opportunities";

export default function SavedJobsPage() {
  const [jobs, setJobs] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void listSavedJobs({ limit: 100 }).then(({ jobs, error: loadError }) => {
      if (cancelled) return;
      if (loadError) setError(loadError.message ?? "We couldn't load your saved jobs.");
      else setJobs(jobs.map(jobToOpportunity));
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <SavedJobsHeader count={jobs.length} />

      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="pt-4 text-center text-sm text-neutral-500">Loading…</div>
      ) : jobs.length === 0 ? (
        <OpportunityEmptyState hasFilters={false} saved />
      ) : (
        <>
          <OpportunityList
            opportunities={jobs}
            savedIds={new Set(jobs.map((job) => job.id))}
          />
          <p className="text-xs text-neutral-400">
            Remove a job from this list by opening it and un-saving it.
          </p>
        </>
      )}
    </div>
  );
}
