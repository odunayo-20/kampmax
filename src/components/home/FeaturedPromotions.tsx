"use client";

import { useState } from "react";
import { Check, Copy, Ticket } from "lucide-react";
import { useFeaturedPromotions } from "@/hooks/use-home";
import {
  featuredDiscountLabel,
  featuredMinSpendLabel,
  type FeaturedPlacement,
  type FeaturedPromotion,
} from "@/services/featured-promotions";

interface FeaturedPromotionsProps {
  placement: FeaturedPlacement;
  campusId?: string;
  title: string;
}

/** Promo codes an admin featured in this slot. Renders nothing when there are none. */
export function FeaturedPromotions({ placement, campusId, title }: FeaturedPromotionsProps) {
  const query = useFeaturedPromotions(placement, campusId);
  const promotions = query.data ?? [];
  if (promotions.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-kampmax-text">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {promotions.map((p) => (
          <li key={p.id}>
            <PromotionCard promotion={p} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function PromotionCard({ promotion: p }: { promotion: FeaturedPromotion }) {
  const [copied, setCopied] = useState(false);
  const minSpend = featuredMinSpendLabel(p);

  async function copy() {
    try {
      await navigator.clipboard.writeText(p.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the code is still visible to type in.
    }
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-kampmax-border bg-white p-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-kampmax-text-secondary">
          {featuredDiscountLabel(p)}
          {minSpend ? ` · ${minSpend}` : ""}
        </p>
        <p className="mt-1 text-sm font-semibold text-kampmax-text">{p.name}</p>
        {p.description && (
          <p className="mt-0.5 line-clamp-2 text-xs text-kampmax-text-secondary">{p.description}</p>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 rounded bg-kampmax-muted px-2 py-1 font-mono text-xs uppercase text-kampmax-text">
          <Ticket className="h-3 w-3" aria-hidden />
          {p.code}
        </span>
        <button
          type="button"
          onClick={() => void copy()}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-kampmax-blue hover:bg-kampmax-blue/10"
        >
          {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}
