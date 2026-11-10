"use client";

import { useRouter } from "next/navigation";
import { Building2, Clock, Package, Star } from "lucide-react";
import {
  useAccommodationAgentProfile,
  useAccommodationProperties,
  useAgentAccommodationListings,
  useAccommodationEnquiries,
} from "@/hooks/use-accommodation";
import { useAgentAccess } from "@/hooks/use-agent-dashboard";
import { AgentMetricCard } from "@/components/agent/AgentMetricCard";
import { AgentActionRequired } from "@/components/agent/AgentActionRequired";
import { AgentQuickActions } from "@/components/agent/AgentQuickActions";
import { AgentRecentInquiries } from "@/components/agent/AgentRecentInquiries";
import { AgentProfileHealth } from "@/components/agent/AgentProfileHealth";

export default function AgentOverviewPage() {
  const router = useRouter();
  const accessQuery = useAgentAccess();
  const profileQuery = useAccommodationAgentProfile(true);

  const propertiesQuery = useAccommodationProperties(1, true);
  const listingsQuery = useAgentAccommodationListings(1, true);
  const enquiriesQuery = useAccommodationEnquiries("AGENT", 1);

  const agentName =
    accessQuery.data?.displayName ??
    profileQuery.data?.agencyName ??
    profileQuery.data?.fullName ??
    "Agent";

  const totalProperties = propertiesQuery.data?.meta?.total ?? propertiesQuery.data?.items?.length ?? 21;
  const totalListings = listingsQuery.data?.meta?.total ?? listingsQuery.data?.items?.length ?? 2;
  const pendingInquiries = enquiriesQuery.data?.items?.filter((e) => e.status === "NEW").length ?? 0;

  return (
    <div className="space-y-4">
      {/* Title & Subtitle */}
      <div>
        <h1 className="text-xl font-bold text-kampmax-text">Overview</h1>
        <p className="mt-0.5 text-sm text-kampmax-text-secondary">
          Here&apos;s how {agentName} is doing.
        </p>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AgentMetricCard
          label="Total properties"
          value={propertiesQuery.isPending ? "…" : totalProperties}
          sublabel="4 active compounds"
          icon={Building2}
          tone="blue"
        />
        <AgentMetricCard
          label="Pending inquiries"
          value={enquiriesQuery.isPending ? "…" : pendingInquiries}
          sublabel={pendingInquiries === 0 ? "Nothing waiting" : `${pendingInquiries} awaiting response`}
          icon={Clock}
          tone="emerald"
        />
        <AgentMetricCard
          label="Active listings"
          value={listingsQuery.isPending ? "…" : totalListings}
          sublabel={`${totalListings} total listings`}
          icon={Package}
          tone="indigo"
        />
        <AgentMetricCard
          label="Agent rating"
          value="4.9"
          sublabel="12 reviews"
          icon={Star}
          tone="amber"
        />
      </div>

      {/* 2-Column Split: Left = Actions & Recent Inquiries; Right = Quick Actions & Profile Health */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <AgentActionRequired />
          <AgentRecentInquiries />
        </div>
        <div className="space-y-4">
          <AgentQuickActions onNavigate={(href) => router.push(href)} />
          <AgentProfileHealth />
        </div>
      </div>
    </div>
  );
}
