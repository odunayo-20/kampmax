"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  useAgentAccess,
  usePrefetchAgentDashboard,
} from "@/hooks/use-agent-dashboard";
import {
  AGENT_DASHBOARD_GATE,
  isAgentDashboardPath,
} from "@/services/agent-dashboard";
import { DashboardShellSkeleton } from "@/components/layout/DashboardShellSkeleton";
import { AgentAccessGate } from "@/components/agent/AgentAccessGate";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { AgentTopbar } from "@/components/agent/AgentTopbar";
import type { AccommodationAgentStatus } from "@/types/accommodation";

const AGENT_OVERVIEW_PATH = "/agent";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { status } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isDashboard = isAgentDashboardPath(pathname);
  const accessQuery = useAgentAccess({ enabled: isDashboard });
  usePrefetchAgentDashboard({ enabled: pathname === AGENT_OVERVIEW_PATH });

  const access = accessQuery.data ?? null;
  const loadError = accessQuery.isError && !access;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (status === "loading" || (status === "authenticated" && !access && !loadError)) {
    return <DashboardShellSkeleton />;
  }

  if (loadError || !access) {
    return (
      <AgentAccessGate
        access={{
          kind: AGENT_DASHBOARD_GATE.NO_AGENT,
          status: null,
          canUseDashboard: false,
          message: "We couldn't load your agent profile. Please try again.",
        }}
      >
        {children}
      </AgentAccessGate>
    );
  }

  if (!access.canUseDashboard && access.kind !== AGENT_DASHBOARD_GATE.PENDING_REVIEW && access.kind !== AGENT_DASHBOARD_GATE.MORE_INFORMATION) {
    return <AgentAccessGate access={access}>{children}</AgentAccessGate>;
  }

  const agentName = access.displayName ?? "Accommodation Agent";
  const agencyName = access.agencyName ?? null;
  const agentStatus: AccommodationAgentStatus = access.status ?? "PENDING";

  return (
    <div className="min-h-screen bg-kampmax-bg">
      {/* Desktop Sidebar (Fixed) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <AgentSidebar
          agentName={agentName}
          agencyName={agencyName}
          status={agentStatus}
        />
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-kampmax-navy/60 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="relative flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl h-full">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-kampmax-text-secondary hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>
            <AgentSidebar
              agentName={agentName}
              agencyName={agencyName}
              status={agentStatus}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex flex-col lg:pl-64">
        <AgentTopbar
          onOpenMobile={() => setMobileOpen(true)}
          location={access.operatingLocation}
          agentName={agentName}
        />
        <main className="flex-1">
          <AgentAccessGate access={access}>
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
              {children}
            </div>
          </AgentAccessGate>
        </main>
      </div>
    </div>
  );
}
