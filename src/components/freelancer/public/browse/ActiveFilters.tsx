import Link from "next/link";
import { X } from "lucide-react";
import { FREELANCER_SERVICE_PRICING_LABEL } from "@/config/freelancer-services";
import { browseHref, type BrowseFilters } from "./filters";

/** What is narrowing the results, each with a one-tap way to remove it. */
export function ActiveFilters({ filters, categoryName }: { filters: BrowseFilters; categoryName?: string }) {
  const tags = [
    filters.q && { label: `“${filters.q}”`, remove: browseHref(filters, { q: "" }) },
    categoryName && { label: categoryName, remove: browseHref(filters, { category: "" }) },
    filters.pricing && {
      label: FREELANCER_SERVICE_PRICING_LABEL[filters.pricing],
      remove: browseHref(filters, { pricing: "" }),
    },
  ].filter((t): t is { label: string; remove: string } => !!t);

  if (tags.length === 0) return null;

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {tags.map((tag) => (
        <li key={tag.label}>
          <Link
            href={tag.remove}
            aria-label={`Remove filter: ${tag.label}`}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 py-1 pl-3 pr-2 text-xs font-medium text-primary-700 hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            {tag.label}
            <X className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </li>
      ))}
      <li>
        <Link href="/freelancers/services" className="text-xs font-medium text-kampmax-text-secondary hover:text-kampmax-text hover:underline">
          Clear all
        </Link>
      </li>
    </ul>
  );
}
