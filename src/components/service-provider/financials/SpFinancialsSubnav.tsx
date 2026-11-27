"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/service-provider/financials", label: "Overview", match: "overview" },
  { href: "/service-provider/financials/transactions", label: "Transactions", match: "transactions" },
  { href: "/service-provider/financials/payout-account", label: "Payout account", match: "payout-account" },
] as const;

/** Financials section tab bar — keeps the module scannable on mobile. */
export function SpFinancialsSubnav() {
  const pathname = usePathname();

  const active = (match: string): boolean => {
    if (match === "overview") return pathname === "/service-provider/financials";
    return pathname.startsWith(`/service-provider/financials/${match}`);
  };

  return (
    <nav aria-label="Financials sections" className="flex gap-1 overflow-x-auto border-b border-kampmax-border pb-px">
      {ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={active(item.match) ? "page" : undefined}
          className={cn(
            "whitespace-nowrap rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition-colors",
            active(item.match)
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}