"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StoreEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/** Polished empty state for storefront sections. */
export function StoreEmptyState({
  icon,
  title,
  description,
  action,
  className,
}: StoreEmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-kampmax-border bg-white px-4 py-12 text-center",
        className
      )}
    >
      <div className="w-14 h-14 rounded-full bg-kampmax-muted flex items-center justify-center mb-4 text-kampmax-text-secondary/60">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-kampmax-text">{title}</h3>
      {description && (
        <p className="text-xs text-kampmax-text-secondary mt-1 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
