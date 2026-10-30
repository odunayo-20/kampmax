"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useServiceProviderAccess } from "@/hooks/use-service-provider-dashboard";
import { SERVICE_PROVIDER_DASHBOARD_GATE } from "@/services/service-provider-dashboard";

/**
 * Someone can land here already having an active Service Provider profile — e.g. an
 * existing customer sent straight here from /register. Don't make them read the
 * start page again: take them to the dashboard they already have.
 *
 * Renders nothing, so the page itself never waits on this check. It uses the same
 * cached access query as the dashboard, which is then already loaded when they arrive.
 */
export function RedirectApprovedProvider() {
  const router = useRouter();
  const access = useServiceProviderAccess().data;
  const approved = access?.kind === SERVICE_PROVIDER_DASHBOARD_GATE.APPROVED;

  useEffect(() => {
    if (approved) router.replace("/service-provider");
  }, [approved, router]);

  return null;
}
