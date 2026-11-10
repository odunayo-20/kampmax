"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Building2,
  ClipboardList,
  MessageSquareText,
  Wallet,
  ShieldCheck,
  Settings,
  Home,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AgentStatusBadge } from "./AgentStatusBadge";
import type { AccommodationAgentStatus } from "@/types/accommodation";
import { LogoIcon } from "@/components/ui/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string | number;
  exact?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/agent", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/agent/profile", label: "Profile", icon: User },
  { href: "/agent/properties", label: "Properties & Units", icon: Building2 },
  { href: "/agent/listings", label: "Listings", icon: ClipboardList },
  { href: "/agent/enquiries", label: "Enquiries & Leads", icon: MessageSquareText },
  { href: "/agent/billing", label: "Subscriptions & Billing", icon: Wallet },
  { href: "/agent/verification", label: "KYC & Verification", icon: ShieldCheck },
  { href: "/agent/settings", label: "Settings", icon: Settings },
];

export function AgentSidebar({
  agentName,
  agencyName,
  status,
  onNavigate,
}: {
  agentName: string;
  agencyName?: string | null;
  status: AccommodationAgentStatus;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  function isActive(item: NavItem) {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <aside className="flex h-full w-full flex-col border-r border-kampmax-border bg-white">
      {/* Header / Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-kampmax-border px-5">
        <LogoIcon size={26} />
        <div className="min-w-0 flex-1">
          <span className="block text-sm font-bold tracking-tight text-kampmax-text">
            Kampmax <span className="text-kampmax-blue">Agent</span>
          </span>
          <span className="block truncate text-[11px] text-kampmax-text-secondary">
            Accommodation Portal
          </span>
        </div>
      </div>

      {/* Agent Identity & Status */}
      <div className="border-b border-kampmax-border bg-neutral-50/70 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-kampmax-text">{agentName}</p>
            {agencyName && (
              <p className="truncate text-xs text-kampmax-text-secondary">{agencyName}</p>
            )}
          </div>
          <AgentStatusBadge status={status} />
        </div>
      </div>

      {/* Navigation Links */}
      <nav aria-label="Agent Navigation" className="flex-1 space-y-1 overflow-y-auto p-3">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-kampmax-text-secondary">
          Workspace
        </p>
        {NAV_ITEMS.map((item) => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "group flex items-center justify-between rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-kampmax-blue/10 font-semibold text-kampmax-blue"
                  : "text-kampmax-text-secondary hover:bg-neutral-100 hover:text-kampmax-text"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    active ? "text-kampmax-blue" : "text-kampmax-text-secondary group-hover:text-kampmax-text"
                  )}
                  aria-hidden
                />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && (
                <span className="rounded-full bg-kampmax-blue/10 px-2 py-0.5 text-xs font-semibold text-kampmax-blue">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Switcher */}
      <div className="border-t border-kampmax-border p-3">
        <Link
          href="/accommodation"
          className="flex items-center justify-between rounded-xl border border-kampmax-border bg-white px-3 py-2 text-xs font-medium text-kampmax-text-secondary transition-colors hover:border-kampmax-blue/40 hover:text-kampmax-text"
        >
          <div className="flex items-center gap-2">
            <Home className="h-3.5 w-3.5 text-kampmax-blue" aria-hidden />
            <span>Browse Accommodations</span>
          </div>
          <ExternalLink className="h-3 w-3 text-kampmax-text-secondary" aria-hidden />
        </Link>
      </div>
    </aside>
  );
}

