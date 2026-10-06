"use client";

import { Shield, Award, Package } from "lucide-react";

interface TrustSignalsProps {
  /** Only claim "Verified Vendor" for a store that is actually verified. */
  vendorVerified?: boolean;
  /** Whether this listing offers campus pickup. */
  pickupAvailable?: boolean;
}

export function TrustSignals({ vendorVerified = false, pickupAvailable = true }: TrustSignalsProps) {
  const signals = [
    { icon: Shield, title: "Buyer Protection", description: "Secure checkout", color: "text-success-600", show: true },
    { icon: Award, title: "Verified Vendor", description: "Identity checked", color: "text-primary-600", show: vendorVerified },
    { icon: Package, title: "Campus Pickup", description: "Collect on campus", color: "text-neutral-600", show: pickupAvailable },
  ].filter((s) => s.show);

  const columns = signals.length === 1 ? "grid-cols-1" : signals.length === 2 ? "grid-cols-2" : "grid-cols-3";

  return (
    <section className={`grid gap-3 ${columns}`}>
      {signals.map((signal) => (
        <div key={signal.title} className="rounded-[10px] border border-neutral-200 bg-white p-3 text-center">
          <signal.icon className={`h-5 w-5 mx-auto ${signal.color}`} />
          <p className="mt-1 text-xs font-semibold text-neutral-900">{signal.title}</p>
          <p className="text-[11px] text-neutral-500">{signal.description}</p>
        </div>
      ))}
    </section>
  );
}
