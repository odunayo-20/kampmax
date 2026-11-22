"use client";

import { ShieldCheck, Truck, RotateCcw, Lock } from "lucide-react";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Secure payments",
    text: "Payments are processed through Paystack with industry-standard encryption.",
  },
  {
    icon: Truck,
    title: "Seller-based delivery",
    text: "Each seller handles their own delivery. See estimates per seller.",
  },
  {
    icon: RotateCcw,
    title: "One checkout, many sellers",
    text: "Pay once for all items from every seller in a single order.",
  },
];

export function TrustInformation() {
  return (
    <section
      aria-labelledby="trust-info-title"
      className="bg-white/60 rounded-xl border border-kampmax-border p-4 sm:p-5"
    >
      <h2
        id="trust-info-title"
        className="text-sm font-semibold text-kampmax-text flex items-center gap-2 mb-3"
      >
        <Lock className="h-4 w-4 text-kampmax-success" />
        You&apos;re in safe hands
      </h2>

      <ul className="space-y-3">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex items-start gap-3">
            <Icon className="w-4 h-4 text-kampmax-blue shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-kampmax-text">{title}</p>
              <p className="text-[11px] text-kampmax-text-secondary leading-relaxed">
                {text}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
