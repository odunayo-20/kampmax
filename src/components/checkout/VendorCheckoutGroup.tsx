"use client";

import { Verified, Package, PackageOpen } from "lucide-react";
import { CheckoutVendorGroup, VendorDeliveryOption } from "@/types/checkout";
import { formatNaira } from "@/lib/utils";
import { DeliveryOptions } from "./DeliveryOptions";

interface VendorCheckoutGroupProps {
  group: CheckoutVendorGroup;
  loadingVendorId: string | null;
  onChangeDelivery: (vendorId: string, option: VendorDeliveryOption) => void;
  /** true when the cart is being re-validated (e.g. campus change). */
  readonly?: boolean;
}

export function VendorCheckoutGroup({
  group,
  loadingVendorId,
  onChangeDelivery,
  readonly,
}: VendorCheckoutGroupProps) {
  return (
    <section className="bg-white rounded-xl border border-kampmax-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-kampmax-muted/50 border-b border-kampmax-border">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-full bg-kampmax-navy/10 flex items-center justify-center text-xs font-bold text-kampmax-navy shrink-0">
            {group.vendorName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-sm font-semibold text-kampmax-text truncate">
                {group.vendorName}
              </span>
              {group.vendorVerified && (
                <Verified className="w-3.5 h-3.5 text-kampmax-blue shrink-0" />
              )}
            </div>
            <span className="text-[11px] text-kampmax-text-secondary">
              {group.items.length} {group.items.length === 1 ? "item" : "items"}
            </span>
          </div>
        </div>
        <span className="text-sm font-semibold text-kampmax-navy shrink-0 tabular-nums">
          {formatNaira(group.subtotal)}
        </span>
      </div>

      <div className="divide-y divide-kampmax-border">
        {group.items.map((item) => {
          const effectiveVariant =
            item.variantLabel ||
            (item.selectedVariation
              ? `${item.selectedVariation.name}: ${item.selectedVariation.option}`
              : undefined) ||
            (item.selectedVariants
              ? Object.entries(item.selectedVariants)
                  .map(([k, v]) => `${k}: ${v}`)
                  .join(" · ")
              : undefined);

          return (
            <div
              key={item.id || item.product.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <div className="w-10 h-10 bg-kampmax-muted rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                {item.product.images?.[0] ? (
                  <img
                    src={item.product.images[0]}
                    alt={item.product.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Package className="w-4 h-4 text-kampmax-text-secondary/40" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-kampmax-text line-clamp-1">
                  {item.product.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                  <p className="text-xs text-kampmax-text-secondary">
                    Qty {item.quantity} × {formatNaira(item.unitPrice ?? item.product.price)}
                  </p>
                  {effectiveVariant && (
                    <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-700 rounded border border-slate-200">
                      {effectiveVariant}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-sm font-semibold text-kampmax-navy shrink-0">
                {formatNaira((item.unitPrice ?? item.product.price) * item.quantity)}
              </span>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-kampmax-border bg-white">
        <DeliveryOptions
          vendorId={group.vendorId}
          options={group.deliveryOptions}
          selected={group.selectedDelivery}
          loadingVendorId={loadingVendorId}
          onSelect={readonly ? () => {} : onChangeDelivery}
        />
      </div>
    </section>
  );
}
