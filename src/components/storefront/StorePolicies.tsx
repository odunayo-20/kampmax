"use client";

import { FileText, RotateCcw, Banknote, XCircle, Truck, Package, ChevronDown } from "lucide-react";
import type { ComponentType } from "react";
import type { Storefront } from "@/types/storefront";
import { StoreEmptyState } from "./StoreEmptyState";

interface StorePoliciesProps {
  store: Storefront;
}

const POLICY_ICON: Record<string, ComponentType<{ className?: string }>> = {
  returns: RotateCcw,
  refunds: Banknote,
  cancellation: XCircle,
  delivery: Truck,
  pickup: Package,
};

/** Store policies (only policies the vendor configured are shown). */
export function StorePolicies({ store }: StorePoliciesProps) {
  const enabled = store.policies.filter((p) => p.enabled);

  if (enabled.length === 0) {
    return (
      <StoreEmptyState
        icon={<FileText />}
        title="Store policies have not been provided"
        description="This store hasn't configured its policies yet."
      />
    );
  }

  return (
    <div className="rounded-2xl border border-kampmax-border bg-white">
      <div className="px-5 pt-5 sm:px-6 sm:pt-6">
        <h2 id="policies-heading" className="text-lg font-bold tracking-tight text-kampmax-text">
          Store policies
        </h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Know what to expect before you order.</p>
      </div>
      <div className="space-y-2.5 p-5 sm:p-6">
        {enabled.map((policy, index) => {
          const Icon = POLICY_ICON[policy.type] ?? FileText;
          return (
            <details
              key={policy.type}
              className="group rounded-xl border border-kampmax-border open:bg-kampmax-muted/30"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-kampmax-text [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-kampmax-blue ring-1 ring-kampmax-border">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {policy.title}
                </span>
                <ChevronDown className="h-4 w-4 text-kampmax-text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <p className="px-4 pb-4 pl-[3.75rem] text-sm leading-relaxed text-kampmax-text-secondary">
                {policy.body}
              </p>
            </details>
          );
        })}
      </div>
    </div>
  );
}
