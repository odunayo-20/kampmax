"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  Laptop,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
  Store,
  Tag,
  User,
  UserCheck,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import { FallbackImage } from "@/components/ui/FallbackImage";
import { Highlight } from "./Highlight";
import type { SearchEntityType, SearchResultItem } from "@/types";

const SECTION_ORDER: SearchEntityType[] = [
  "product",
  "vendor",
  "job",
  "service",
  "freelance",
  "provider",
  "freelancer",
  "category",
  "post",
  "event",
];

const SECTION_CONFIG: Record<
  SearchEntityType,
  { icon: LucideIcon; label: string }
> = {
  product: { icon: Package, label: "Products" },
  vendor: { icon: Store, label: "Vendors" },
  job: { icon: Briefcase, label: "Jobs" },
  service: { icon: Wrench, label: "Services" },
  provider: { icon: User, label: "Service providers" },
  freelance: { icon: Laptop, label: "Freelance services" },
  freelancer: { icon: UserCheck, label: "Freelancers" },
  category: { icon: Tag, label: "Categories" },
  post: { icon: MessageSquare, label: "Posts" },
  event: { icon: CalendarDays, label: "Events" },
};

interface SearchResultsProps {
  items: SearchResultItem[];
  query: string;
  savedJobIds?: string[];
  /** When given, each section offers "See all" to narrow the results to that type. */
  onSeeAll?: (type: SearchEntityType) => void;
  className?: string;
}

/**
 * Paginated unified results, grouped by entity type. Each type renders an
 * intentional card that reuses the owning vertical's component so search
 * results stay visually consistent with the rest of the app:
 *   product → ProductCard, job → OpportunityCard (Module 27),
 *   service → ServiceCard, provider → ProviderCard,
 *   vendor/category/post/event → dedicated rows.
 */
export function SearchResults({ items, query, onSeeAll, className }: SearchResultsProps) {
  const grouped = useMemo(() => {
    const byType: Partial<Record<SearchEntityType, SearchResultItem[]>> = {};
    for (const item of items) {
      (byType[item.type] = byType[item.type] || []).push(item);
    }
    return byType;
  }, [items]);

  const sections = SECTION_ORDER.filter((type) => (grouped[type]?.length ?? 0) > 0);

  if (sections.length === 0) return null;

  return (
    <div className={cn("space-y-8", className)}>
      {sections.map((type) => {
        const config = SECTION_CONFIG[type];
        const Icon = config.icon;
        const sectionItems = grouped[type]!;

        return (
          <section key={type} aria-label={`${config.label} results`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-md bg-neutral-100 flex items-center justify-center">
                <Icon className="h-3.5 w-3.5 text-neutral-500" />
              </div>
              <h3 className="text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                {config.label}
              </h3>
              <span className="text-xs text-neutral-500">({sectionItems.length})</span>
              {onSeeAll && (
                <button
                  type="button"
                  onClick={() => onSeeAll(type)}
                  aria-label={`See all ${config.label.toLowerCase()}`}
                  className="ml-auto flex items-center gap-0.5 rounded text-xs font-medium text-primary-600 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  See all
                  <ChevronRight className="h-3 w-3" aria-hidden />
                </button>
              )}
            </div>

            {type === "vendor" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionItems.map((item) => (
                  <VendorRow key={item.id} item={item} query={query} />
                ))}
              </div>
            )}

            {type !== "vendor" && (
              <ResultsRows items={sectionItems} query={query} />
            )}
          </section>
        );
      })}
      {query && (
        <p className="sr-only">Search results for &quot;{query}&quot;</p>
      )}
    </div>
  );
}

function VendorRow({ item, query }: { item: SearchResultItem; query: string }) {
  return (
    <Link
      href={item.url}
      className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <Avatar name={item.title} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
            <Highlight text={item.title} query={query} />
          </p>
        </div>
        {typeof item.rating === "number" && item.rating > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star className="h-3 w-3 fill-accent-500 text-accent-500" />
            <span className="text-xs text-neutral-600">{item.rating}</span>
          </div>
        )}
        <p className="text-xs text-neutral-500 truncate mt-0.5">
              <Highlight text={item.subtitle} query={query} />
            </p>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0 group-hover:text-primary-600 transition-colors" />
    </Link>
  );
}

function ResultsRows({ items, query }: { items: SearchResultItem[]; query: string }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.url}
          className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
        >
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0 relative flex items-center justify-center">
            {item.image ? (
              <FallbackImage
                src={item.image}
                alt={item.title}
                fill
                className="object-cover"
                sizes="48px"
                fallback={<Tag className="h-5 w-5 text-neutral-400" aria-hidden />}
              />
            ) : (
              <Tag className="h-5 w-5 text-neutral-400" aria-hidden />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
              <Highlight text={item.title} query={query} />
            </p>
            <p className="text-xs text-neutral-500 truncate mt-0.5">
              <Highlight text={item.subtitle} query={query} />
            </p>
            {typeof item.price === "number" && (
              <p className="text-xs font-bold text-neutral-900 mt-0.5">{formatNaira(item.price)}</p>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0 group-hover:text-primary-600 transition-colors" />
        </Link>
      ))}
    </div>
  );
}