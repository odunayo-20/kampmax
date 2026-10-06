"use client";

import { useEffect, useRef, useState } from "react";
import type { Storefront } from "@/types/storefront";
import { getStoreNavigationSections } from "@/services/storefront";
import { cn } from "@/lib/utils";
import { StoreHeader } from "./StoreHeader";
import { StoreNavigation } from "./StoreNavigation";
import { StoreProducts } from "./StoreProducts";
import { StoreReviews } from "./StoreReviews";
import { StoreAbout } from "./StoreAbout";
import { StoreDelivery } from "./StoreDelivery";
import { StorePolicies } from "./StorePolicies";

interface StorefrontViewProps {
  store: Storefront;
}

const SECTION_ORDER = ["products", "services", "reviews", "about", "delivery", "policies"] as const;

/**
 * Compose the public storefront page. Holds the active section (scroll-spy and
 * navigation highlight) and renders only the sections the vendor supports.
 */
export function StorefrontView({ store }: StorefrontViewProps) {
  const sections = getStoreNavigationSections(store);
  const [activeSection, setActiveSection] = useState<string>("products");
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const els = SECTION_ORDER.map((id) => document.getElementById(id)).filter(
      Boolean
    ) as HTMLElement[];
    if (els.length === 0) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );
    els.forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  const bottomSections = [
    sections.delivery && "delivery",
    sections.policies && "policies",
  ].filter(Boolean);

  return (
    <div className="space-y-0">
      <StoreHeader store={store} />
      <StoreNavigation
        store={store}
        activeSection={activeSection}
        onNavigate={setActiveSection}
      />

      <div className="space-y-12 py-8">
        {sections.products && (
          <section id="products" aria-labelledby="products-heading" className="scroll-mt-32">
            <SectionHeading
              id="products-heading"
              title="Products"
              description={`Everything ${store.storeName} has listed on Kampmax.`}
              count={store.productsCount}
            />
            <StoreProducts store={store} />
          </section>
        )}

        {sections.services && (
          <section id="services" aria-labelledby="services-heading" className="scroll-mt-32">
            <SectionHeading id="services-heading" title="Services" />
            <p className="rounded-2xl border border-kampmax-border bg-white p-6 text-sm text-kampmax-text-secondary">
              {store.storeName} also offers services. Service listings are coming soon.
            </p>
          </section>
        )}

        {sections.reviews && (
          <section id="reviews" aria-labelledby="reviews-heading" className="scroll-mt-32">
            <SectionHeading
              id="reviews-heading"
              title="Customer reviews"
              description="What buyers say about this store."
              count={store.reviewCount}
            />
            <StoreReviews store={store} />
          </section>
        )}

        {sections.about && (
          <section id="about" aria-labelledby="about-heading" className="scroll-mt-32">
            <StoreAbout store={store} />
          </section>
        )}

        {bottomSections.length > 0 && (
          <div className="grid items-start gap-8 lg:grid-cols-2">
            {sections.delivery && (
              <section
                id="delivery"
                aria-labelledby="delivery-heading"
                className={cn("scroll-mt-32", bottomSections.length === 1 && "lg:col-span-2")}
              >
                <StoreDelivery store={store} />
              </section>
            )}
            {sections.policies && (
              <section
                id="policies"
                aria-labelledby="policies-heading"
                className={cn("scroll-mt-32", bottomSections.length === 1 && "lg:col-span-2")}
              >
                <StorePolicies store={store} />
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/** Consistent heading for a page section: title, short description, count chip. */
function SectionHeading({
  id,
  title,
  description,
  count,
}: {
  id: string;
  title: string;
  description?: string;
  count?: number;
}) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2.5">
        <h2 id={id} className="text-xl font-bold tracking-tight text-kampmax-text">
          {title}
        </h2>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-kampmax-muted px-2.5 py-0.5 text-xs font-semibold text-kampmax-text-secondary">
            {count.toLocaleString()}
          </span>
        )}
      </div>
      {description && (
        <p className="mt-1 text-sm text-kampmax-text-secondary">{description}</p>
      )}
    </div>
  );
}
