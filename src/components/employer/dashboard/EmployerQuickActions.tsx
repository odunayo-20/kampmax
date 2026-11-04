"use client";

import Link from "next/link";
import { Building2, FilePlus, FileText, MessageSquare, Search, Users } from "lucide-react";

const ACTIONS = [
  { href: "/employer/jobs/create", label: "Post an opportunity", icon: FilePlus, hint: "Gigs, internships, vacancies" },
  { href: "/employer/applications", label: "Review applications", icon: Users, hint: "Manage candidates" },
  { href: "/jobs", label: "Find talent", icon: Search, hint: "Browse the marketplace" },
  { href: "/employer/contracts", label: "View contracts", icon: FileText, hint: "Track hired work" },
  { href: "/chat", label: "Messages", icon: MessageSquare, hint: "Talk to candidates" },
  { href: "/employer/profile", label: "Manage profile", icon: Building2, hint: "Keep it up to date" },
] as const;

export function EmployerQuickActions() {
  return (
    <section aria-labelledby="quick-actions" className="rounded-xl border border-kampmax-border bg-white">
      <header className="border-b border-kampmax-border/70 px-4 pt-4 pb-3 sm:px-5">
        <h2 id="quick-actions" className="text-sm font-bold text-kampmax-text">
          Quick actions
        </h2>
      </header>
      <div className="grid grid-cols-2 gap-2 p-4 sm:px-5">
        {ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="group rounded-lg border border-kampmax-border p-3 transition-colors hover:border-primary-300 hover:bg-primary-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="mt-2 block text-xs font-semibold text-kampmax-text">{action.label}</span>
              <span className="block text-[11px] text-kampmax-text-secondary">{action.hint}</span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}