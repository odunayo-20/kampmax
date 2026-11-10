"use client";

import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AgentActionItem {
  id: string;
  title: string;
  description: string;
  href: string;
  actionLabel: string;
  priority: "high" | "medium" | "low";
}

const PRIORITY: Record<AgentActionItem["priority"], string> = {
  high: "bg-error-100 text-error-700",
  medium: "bg-warning-100 text-warning-700",
  low: "bg-neutral-100 text-neutral-600",
};

export function AgentActionRequired({ items = [] }: { items?: AgentActionItem[] }) {
  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-kampmax-text">
        <AlertTriangle className="h-4 w-4 text-warning-600" aria-hidden /> Action Required
      </h3>

      {items.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-kampmax-text-secondary">
          <CheckCircle2 className="h-4 w-4 text-success-600" aria-hidden /> You&apos;re all caught up.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id} className="rounded-lg border border-kampmax-border p-3">
              <div className="mb-1 flex items-center gap-2">
                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY[item.priority])}>
                  {item.priority}
                </span>
              </div>
              <p className="text-sm font-medium text-kampmax-text">{item.title}</p>
              <p className="mt-0.5 text-xs text-kampmax-text-secondary">{item.description}</p>
              <Link
                href={item.href}
                className="mt-2 inline-block rounded-md bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              >
                {item.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

