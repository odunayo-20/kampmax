"use client";

import { Link2, MapPin, Truck } from "lucide-react";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { isOpenReturn, isReturnStatus, RETURN_STATUS_LABEL } from "@/lib/returns";
import {
  fulfillmentStatusLabel,
  fulfillmentStatusVariant,
  paymentStatusLabel,
  paymentStatusVariant,
} from "./orders-meta";
import type { VendorFulfillmentStatus, VendorPaymentStatus, VendorDeliveryMethod } from "@/types/vendor-orders";

export function FulfillmentBadge({ status }: { status: VendorFulfillmentStatus }) {
  return <StatusBadge variant={fulfillmentStatusVariant(status)} label={fulfillmentStatusLabel(status)} />;
}

/** Where the buyer's refund request stands, on list rows; nothing when there is none. */
export function ReturnBadge({ status }: { status?: string | null }) {
  if (!isReturnStatus(status)) return null;
  const variant =
    status === "REQUESTED" || status === "AWAITING_RETURN" ? "warning" : isOpenReturn(status) ? "info" : "neutral";
  return <StatusBadge variant={variant} label={RETURN_STATUS_LABEL[status]} />;
}

export function PaymentBadge({ status }: { status: VendorPaymentStatus }) {
  return <StatusBadge variant={paymentStatusVariant(status)} label={paymentStatusLabel(status)} />;
}

export function DeliveryMethodTag({ method }: { method: VendorDeliveryMethod }) {
  const isDelivery = method === "delivery";
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-kampmax-muted px-1.5 py-0.5 text-[11px] font-medium capitalize text-kampmax-text-secondary">
      {isDelivery ? (
        <Truck className="h-3 w-3 text-kampmax-blue" aria-hidden />
      ) : (
        <MapPin className="h-3 w-3 text-kampmax-gold-dark" aria-hidden />
      )}
      {method.replace("_", " ")}
    </span>
  );
}

/** Shows when the order is part of a larger multi-vendor parent order. */
export function ParentOrderTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-md bg-kampmax-blue/10 px-1.5 py-0.5 text-[11px] font-medium text-kampmax-blue">
      <Link2 className="h-3 w-3" aria-hidden />
      {label}
    </span>
  );
}