"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmployerStatCard({
  label,
  value,
  context,
  icon: Icon,
  href,
  iconClassName,
}: {
  label: string;
  value: number | string;
  context?: string;
  icon: LucideIcon;
  href?: string;
  iconClassName?: string;
}) {
  const iconTile = (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600",
        iconClassName
      )}
      aria-hidden
    >
      <Icon className="h-4 w-4" />
    </span>
  );

  const card = (
    <div className="flex h-full items-start justify-between gap-2 rounded-xl border border-kampmax-border bg-white p-4 transition-colors">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">
          {label}
        </p>
        <p className="mt-1 text-2xl font-bold text-kampmax-text">{value}</p>
        {context && <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">{context}</p>}
      </div>
      {iconTile}
    </div>
  );

  if (!href) return card;

  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}`}
      className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
    >
      {card}
    </Link>
  );
}