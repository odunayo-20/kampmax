"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { VariantGroup, VariantOption } from "./types";

interface VariantSelectorProps {
  variantGroups: VariantGroup[];
  selectedVariants: Record<string, string>;
  onChange: (groupId: string, optionId: string) => void;
  allSelected: boolean;
  missingGroups: string[];
}

export function VariantSelector({ variantGroups, selectedVariants, onChange, allSelected, missingGroups }: VariantSelectorProps) {
  if (!variantGroups.length) return null;

  return (
    <div className="space-y-4 rounded-[10px] border border-neutral-200 bg-white p-4">
      {variantGroups.map((group) => (
        <div key={group.id}>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-neutral-900">{group.name}</h3>
            <span className="text-xs text-neutral-500">
              {selectedVariants[group.id] ? group.options.find((o) => o.id === selectedVariants[group.id])?.label : "Select"}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {group.options.map((opt: VariantOption) => {
              const selected = selectedVariants[group.id] === opt.id;
              return (
                <button
                  key={opt.id}
                  disabled={!opt.available}
                  aria-pressed={selected}
                  aria-disabled={!opt.available}
                  onClick={() => onChange(group.id, opt.id)}
                  className={cn(
                    "min-h-9 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1",
                    !opt.available && "opacity-45 cursor-not-allowed bg-neutral-100 border-neutral-200 text-neutral-400 line-through",
                    opt.available && selected && "bg-primary-600 border-primary-600 text-white shadow-sm",
                    opt.available && !selected && "bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                  )}
                >
                  {opt.image && (
                    <Image
                      src={opt.image}
                      alt=""
                      width={24}
                      height={24}
                      className="mr-1.5 -ml-1 inline-block h-6 w-6 rounded-full object-cover align-middle"
                    />
                  )}
                  {opt.label}
                  {opt.priceModifier ? (
                    <span className={cn("ml-1 text-xs", selected ? "text-white/80" : "text-neutral-500")}>
                      {opt.priceModifier > 0 ? `+${formatNaira(opt.priceModifier)}` : formatNaira(opt.priceModifier)}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!allSelected && missingGroups.length > 0 && (
        <p className="text-xs text-amber-700 flex items-center gap-1">
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          Please select {missingGroups.join(" and ")}
        </p>
      )}
    </div>
  );
}

function formatNaira(amount: number): string {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);
}