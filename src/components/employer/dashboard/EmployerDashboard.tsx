"use client";

import { useAuth } from "@/lib/auth-context";
import { useEmployerDashboardSummary } from "@/hooks/use-employer-dashboard";
import { FreePostingsNotice } from "@/components/employer/billing/FreePostingsNotice";
import { EmployerActionCenter } from "./EmployerActionCenter";
import { EmployerApplicationsOverview } from "./EmployerApplicationsOverview";
import { EmployerContractsOverview } from "./EmployerContractsOverview";
import { EmployerDashboardHeader } from "./EmployerDashboardHeader";
import { EmployerJobsOverview } from "./EmployerJobsOverview";
import { EmployerMessagesOverview } from "./EmployerMessagesOverview";
import { EmployerNotificationsOverview } from "./EmployerNotificationsOverview";
import { EmployerProfileCompletion } from "./EmployerProfileCompletion";
import { EmployerQuickActions } from "./EmployerQuickActions";
import { EmployerStatsGrid } from "./EmployerStatsGrid";
import type { EmployerDashboardQuerySource } from "./EmployerDashboardSection";

export function EmployerDashboard() {
  const { user } = useAuth();
  const summaryQuery = useEmployerDashboardSummary();

  const query: EmployerDashboardQuerySource = {
    data: summaryQuery.data,
    isPending: summaryQuery.isPending,
    isError: summaryQuery.isError,
    error: summaryQuery.error ?? null,
    refetch: () => void summaryQuery.refetch(),
  };

  const company = summaryQuery.data?.company;
  const displayName = company?.name ?? user?.name;

  return (
    <div className="space-y-6">
      <EmployerDashboardHeader
        displayName={displayName}
        descriptor={company?.descriptor}
        location={company?.location}
        verified={company?.verified}
      />

      <FreePostingsNotice />

      <EmployerStatsGrid query={query} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <EmployerActionCenter query={query} />
          <EmployerJobsOverview query={query} />
          <EmployerApplicationsOverview query={query} />
          <EmployerContractsOverview query={query} />
        </div>

        <aside className="space-y-6">
          <EmployerQuickActions />
          <EmployerProfileCompletion query={query} />
          <EmployerNotificationsOverview />
          <EmployerMessagesOverview />
        </aside>
      </div>
    </div>
  );
}