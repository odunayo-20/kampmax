"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { getFreelancerEngagementsApi } from "@/services/contract";
import type { Engagement } from "@/services/jobs";
import { ContractEmptyState } from "@/components/contracts/ContractEmptyState";
import { ContractList } from "@/components/contracts/ContractList";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

/**
 * The freelancer's contracts in three groups (needs you, in progress, finished), each a short card that opens the
 * contract's own page, where the work and payments happen. The same list as the mobile app's contracts screen.
 */
export default function FreelancerContractsPage() {
  const [engagements, setEngagements] = useState<Engagement[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEngagements(await getFreelancerEngagementsApi());
      setLoadError(null);
    } catch (e) {
      setLoadError(getFriendlyErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);


  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-xl font-bold text-kampmax-text">Contracts</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">The work you were hired for, and how much has been paid.</p>
      </header>

      {loadError && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 p-3 text-sm text-error-700">
          We couldn&apos;t load your contracts. {loadError}{" "}
          <button type="button" className="font-semibold underline" onClick={() => void load()}>Try again</button>
        </div>
      )}

      {loading && engagements.length === 0 ? (
        <div role="status" aria-busy="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-kampmax-border bg-white p-4">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-3 h-9 w-full rounded-lg" />
            </div>
          ))}
          <span className="sr-only">Loading contracts</span>
        </div>
      ) : engagements.length === 0 && !loadError ? (
        <ContractEmptyState
          title="No contracts yet"
          body="When a client accepts your proposal, the contract shows up here."
          actionLabel="Find work"
          actionHref="/freelancer/find-work"
        />
      ) : (
        <ContractList engagements={engagements} party="freelancer" hrefFor={(id) => `/freelancer/contracts/${id}`} />
      )}
    </div>
  );
}
