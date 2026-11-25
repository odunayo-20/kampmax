"use client";

import { Star } from "lucide-react";

export function LoyaltySection({ points }: { points: number }) {
  if (points <= 0) return null;

  return (
    <section className="bg-white rounded-xl border border-kampmax-border p-4 sm:p-5">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-full bg-kampmax-gold/10 flex items-center justify-center shrink-0">
          <Star className="w-4 h-4 text-kampmax-gold" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-kampmax-text">
            You&apos;ll earn {points.toLocaleString()} Kampmax
            Points on this order
          </p>
          <p className="text-[11px] text-kampmax-text-secondary">
            Points are calculated and credited after the order is confirmed.
          </p>
        </div>
      </div>
    </section>
  );
}
