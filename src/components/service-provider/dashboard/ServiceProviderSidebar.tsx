"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  Wrench,
  CalendarDays,
  Images,
  Star,
  Settings,
  Home,
  Lock,
  HeartHandshake,
  BarChart3,
  Wallet,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ServiceProviderStatusBadge } from "./ServiceProviderStatusBadge";
import type { ServiceProviderOnboardingStatus } from "@/types/service-provider";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import { LogoIcon } from "@/components/ui/Logo";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Wrench;
  /** Live unread counter rendered as a badge (messages). */
  badge?: string;
  /** Future module — placeholder, not yet implemented. */
  placeholder?: boolean;
}

type NavSection = { title?: string; items: NavItem[] };

export function ServiceProviderSidebar({
  providerName,
  status,
}: {
  providerName: string;
  status: ServiceProviderOnboardingStatus;
}) {
  const pathname = usePathname();
  const unreadMessagesQuery = useUnreadMessageCount();
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  const sections: NavSection[] = [
    {
      items: [
        { href: "/service-provider", label: "Overview", icon: LayoutDashboard },
        { href: "/service-provider/profile", label: "Profile", icon: User },
        { href: "/service-provider/verification", label: "Verification", icon: ShieldCheck },
      ],
    },
    {
      title: "Services",
      items: [
        { href: "/service-provider/services", label: "Services", icon: Wrench },
        { href: "/service-provider/availability", label: "Availability", icon: CalendarDays },
        { href: "/service-provider/portfolio", label: "Portfolio", icon: Images },
      ],
    },
    {
      title: "Grow",
      items: [
        { href: "/service-provider/reviews", label: "Reviews", icon: Star },
        { href: "/service-provider/bookings", label: "Bookings", icon: HeartHandshake },
        { href: "/service-provider/analytics", label: "Analytics", icon: BarChart3 },
        { href: "/service-provider/financials", label: "Financials", icon: Wallet },
      ],
    },
    {
      title: "Account",
      items: [
        {
          href: "/chat",
          label: "Messages",
          icon: MessageSquare,
          badge: unreadMessages > 0 ? (unreadMessages > 9 ? "9+" : String(unreadMessages)) : undefined,
        },
        { href: "/service-provider/settings", label: "Settings", icon: Settings },
      ],
    },
  ];

  return (
    <div className="flex h-full flex-col bg-kampmax-navy">
      <div className="px-4 pt-5 pb-2">
        <Link
          href="/home"
          className="inline-flex items-center gap-2 text-sm font-medium text-white/80 hover:text-white"
        >
          <LogoIcon size={18} />
          Back to Kampmax
        </Link>
        <div className="mt-3 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-kampmax-gold text-kampmax-navy">
            <Wrench className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{providerName}</p>
            <ServiceProviderStatusBadge
              status={status}
              className="mt-0.5 bg-white/10 text-white ring-white/20"
            />
          </div>
        </div>
      </div>

      <nav aria-label="Service provider dashboard" className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.title && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    {item.placeholder ? (
                      <span
                        aria-disabled="true"
                        className="flex cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-white/40"
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        <Lock className="h-3.5 w-3.5 text-white/40" aria-label="Coming soon" />
                      </span>
                    ) : (
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                          active
                            ? "bg-white/10 text-white"
                            : "text-white/70 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="flex-1 truncate">{item.label}</span>
                        {item.badge && (
                          <span className="rounded-full bg-kampmax-gold px-1.5 py-0.5 text-[10px] font-bold text-kampmax-navy">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/service-provider") return pathname === href;
  return pathname.startsWith(`${href}/`) || pathname === href;
}