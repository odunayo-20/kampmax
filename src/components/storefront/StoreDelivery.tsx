"use client";

import { Bike, Store, MapPin } from "lucide-react";
import type { Storefront } from "@/types/storefront";
import { StoreEmptyState } from "./StoreEmptyState";

interface StoreDeliveryProps {
  store: Storefront;
}

/** Delivery & pickup options for the store (backend-provided values). */
export function StoreDelivery({ store }: StoreDeliveryProps) {
  const d = store.delivery;
  const shown =
    (d && (d.campusDelivery || d.pickupAvailable || d.deliveryAreas.length > 0)) || false;

  if (!shown) {
    return (
      <StoreEmptyState
        icon={<Bike />}
        title="Delivery information not available"
        description="This store hasn't shared delivery details yet."
      />
    );
  }

  return (
    <div className="space-y-5 rounded-2xl border border-kampmax-border bg-white p-5 sm:p-6">
      <div>
        <h2 id="delivery-heading" className="text-lg font-bold tracking-tight text-kampmax-text">
          Delivery &amp; pickup
        </h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">How you can get your order.</p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <DeliveryOption
          icon={<Bike className="h-5 w-5" />}
          title="Campus delivery"
          description={d?.campusDelivery ? "Order delivered to your hostel or lecture hall." : "Not offered"}
          available={!!d?.campusDelivery}
        />
        <DeliveryOption
          icon={<Store className="h-5 w-5" />}
          title="Pickup"
          description={d?.pickupAvailable ? "Collect your order at the vendor's collection point." : "Not offered"}
          available={!!d?.pickupAvailable}
        />
      </div>

      {d?.deliveryAreas && d.deliveryAreas.length > 0 && (
        <div>
          <p className="text-xs uppercase tracking-wide text-kampmax-text-secondary mb-2">
            Delivery areas
          </p>
          <div className="flex flex-wrap gap-2">
            {d.deliveryAreas.map((area) => (
              <span
                key={area}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-kampmax-muted rounded-full text-xs font-medium text-kampmax-text-secondary"
              >
                <MapPin className="h-3 w-3" />
                {area}
              </span>
            ))}
          </div>
        </div>
      )}

      {d?.estimatedDelivery && (
        <p className="text-sm text-kampmax-text-secondary">
          <span className="font-semibold text-kampmax-text">Estimated delivery:</span>{" "}
          {d.estimatedDelivery}
        </p>
      )}

      {d?.deliveryPolicy && (
        <p className="text-xs text-kampmax-text-secondary border-t border-kampmax-border pt-4">
          {d.deliveryPolicy}
        </p>
      )}
    </div>
  );
}

function DeliveryOption({
  icon,
  title,
  description,
  available,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-kampmax-border p-3.5">
      <div className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center text-kampmax-text-secondary shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-kampmax-text flex items-center gap-1.5">
          {title}
          <span
            className={
              available
                ? "text-[10px] font-medium text-success-700 bg-success-50 px-1.5 py-0.5 rounded-full"
                : "text-[10px] font-medium text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-full"
            }
          >
            {available ? "Available" : "Unavailable"}
          </span>
        </p>
        <p className="text-xs text-kampmax-text-secondary mt-0.5">{description}</p>
      </div>
    </div>
  );
}
