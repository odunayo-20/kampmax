"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Briefcase,
  CalendarDays,
  ChevronRight,
  MessageSquare,
  Package,
  ShieldCheck,
  Star,
  Store,
  Tag,
  User,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { Avatar } from "@/components/ui";
import type { SearchEntityType, SearchResultItem } from "@/types";
import { getProductById } from "@/services/products";
import { getVendorById } from "@/services/users";
import { getDiscoverableOpportunity } from "@/services/opportunity";
import {
  getMarketplaceProvider,
  getProviderActiveServices,
  getServiceDetail,
} from "@/services/service-marketplace";
import { ProductCard } from "@/components/marketplace/ProductCard";
import { OpportunityCard } from "@/components/freelancer/opportunities/OpportunityCard";
import { ServiceCard } from "@/components/service-marketplace/ServiceCard";
import { ProviderCard } from "@/components/service-marketplace/ProviderCard";

const SECTION_ORDER: SearchEntityType[] = [
  "product",
  "vendor",
  "job",
  "service",
  "provider",
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
  category: { icon: Tag, label: "Categories" },
  post: { icon: MessageSquare, label: "Posts" },
  event: { icon: CalendarDays, label: "Events" },
};

interface SearchResultsProps {
  items: SearchResultItem[];
  query: string;
  /** Saved job ids for the authenticated user (reuse of Module 27 saved jobs). */
  savedJobIds?: string[];
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
export function SearchResults({ items, query, savedJobIds, className }: SearchResultsProps) {
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
            </div>

            {type === "product" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionItems.map((item) => {
                  const product = getProductById(item.id);
                  if (!product) return null;
                  const store = getVendorById(product.vendorId);
                  return (
                    <ProductCard
                      key={item.id}
                      product={product}
                      vendorName={store?.storeName}
                      vendorVerified={store?.verified}
                      className="h-full"
                    />
                  );
                })}
              </div>
            )}

            {type === "job" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionItems.map((item) => {
                  const opportunity = getDiscoverableOpportunity(item.id);
                  if (!opportunity) return null;
                  return (
                    <OpportunityCard
                      key={item.id}
                      opportunity={opportunity}
                      saved={savedJobIds?.includes(item.id)}
                      href={`/jobs/${item.id}`}
                    />
                  );
                })}
              </div>
            )}

            {type === "service" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {sectionItems.map((item) => {
                  const detail = getServiceDetail(item.id);
                  if (!detail) return null;
                  return (
                    <ServiceCard
                      key={item.id}
                      service={detail.service}
                      provider={detail.provider}
                      className="h-full"
                    />
                  );
                })}
              </div>
            )}

            {type === "provider" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {sectionItems.map((item) => {
                  const provider = getMarketplaceProvider(item.id);
                  if (!provider) return null;
                  return (
                    <ProviderCard
                      key={item.id}
                      provider={provider}
                      serviceCount={getProviderActiveServices(item.id).length}
                      className="h-full"
                    />
                  );
                })}
              </div>
            )}

            {type === "vendor" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {sectionItems.map((item) => (
                  <VendorRow key={item.id} item={item} />
                ))}
              </div>
            )}

            {(type === "category" || type === "post" || type === "event") && (
              <ResultsRows items={sectionItems} />
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

function VendorRow({ item }: { item: SearchResultItem }) {
  const store = getVendorById(item.id);
  return (
    <Link
      href={item.url}
      className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
    >
      <Avatar name={store?.storeName ?? item.title} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
            {item.title}
          </p>
          {store?.verified && (
            <ShieldCheck className="h-3.5 w-3.5 text-primary-600 shrink-0" aria-label="Verified vendor" />
          )}
        </div>
        {typeof item.rating === "number" && item.rating > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star className="h-3 w-3 fill-accent-500 text-accent-500" />
            <span className="text-xs text-neutral-600">{item.rating}</span>
            {store && (
              <span className="text-xs text-neutral-400">· {store.totalSales} sales</span>
            )}
          </div>
        )}
        <p className="text-xs text-neutral-500 truncate mt-0.5">{item.subtitle}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-neutral-300 shrink-0 group-hover:text-primary-600 transition-colors" />
    </Link>
  );
}

function ResultsRows({ items }: { items: SearchResultItem[] }) {
  return (
    <div className="space-y-2">
      {items.map((item) => (
        <Link
          key={item.id}
          href={item.url}
          className="group flex items-center gap-3 p-3 bg-white border border-neutral-200 rounded-xl hover:border-primary-300 hover:shadow-sm transition-all"
        >
          {item.image ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0 relative">
              <Image src={item.image} alt={item.title} fill className="object-cover" sizes="48px" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-neutral-100 flex items-center justify-center shrink-0">
              <Tag className="h-5 w-5 text-neutral-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-neutral-900 truncate group-hover:text-primary-700 transition-colors">
              {item.title}
            </p>
            <p className="text-xs text-neutral-500 truncate mt-0.5">{item.subtitle}</p>
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