"use client";

import { useRouter } from "next/navigation";
import { ChevronDown } from "lucide-react";

/** A native dropdown (best on phones) that goes to the matching link when changed. */
export function SortSelect({
  value,
  options,
}: {
  value: string;
  options: { value: string; label: string; href: string }[];
}) {
  const router = useRouter();
  return (
    <label className="inline-flex items-center gap-2 text-sm text-kampmax-text-secondary">
      <span className="hidden sm:inline">Sort by</span>
      <span className="relative">
        <select
          value={value}
          onChange={(e) => {
            const next = options.find((o) => o.value === e.target.value);
            if (next) router.push(next.href, { scroll: false });
          }}
          className="h-9 appearance-none rounded-md border border-neutral-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-kampmax-text shadow-sm focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
      </span>
    </label>
  );
}
