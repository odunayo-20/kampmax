"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { formatDateTime, formatNaira } from "@/lib/utils";
import type { VendorPromotionRedemption } from "@/types/vendor-promotions";

interface PromotionRedemptionsPanelProps {
  redemptions: VendorPromotionRedemption[];
}

export function PromotionRedemptionsPanel({ redemptions }: PromotionRedemptionsPanelProps) {
  return (
    <section className="rounded-xl border border-kampmax-border bg-white">
      <header className="flex items-center gap-2 border-b border-kampmax-border px-4 py-3">
        <Receipt className="h-4 w-4 text-kampmax-blue" aria-hidden />
        <h2 className="text-sm font-semibold text-kampmax-text">
          Redemptions <span className="font-normal text-kampmax-text-secondary">({redemptions.length})</span>
        </h2>
      </header>

      {redemptions.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-kampmax-text-secondary">No redemptions yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-kampmax-border text-[10px] uppercase tracking-wide text-kampmax-text-secondary">
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Order</th>
                <th className="px-4 py-2 font-medium">Redeemed at</th>
                <th className="px-4 py-2 text-right font-medium">Discount</th>
              </tr>
            </thead>
            <tbody>
              {redemptions.map((redemption) => {
                return (
                  <tr key={redemption.id} className="border-b border-kampmax-border/60 last:border-b-0">
                    <td className="px-4 py-3 font-medium text-kampmax-text">{redemption.customerName || "Customer"}</td>
                    <td className="px-4 py-3">
                      {redemption.orderId ? (
                        <Link href={`/vendor/orders/${redemption.orderId}`} className="font-medium text-kampmax-blue hover:underline">
                          {redemption.orderNumber ?? redemption.orderId}
                        </Link>
                      ) : (
                        <span className="text-kampmax-text-secondary">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-kampmax-text-secondary">{formatDateTime(redemption.redeemedAt)}</td>
                    <td className="px-4 py-3 text-right font-semibold text-kampmax-success">−{formatNaira(redemption.discountAmount)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}