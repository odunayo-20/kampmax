"use client";

import Link from "next/link";
import {
  Search, TrendingUp, Star, Clock, Zap,
  ShoppingBag, Wallet, MessageCircle,
  MapPin, Store as StoreIcon
} from "lucide-react";
import { ProductCard, CategoryCard } from "@/components/marketplace";
import { PageContainer, SectionHeader, HorizontalScroll } from "@/components/layout";
import { VendorCard, QuickAction, ProductCardHorizontal, FeaturedPromotions } from "@/components/home";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { useHomeCategories, useHomeProducts, useHomeVendors } from "@/hooks/use-home";
import { useUnreadMessageCount } from "@/hooks/use-messages";
import { useCart } from "@/lib/cart-context";

export default function HomePage() {
  const { selectedCampus } = useApp();
  const { user } = useAuth();
  const campusId = selectedCampus.id;
  const unreadMessagesQuery = useUnreadMessageCount();

  const productsQuery = useHomeProducts(campusId);
  const categoriesQuery = useHomeCategories();
  const vendorsQuery = useHomeVendors(campusId);

  const products = productsQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];
  const recommended = products.slice(0, 8);
  const featured = products
    .filter((p) => p.originalPrice && p.originalPrice > p.price)
    .slice(0, 6);
  const recent = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);
  const unreadMessages = unreadMessagesQuery.data ?? 0;

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] || "Student";

  return (
    <PageContainer className="space-y-6 lg:space-y-8">
      {/* 1. Hero — strongest visual area: #F3F7FD / #0B2345 / #4B5563 / CTA #1769E0 */}
      <section className="rounded-[14px] bg-primary-50 border border-primary-100 px-4 py-5 sm:px-6 sm:py-6">
        <div className="space-y-1">
          <p className="text-sm font-medium text-neutral-600">
            {greeting}, {firstName} <span aria-hidden>👋</span>
          </p>
          <h1 className="text-[22px] font-extrabold tracking-tight text-primary-900 leading-none sm:text-[26px]">
            Shop around <span className="text-primary-600">{selectedCampus.abbreviation}</span>
          </h1>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0" aria-hidden />
            <span>{selectedCampus.location}</span>
            <span className="hidden sm:inline-flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-neutral-300" aria-hidden />
              <span>{productsQuery.data ? `${productsQuery.data.length} products near you` : "Loading products…"}</span>
            </span>
          </div>
        </div>
        {/* 2. Search — prominent within hero, white card on #F3F7FD */}
        <div className="mt-4">
          <Link
            href="/search"
            aria-label="Search products, vendors, food and categories"
            className="group flex items-center gap-3 h-[46px] pl-4 pr-4 bg-white border border-neutral-200 rounded-[10px] text-neutral-600 text-sm shadow-[0_1px_2px_rgba(16,24,40,0.06)] hover:border-primary-600/30 hover:shadow-[0_4px_12px_rgba(16,24,40,0.08)] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1"
          >
            <Search className="h-[18px] w-[18px] text-neutral-500 group-hover:text-primary-600 transition-colors shrink-0" aria-hidden />
            <span className="truncate">Search products, vendors, food...</span>
            <span className="ml-auto hidden sm:inline-flex text-[11px] font-medium px-2 py-1 rounded-md bg-neutral-50 text-neutral-600 border border-neutral-200">
              Press / to search
            </span>
          </Link>
        </div>
      </section>

      {/* 3. Quick Actions — feel like actions, not stats */}
      <section aria-label="Quick actions">
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          <QuickAction
            href="/marketplace"
            icon={<ShoppingBag className="h-5 w-5" />}
            label="Buy"
          />
          <QuickAction
            href="/marketplace?sell=true"
            icon={<Zap className="h-5 w-5" />}
            label="Sell"
          />
          <QuickAction
            href="/profile/wallet"
            icon={<Wallet className="h-5 w-5" />}
            label="Wallet"
          />
          <QuickAction
            href="/chat"
            icon={<MessageCircle className="h-5 w-5" />}
            label="Chat"
            badge={unreadMessages}
          />
        </div>
      </section>

      {/* 4. Categories — rebuilt with consistent lucide icons, no emojis */}
      <section aria-label="Categories">
        <SectionHeader
          title="Browse categories"
          action={{ label: "See all", href: "/marketplace" }}
        />
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3 lg:grid-cols-8">
          {categories.slice(0, 8).map((cat) => (
            <CategoryCard key={cat.id} category={cat} />
          ))}
        </div>
      </section>

      {/* 5. Recommended for you — primary product discovery, grid (most attention) */}
      {recommended.length > 0 ? (
        <section aria-label="Recommended for you">
          <SectionHeader
            title="Recommended for you"
            subtitle={`Picked for ${selectedCampus.abbreviation} students`}
            icon={<Star className="h-4 w-4 text-accent-500" aria-hidden />}
            action={{ label: "See all", href: "/marketplace" }}
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {recommended.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <section aria-label="Recommended for you">
          <SectionHeader
            title="Recommended for you"
            subtitle="Based on campus activity"
            icon={<Star className="h-4 w-4 text-accent-500" aria-hidden />}
          />
          <div className="rounded-[10px] border border-dashed border-neutral-200 bg-white p-8 text-center">
            {productsQuery.isPending ? (
              <p className="text-sm text-neutral-500">Loading products…</p>
            ) : productsQuery.isError ? (
              <>
                <p className="text-sm font-medium text-neutral-900">Couldn&apos;t load products</p>
                <button
                  type="button"
                  onClick={() => productsQuery.refetch()}
                  className="text-xs text-primary-600 mt-1 hover:underline"
                >
                  Try again
                </button>
              </>
            ) : (
              <>
                <p className="text-sm font-medium text-neutral-900">No products listed yet</p>
                <p className="text-xs text-neutral-500 mt-1">New listings from campus vendors will show up here.</p>
              </>
            )}
          </div>
        </section>
      )}

      {/* Promo codes featured by Kampmax */}
      <FeaturedPromotions placement="homepage_banner" campusId={campusId} title="Promo codes for you" />

      {/* 7. Deals & Discounts — amber strategic: #FFFBEB / #F59E0B / #DC2626 */}
      <FeaturedPromotions placement="deals_page" campusId={campusId} title="Deals & codes" />
      {featured.length > 0 ? (
        <section aria-label="Deals and discounts" className="rounded-[14px] bg-accent-50 border border-accent-100 p-4 sm:p-5">
          <SectionHeader
            title="Deals & Discounts"
            subtitle="Campus-specific offers"
            icon={<TrendingUp className="h-4 w-4 text-accent-600" aria-hidden />}
            action={{ label: "View all", href: "/marketplace" }}
          />
          <div className="lg:hidden">
            <HorizontalScroll>
              {featured.map((product) => (
                <ProductCardHorizontal key={product.id} product={product} />
              ))}
            </HorizontalScroll>
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {featured.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : (
        <section aria-label="Deals and discounts">
          <SectionHeader
            title="Deals & Discounts"
            subtitle="Campus-specific offers"
            icon={<TrendingUp className="h-4 w-4 text-accent-600" aria-hidden />}
          />
          <div className="rounded-[10px] border border-dashed border-neutral-200 bg-white p-8 text-center">
            <p className="text-sm font-medium text-neutral-900">No deals available right now</p>
            <p className="text-xs text-neutral-500 mt-1">Great offers from campus vendors will appear here.</p>
          </div>
        </section>
      )}

      {/* Secondary sections — less visual prominence, keep existing functionality */}

      {/* Campus Vendors */}
      {vendors.length > 0 && (
        <section aria-label="Campus vendors">
          <SectionHeader
            title="Campus vendors"
            subtitle={`Shops at ${selectedCampus.abbreviation}`}
            icon={<StoreIcon className="h-4 w-4 text-kampmax-blue" aria-hidden />}
            action={{ label: "View all", href: "/marketplace" }}
          />
          <HorizontalScroll>
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* Just Listed */}
      {recent.length > 0 && (
        <section aria-label="Just listed">
          <SectionHeader
            title="Just listed"
            subtitle="Fresh from campus sellers"
            icon={<Clock className="h-4 w-4 text-kampmax-text-secondary" aria-hidden />}
            action={{ label: "View all", href: "/marketplace" }}
          />
          <div className="lg:hidden">
            <HorizontalScroll>
              {recent.map((product) => (
                <ProductCardHorizontal key={product.id} product={product} />
              ))}
            </HorizontalScroll>
          </div>
          <div className="hidden lg:grid lg:grid-cols-4 lg:gap-4">
            {recent.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
    </PageContainer>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
