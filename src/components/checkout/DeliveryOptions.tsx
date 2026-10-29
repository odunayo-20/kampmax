"use client";

import { Truck, Store, MapPin, Loader2, AlertCircle } from "lucide-react";
import {
  VendorDeliveryOption,
  VendorDeliverySelection,
} from "@/types/checkout";
import { formatNaira } from "@/lib/utils";
import { cn } from "@/lib/utils";

const METHOD_ICONS = {
  campus_delivery: Truck,
  campus_pickup: MapPin,
  vendor_pickup: Store,
} as const;

interface DeliveryOptionsProps {
  vendorId: string;
  options: VendorDeliveryOption[];
  selected: VendorDeliverySelection | null;
  loadingVendorId: string | null;
  onSelect: (vendorId: string, option: VendorDeliveryOption) => void;
}

function StateIndicator({ state }: { state: VendorDeliveryOption["state"] }) {
  if (state === "loading") return <Loader2 className="h-4 w-4 animate-spin text-kampmax-blue" />;
  if (state === "error" || state === "unavailable")
    return <AlertCircle className="h-4 w-4 text-kampmax-error" />;
  return null;
}

export function DeliveryOptions({
  vendorId,
  options,
  selected,
  loadingVendorId,
  onSelect,
}: DeliveryOptionsProps) {
  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium text-kampmax-text-secondary mb-1">
        Delivery options
      </legend>
      {options.map((opt) => {
        const Icon = METHOD_ICONS[opt.method] || Truck;
        const isSelected = selected?.optionId === opt.id;
        const disabled = opt.state === "unavailable" || opt.state === "error";
        const isLoading = loadingVendorId === vendorId && isSelected;
        return (
          <label
            key={opt.id}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors",
              isSelected && !disabled
                ? "border-kampmax-blue bg-kampmax-blue/5"
                : "border-kampmax-border hover:border-kampmax-blue/40",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <input
              type="radio"
              name={`delivery-${vendorId}`}
              value={opt.id}
              checked={isSelected}
              disabled={disabled}
              onChange={() => onSelect(vendorId, opt)}
              className="h-4 w-4 text-kampmax-blue focus:ring-kampmax-blue/30 accent-kampmax-blue"
            />
            <Icon className="h-4 w-4 text-kampmax-blue shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-kampmax-text">
                {opt.label}
              </p>
              {(disabled ? opt.message : opt.estimatedDelivery) && (
                <p className="text-[11px] text-kampmax-text-secondary">
                  {disabled ? opt.message : opt.estimatedDelivery}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <StateIndicator state={isLoading ? "loading" : opt.state} />
              <span
                className={cn(
                  "text-sm font-semibold tabular-nums",
                  opt.fee === 0 ? "text-kampmax-success" : "text-kampmax-navy"
                )}
              >
                {opt.fee === 0 ? "Free" : formatNaira(opt.fee)}
              </span>
            </div>
          </label>
        );
      })}
    </fieldset>
  );
}
