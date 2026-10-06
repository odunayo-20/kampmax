"use client";

import { cn } from "@/lib/utils";
import type { Storefront } from "@/types/storefront";
import { getStoreNavigationSections } from "@/services/storefront";

interface StoreNavigationProps {
  store: Storefront;
  activeSection: string | null;
  onNavigate: (id: string) => void;
}

/** Height of the sticky site header plus this bar, so targets land below both. */
const SCROLL_OFFSET = 56 + 56 + 12;

/**
 * Sticky section navigation. Only lists sections the store actually has — never
 * empty placeholders — and sits below the 56px site header so it stays visible
 * while scrolling.
 */
export function StoreNavigation({ store, activeSection, onNavigate }: StoreNavigationProps) {
  const sections = getStoreNavigationSections(store);

  function scrollTo(id: string) {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;
    window.scrollTo({ top: y, behavior: "smooth" });
    onNavigate(id);
  }

  // "Contact" is an action in the header, not a section on the page.
  const tabs = [
    { id: "products", label: "Products", enabled: sections.products },
    { id: "services", label: "Services", enabled: sections.services },
    { id: "reviews", label: "Reviews", enabled: sections.reviews },
    { id: "about", label: "About", enabled: sections.about },
    { id: "delivery", label: "Delivery", enabled: sections.delivery },
    { id: "policies", label: "Policies", enabled: sections.policies },
  ].filter((t) => t.enabled);

  if (tabs.length === 0) return null;

  return (
    <nav
      aria-label="Store sections"
      className="sticky top-14 z-30 -mx-4 mt-4 border-y border-kampmax-border bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/80"
    >
      <div className="mx-auto max-w-[1280px] overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ul className="flex gap-1.5 whitespace-nowrap py-2">
          {tabs.map((tab) => {
            const active = activeSection === tab.id;
            return (
              <li key={tab.id}>
                <button
                  type="button"
                  aria-current={active ? "true" : undefined}
                  onClick={() => scrollTo(tab.id)}
                  className={cn(
                    "rounded-full px-4 py-1.5 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1",
                    active
                      ? "bg-kampmax-navy text-white"
                      : "text-kampmax-text-secondary hover:bg-kampmax-muted hover:text-kampmax-text"
                  )}
                >
                  {tab.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
