"use client";

import { Plus, MessageSquare, User, Eye, Package, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface QuickAction {
  label: string;
  href: string;
  icon: LucideIcon;
  cls: string;
}

export function AgentQuickActions({
  onNavigate,
}: {
  onNavigate: (href: string) => void;
}) {
  const actions: QuickAction[] = [
    { label: "Add Property", href: "/agent/properties", icon: Plus, cls: "bg-primary-100 text-primary-700" },
    { label: "View Inquiries", href: "/agent/enquiries", icon: MessageSquare, cls: "bg-info-100 text-info-700" },
    { label: "Edit Profile", href: "/agent/profile", icon: User, cls: "bg-warning-100 text-warning-700" },
    { label: "View Accommodation", href: "/accommodation", icon: Eye, cls: "bg-success-100 text-success-700" },
    { label: "Manage Listings", href: "/agent/listings", icon: Package, cls: "bg-neutral-100 text-neutral-700" },
  ];

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-kampmax-text">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {actions.map((a) => {
          const Icon = a.icon;
          return (
            <button
              key={a.label}
              type="button"
              onClick={() => onNavigate(a.href)}
              className="flex items-center gap-2.5 rounded-lg border border-kampmax-border p-2.5 text-left hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", a.cls)}>
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="text-xs font-medium text-kampmax-text">{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

