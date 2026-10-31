"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import { useRequireSignIn } from "@/hooks/use-require-sign-in";
import { useServiceProviderAccess } from "@/hooks/use-service-provider-dashboard";
import { track } from "@/lib/analytics";
import { SERVICE_PROVIDER_DASHBOARD_GATE } from "@/services/service-provider-dashboard";
import {
  ApplicationReceived,
  type ApplicationState,
} from "@/components/service-provider/intro/ApplicationReceived";

/** Where a provider lands after submitting their application. */
export default function ServiceProviderSubmittedPage() {
  useRequireSignIn();
  const access = useServiceProviderAccess();

  // Only a profile that exists and has been approved is "approved". If the check
  // can't be made, "received" is the safe thing to say to someone who just submitted.
  const state: ApplicationState | null = access.isPending
    ? null
    : access.data?.kind === SERVICE_PROVIDER_DASHBOARD_GATE.NO_PROVIDER
    ? "missing"
    : access.data?.verification === "approved"
    ? "approved"
    : "pending";

  useEffect(() => {
    if (state) track("sp_application_received_viewed", { state });
  }, [state]);

  if (!state) {
    return (
      <div className="min-h-screen bg-kampmax-bg px-6 py-12 lg:py-20">
        <div className="mx-auto max-w-xl space-y-4" role="status" aria-busy="true" aria-label="Loading">
          <Skeleton className="mx-auto h-16 w-16 rounded-2xl" />
          <Skeleton className="mx-auto h-8 w-2/3" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <span className="sr-only">Loading</span>
        </div>
      </div>
    );
  }

  return <ApplicationReceived state={state} name={access.data?.displayName} />;
}
