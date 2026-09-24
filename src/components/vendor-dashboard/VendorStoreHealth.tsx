"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVendorStoreHealth } from "@/hooks/use-vendor-dashboard";

export function VendorStoreHealth() {
  const { data: health, isPending, isError } = useVendorStoreHealth();

  if (isPending || isError || !health) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-kampmax-text">Store Health</h3>
        {isError ? (
          <p className="text-sm text-error-700">Couldn&apos;t load store health.</p>
        ) : (
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100" />
        )}
      </div>
    );
  }

  const score = Math.max(0, Math.min(100, health.score));

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-kampmax-text">Store Health</h3>

      <div className="mb-3">
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-kampmax-text">{score}</span>
          <span className="mb-0.5 text-xs text-kampmax-text-muted">/ 100</span>
        </div>
        <div
          className="mt-1 h-2 w-full rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Store health score"
        >
          <div
            className={cn(
              "h-full rounded-full",
              score >= 75 ? "bg-success-500" : score >= 50 ? "bg-warning-500" : "bg-error-500"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {health.items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
            )}
            <div>
              <p className={cn("text-sm", item.complete ? "text-kampmax-text" : "text-kampmax-text-secondary")}>
                {item.label}
              </p>
              <p className="text-xs text-kampmax-text-muted">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
