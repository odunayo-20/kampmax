"use client";

import { Check, Clock, Package, Store, Truck, CheckCircle2 } from "lucide-react";
import { OrderStatus } from "@/types";

interface OrderProgressStepperProps {
  status: OrderStatus;
}

interface Step {
  key: string;
  label: string;
  description: string;
  statuses: OrderStatus[];
}

const STEPS: Step[] = [
  {
    key: "placed",
    label: "Placed",
    description: "Order received",
    statuses: ["placed", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  },
  {
    key: "confirmed",
    label: "Confirmed",
    description: "Vendor accepted",
    statuses: ["confirmed", "preparing", "ready", "out_for_delivery", "delivered"],
  },
  {
    key: "preparing",
    label: "Preparing",
    description: "Item packaging",
    statuses: ["preparing", "ready", "out_for_delivery", "delivered"],
  },
  {
    key: "ready",
    label: "Ready / Transit",
    description: "Pickup or delivery",
    statuses: ["ready", "out_for_delivery", "delivered"],
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Escrow completed",
    statuses: ["delivered"],
  },
];

export function OrderProgressStepper({ status }: OrderProgressStepperProps) {
  if (status === "cancelled") return null;

  // Find index of current active step
  let activeIndex = 0;
  if (status === "confirmed") activeIndex = 1;
  else if (status === "preparing") activeIndex = 2;
  else if (status === "ready" || status === "out_for_delivery") activeIndex = 3;
  else if (status === "delivered") activeIndex = 4;

  return (
    <div className="bg-white rounded-2xl border border-neutral-200 p-4 sm:p-5 shadow-xs space-y-4">
      <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
        Order Progress Tracker
      </h3>

      <div className="relative flex items-center justify-between">
        {/* Connection Line */}
        <div className="absolute left-4 right-4 top-4 h-1 bg-neutral-100 -z-0">
          <div
            className="h-full bg-primary-600 transition-all duration-500 rounded-full"
            style={{ width: `${(activeIndex / (STEPS.length - 1)) * 100}%` }}
          />
        </div>

        {STEPS.map((step, idx) => {
          const isCompleted = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div key={step.key} className="relative z-10 flex flex-col items-center text-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                  isCompleted
                    ? "bg-emerald-600 text-white shadow-sm"
                    : isCurrent
                    ? "bg-primary-600 text-white ring-4 ring-primary-100 shadow-md scale-110"
                    : "bg-neutral-100 text-neutral-400 border border-neutral-200"
                }`}
              >
                {isCompleted ? (
                  <Check className="w-4 h-4 stroke-[3]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              <span
                className={`text-xs font-semibold mt-2 ${
                  isCurrent
                    ? "text-primary-900 font-bold"
                    : isCompleted
                    ? "text-neutral-800"
                    : "text-neutral-400"
                }`}
              >
                {step.label}
              </span>
              <span className="text-[10px] text-neutral-400 hidden sm:block">
                {step.description}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
