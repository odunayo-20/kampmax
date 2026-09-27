"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Megaphone, Ticket } from "lucide-react";
import { useFeaturedPromotions } from "@/hooks/use-home";
import {
  featuredDiscountLabel,
  featuredMinSpendLabel,
  featuredProductHref,
  featuredVendorHref,
  shouldTrackView,
  trackFeaturedEvent,
  type FeaturedPlacement,
  type FeaturedPromotion,
} from "@/services/featured-promotions";

interface FeaturedPromotionsProps {
  placement: FeaturedPlacement;
  campusId?: string;
  /** Limits featured products to this category (the category strip). */
  categoryId?: string;
  title: string;
}

const click = (id: string) => () => void trackFeaturedEvent(id, "click");

function sessionStore(): Pick<Storage, "getItem" | "setItem"> | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/**
 * What an admin featured in this slot: promo codes, featured products,
 * featured vendors and campus campaigns. Renders nothing when there is none.
 * Each item's first view in a session, and every click, is counted.
 */
export function FeaturedPromotions({
  placement,
  campusId,
  categoryId,
  title,
}: FeaturedPromotionsProps) {
  const query = useFeaturedPromotions(placement, campusId, categoryId);
  const items = query.data ?? [];

  useEffect(() => {
    const storage = sessionStore();
    for (const item of items) {
      if (shouldTrackView(storage, item.id)) void trackFeaturedEvent(item.id, "view");
    }
  }, [items]);

  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="mb-2 text-sm font-semibold text-kampmax-text">{title}</h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <li key={item.id} className={item.kind === "DISCOUNT" ? "" : "sm:col-span-2 lg:col-span-3"}>
            <FeaturedItem item={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FeaturedItem({ item }: { item: FeaturedPromotion }) {
  switch (item.kind) {
    case "FEATURED_PRODUCT":
      return <ProductStrip item={item} />;
    case "FEATURED_VENDOR":
      return <VendorStrip item={item} />;
    case "CAMPUS_CAMPAIGN":
      return <CampaignBanner item={item} />;
    default:
      return <CodeCard item={item} />;
  }
}

function Heading({ item }: { item: FeaturedPromotion }) {
  return (
    <div>
      <p className="text-sm font-semibold text-kampmax-text">{item.name}</p>
      {item.description && (
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">{item.description}</p>
      )}
    </div>
  );
}

function CampaignBanner({ item }: { item: FeaturedPromotion }) {
  return (
    <Link
      href="/marketplace"
      onClick={click(item.id)}
      className="flex items-start gap-3 rounded-lg border border-kampmax-border bg-kampmax-blue/5 p-3 hover:border-kampmax-blue/50"
    >
      <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-blue" aria-hidden />
      <Heading item={item} />
    </Link>
  );
}

function ProductStrip({ item }: { item: FeaturedPromotion }) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-3">
      <Heading item={item} />
      <ul className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {item.products.map((p) => (
          <li key={p.id} className="w-36 shrink-0">
            <Link href={featuredProductHref(p)} onClick={click(item.id)} className="block">
              {p.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.image}
                  alt={p.name}
                  className="h-24 w-full rounded-md border border-kampmax-border object-cover"
                />
              ) : (
                <div className="h-24 w-full rounded-md bg-kampmax-muted" aria-hidden />
              )}
              <p className="mt-1 truncate text-xs font-medium text-kampmax-text">{p.name}</p>
              <p className="text-xs text-kampmax-text-secondary">
                ₦{p.price.toLocaleString("en-NG")}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VendorStrip({ item }: { item: FeaturedPromotion }) {
  return (
    <div className="rounded-lg border border-kampmax-border bg-white p-3">
      <Heading item={item} />
      <ul className="mt-3 flex flex-wrap gap-2">
        {item.vendors.map((v) => (
          <li key={v.id}>
            <Link
              href={featuredVendorHref(v)}
              onClick={click(item.id)}
              className="inline-flex items-center rounded-full border border-kampmax-border px-3 py-1 text-xs font-medium text-kampmax-text hover:border-kampmax-blue/50 hover:text-kampmax-blue"
            >
              {v.storeName}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CodeCard({ item: p }: { item: FeaturedPromotion }) {
  const [copied, setCopied] = useState(false);
  const minSpend = featuredMinSpendLabel(p);
  const discount = featuredDiscountLabel(p);

  async function copy() {
    if (!p.code) return;
    void trackFeaturedEvent(p.id, "click");
    try {
      await navigator.clipboard.writeText(p.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard can be blocked; the code is still visible to type in.
    }
  }

  return (
    <div className="flex h-full flex-col justify-between rounded-lg border border-kampmax-border bg-white p-3">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-kampmax-text-secondary">
          {discount}
          {minSpend ? ` · ${minSpend}` : ""}
        </p>
        <div className="mt-1">
          <Heading item={p} />
        </div>
      </div>
      {p.code && (
        <div className="mt-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded bg-kampmax-muted px-2 py-1 font-mono text-xs uppercase text-kampmax-text">
            <Ticket className="h-3 w-3" aria-hidden />
            {p.code}
          </span>
          <button
            type="button"
            onClick={() => void copy()}
            className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-kampmax-blue hover:bg-kampmax-blue/10"
          >
            {copied ? <Check className="h-3 w-3" aria-hidden /> : <Copy className="h-3 w-3" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      )}
    </div>
  );
}
