"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAccommodationAgentProfile, useAccommodationAgentStatus } from "@/hooks/use-accommodation";
import { AgentSidebar } from "@/components/agent/AgentSidebar";
import { AgentTopbar } from "@/components/agent/AgentTopbar";
import { AgentAccessGate } from "@/components/agent/AgentAccessGate";
import { useAuth } from "@/lib/auth-context";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));

  const agent = profileQuery.data;
  const status = statusQuery.data?.status ?? "PENDING";
  const agentName = agent?.fullName || user?.name || "Agent";
  const agencyName = agent?.agencyName ?? null;

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <AgentAccessGate>
      <div className="min-h-screen bg-kampmax-bg">
        {/* Desktop Sidebar (Fixed) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
          <AgentSidebar
            agentName={agentName}
            agencyName={agencyName}
            status={status}
          />
        </aside>

        {/* Mobile Drawer (Overlay) */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="relative flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl">
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-kampmax-text-secondary hover:bg-neutral-100"
              >
                <X className="h-5 w-5" />
              </button>
              <AgentSidebar
                agentName={agentName}
                agencyName={agencyName}
                status={status}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="flex flex-col lg:pl-64">
          <AgentTopbar
            onOpenMobile={() => setMobileOpen(true)}
            location={agent?.operatingLocation}
          />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </AgentAccessGate>
  );
}

