import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "services", label: "Services", href: "/freelancers/services" },
  { id: "freelancers", label: "Freelancers", href: "/freelancers" },
] as const;

/** Switches between the two ways to find freelance help: by what's offered, or by who offers it. */
export function BrowseTabs({ active }: { active: (typeof TABS)[number]["id"] }) {
  return (
    <nav aria-label="Browse freelance help" className="inline-flex rounded-lg bg-neutral-100 p-1">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          aria-current={tab.id === active ? "page" : undefined}
          className={cn(
            "rounded-md px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
            tab.id === active
              ? "bg-white text-kampmax-text shadow-sm"
              : "text-kampmax-text-secondary hover:text-kampmax-text"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}
