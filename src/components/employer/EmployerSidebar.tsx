"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Briefcase,
  FilePlus,
  FileText,
  Building2,
  MessageSquare,
  Bell,
  Home,
  LayoutDashboard,
  Users,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { EmployerOnboardingStatus } from "@/types/employer";
import { EmployerStatusBadge } from "./EmployerStatusBadge";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import { LogoIcon } from "@/components/ui/Logo";

interface NavItem {
  href?: string;
  label: string;
  icon: typeof Briefcase;
  badgeCount?: number;
}

type NavSection = { title?: string; items: NavItem[] };

export function EmployerSidebar({
  name,
  status,
}: {
  name: string;
  status: EmployerOnboardingStatus;
}) {
  const pathname = usePathname();
  const unreadMessagesQuery = useUnreadMessageCount();
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  const sections: NavSection[] = [
    {
      items: [{ label: "Dashboard", href: "/employer/dashboard", icon: LayoutDashboard }],
    },
    {
      title: "Jobs",
      items: [
        { label: "My Jobs", href: "/employer/jobs", icon: Briefcase },
        { label: "Create a Job", href: "/employer/jobs/create", icon: FilePlus },
        { label: "Applications", href: "/employer/applications", icon: Users },
        { label: "Contracts", href: "/employer/contracts", icon: FileText },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Employer Profile", href: "/employer/profile", icon: Building2 },
        { label: "Settings", href: "/employer/settings", icon: Settings },
        { href: "/chat", label: "Messages", icon: MessageSquare, badgeCount: unreadMessages },
        { href: "/notifications", label: "Notifications", icon: Bell },
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
            <Building2 className="h-5 w-5" aria-hidden />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{name}</p>
            <EmployerStatusBadge status={status} className="mt-0.5 bg-white/10 text-white ring-white/20" />
          </div>
        </div>
      </div>

      <nav aria-label="Employer dashboard" className="flex-1 overflow-y-auto px-3 py-3">
        {sections.map((section, si) => (
          <div key={si} className="mb-4">
            {section.title && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wider text-white/40">
                {section.title}
              </p>
            )}
<ul className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.href
                  ? pathname === item.href || pathname.startsWith(`${item.href}/`)
                  : false;
                return (
                  <li key={item.label}>
                    <Link
                      href={item.href!}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active ? "bg-white/10 text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="flex-1 truncate">{item.label}</span>
                      {typeof item.badgeCount === "number" && item.badgeCount > 0 && (
                        <span className="rounded-full bg-kampmax-gold px-1.5 py-0.5 text-[10px] font-bold text-kampmax-navy">
                          {item.badgeCount > 9 ? "9+" : item.badgeCount}
                        </span>
                      )}
                    </Link>
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