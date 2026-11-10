"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Building2,
  Package,
  ShoppingCart,
  ScanLine,
  Megaphone,
  BarChart3,
  Wallet,
  ShieldCheck,
  UsersRound,
  MessageSquare,
  Settings,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/ui/Logo";
import { NavLinkIcon } from "@/components/ui/NavLinkIcon";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import type { AccommodationAgentStatus } from "@/types/accommodation";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Store;
  placeholder?: boolean;
  badge?: string;
}

type NavSection = { title?: string; items: NavItem[] };

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
  const unreadMessagesQuery = useUnreadMessageCount();
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  const sections: NavSection[] = [
    {
      items: [
        { href: "/agent", label: "Overview", icon: LayoutDashboard },
        { href: "/agent/profile", label: "Profile", icon: Store },
      ],
    },
    {
      title: "Properties & Listings",
      items: [
        { href: "/agent/properties", label: "Properties", icon: Building2 },
        { href: "/agent/listings", label: "Listings", icon: Package },
      ],
    },
    {
      title: "Inquiries & Leads",
      items: [
        { href: "/agent/enquiries", label: "Enquiries", icon: ShoppingCart },
        { href: "/agent/inspections", label: "Inspections", icon: ScanLine, placeholder: true },
      ],
    },
    {
      title: "Growth",
      items: [
        { href: "/agent/billing", label: "Subscriptions", icon: Megaphone },
        { href: "/agent/analytics", label: "Analytics", icon: BarChart3, placeholder: true },
        { href: "/agent/earnings", label: "Earnings", icon: Wallet, placeholder: true },
      ],
    },
    {
      title: "Account",
      items: [
        { href: "/agent/verification", label: "Verification & KYC", icon: ShieldCheck },
        { href: "/agent/staff", label: "Staff", icon: UsersRound, placeholder: true },
        {
          href: "/chat",
          label: "Messages",
          icon: MessageSquare,
          badge: unreadMessages > 0 ? (unreadMessages > 9 ? "9+" : String(unreadMessages)) : undefined,
        },
        { href: "/agent/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  const initial = (agentName || "A").charAt(0).toUpperCase();

  return (
    <div className="flex h-full flex-col bg-kampmax-navy">
      {/* Brand + return to marketplace */}
      <div className="px-4 pt-5 pb-2">
        <Link
          href="/home"
          onClick={onNavigate}
          className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
        >
          <LogoIcon size={18} />
          Back to Kampmax
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500 font-bold text-white shadow-xs">
            {initial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{agentName}</p>
            <span className="mt-0.5 inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-xs text-white/90">
              ✓ Approved
            </span>
          </div>
        </div>
      </div>

      <nav aria-label="Agent dashboard navigation" className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.title && (
              <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-white/10 text-white"
                          : "text-white/70 hover:bg-white/5 hover:text-white has-[[data-pending]]:bg-white/10 has-[[data-pending]]:text-white"
                      )}
                    >
                      <NavLinkIcon icon={item.icon} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.placeholder && <Lock className="h-3.5 w-3.5 text-white/40" aria-label="Coming soon" />}
                      {item.badge && (
                        <span className="rounded-full bg-kampmax-gold px-1.5 py-0.5 text-[10px] font-bold text-kampmax-navy">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        <Link
          href="/accommodation"
          onClick={onNavigate}
          className="mt-2 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/70 hover:bg-white/5 hover:text-white"
        >
          <Building2 className="h-4 w-4 shrink-0" aria-hidden />
          Return to Accommodation
        </Link>
      </nav>

      {/* Bottom User Initial Pill */}
      <div className="border-t border-white/10 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-xs font-semibold text-white">
            {initial}
          </div>
          <span className="truncate text-xs font-medium text-white/70">{agentName}</span>
        </div>
      </div>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/agent") return pathname === "/agent";
  if (["/agent/profile", "/agent/settings"].includes(href)) {
    return pathname === href;
  }
  return pathname.startsWith(href);
}
