"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin/blog", label: "Articles", exact: true },
  { href: "/admin/blog/categories", label: "Categories" },
  { href: "/admin/blog/tags", label: "Tags" },
];

export function BlogAdminTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Blog sections" className="mb-4 border-b border-kampmax-border">
      <ul className="-mb-px flex gap-1">
        {TABS.map((tab) => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href);
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center border-b-2 px-3.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue",
                  active ? "border-kampmax-blue text-kampmax-navy" : "border-transparent text-kampmax-text-secondary hover:text-kampmax-text"
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
