"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const SETTINGS_SECTIONS = [
  { href: "/employer/settings", label: "Account", icon: UserRound },
  { href: "/employer/settings/security", label: "Security", icon: ShieldCheck },
  { href: "/employer/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/employer/settings/danger", label: "Danger Zone", icon: AlertTriangle },
] as const;

/**
 * Employer settings shell. Desktop uses a sticky two-column layout
 * (section nav left, content right); mobile uses a horizontal tab bar.
 * Reuses the platform SettingsGroup components in each section.
 */
export function EmployerSettingsShell({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-5 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:space-y-0">
      <nav aria-label="Employer settings" className="lg:sticky lg:top-6">
        <ul className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
          {SETTINGS_SECTIONS.map((section) => {
            const Icon = section.icon;
            const active = pathname === section.href;
            return (
              <li key={section.href} className="shrink-0">
                <Link
                  href={section.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:whitespace-normal",
                    active
                      ? "bg-kampmax-navy text-white"
                      : "bg-kampmax-muted text-kampmax-text-secondary hover:bg-kampmax-border/60 hover:text-kampmax-text"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {section.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 space-y-5">{children}</div>
    </div>
  );
}