import Link from "next/link";
import { cn } from "@/lib/utils";

const KINDS = [
  { key: "orders", href: "/admin/disputes", label: "Shop orders" },
  { key: "contracts", href: "/admin/disputes/contracts", label: "Freelance contracts" },
] as const;

/**
 * Switches between the two dispute consoles. They are separate pages because
 * the cases differ: an order dispute is acted on from the order itself, a
 * contract dispute is ruled on right in its own console.
 */
export function DisputeKindTabs({ active }: { active: (typeof KINDS)[number]["key"] }) {
  return (
    <nav aria-label="Dispute type" className="mb-4 inline-flex rounded-lg border border-kampmax-border bg-white p-0.5">
      {KINDS.map((kind) => (
        <Link
          key={kind.key}
          href={kind.href}
          aria-current={kind.key === active ? "page" : undefined}
          className={cn(
            "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            kind.key === active
              ? "bg-kampmax-navy text-white"
              : "text-kampmax-text-secondary hover:bg-kampmax-muted/60 hover:text-kampmax-text"
          )}
        >
          {kind.label}
        </Link>
      ))}
    </nav>
  );
}
