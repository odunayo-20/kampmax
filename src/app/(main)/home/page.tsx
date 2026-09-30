"use client";

import Link from "next/link";
import {
  Search,
  TrendingUp,
  Star,
  Clock,
  Wrench,
  MapPin,
  ChevronDown,
  Store as StoreIcon,
  ArrowRight,
  Sparkles,
  Calendar,
  Briefcase,
} from "lucide-react";
import { ProductCard, CategoryCard } from "@/components/marketplace";
import { PageContainer, SectionHeader, HorizontalScroll } from "@/components/layout";
import {
  VendorCard,
  ProductCardHorizontal,
  FeaturedPromotions,
  QuickAccessGrid,
  HeroEventBanner,
  NearbyStoryReel,
  EventCard,
  HomeGigCard,
} from "@/components/home";
import { ServiceCard } from "@/components/service-marketplace/ServiceCard";
import { getProviderById } from "@/services/service-marketplace";
import { getFeaturedEvent, getUpcomingEvents } from "@/data/events";
import { getAllOpportunities } from "@/data/opportunity";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  useHomeCategories,
  useHomeProducts,
  useHomeServices,
  useHomeVendors,
} from "@/hooks/use-home";

export default function HomePage() {
  const { selectedCampus } = useApp();
  const { user } = useAuth();
  const campusId = selectedCampus.id;

  const productsQuery = useHomeProducts(campusId);
  const servicesQuery = useHomeServices(campusId);
  const categoriesQuery = useHomeCategories();
  const vendorsQuery = useHomeVendors(campusId);

  const products = productsQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  const recommended = products.slice(0, 4);
  const featured = products
    .filter((p) => p.originalPrice && p.originalPrice > p.price)
    .slice(0, 4);
  const recent = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 4);

  const greeting = getGreeting();
  const firstName = user?.name?.split(" ")[0] || "Daniel";
  const featuredEvent = getFeaturedEvent(campusId);
  const upcomingEvents = getUpcomingEvents(campusId);
  const opportunities = getAllOpportunities().slice(0, 4);

  return (
    <PageContainer className="space-y-5 lg:space-y-7 pb-12">
      {/* 1. Top Hub Header: Greeting, Campus Location Selector & Search */}
      <section className="space-y-3.5">
        <div className="flex items-start justify-between">
          <div className="space-y-0.5">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-neutral-900 leading-tight">
              {greeting}, {firstName} <span aria-hidden>👋</span>
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Discover what&apos;s happening around you
            </p>
          </div>

          {/* Campus selector pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50/80 border border-primary-200/70 text-xs font-bold text-primary-700 shadow-2xs">
            <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span className="truncate max-w-[120px] sm:max-w-none">{selectedCampus.abbreviation}, {selectedCampus.location.split(",")[0]}</span>
            <ChevronDown className="h-3 w-3 text-primary-500 shrink-0" />
          </div>
        </div>

        {/* Universal Search Bar */}
        <div>
          <Link
            href="/explore"
            aria-label="Search for events, products, services, jobs..."
            className="group flex items-center gap-3 h-[48px] px-4 bg-white border border-neutral-200/90 rounded-2xl text-neutral-500 text-sm shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:border-primary-500/40 hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            <Search className="h-[18px] w-[18px] text-neutral-400 group-hover:text-primary-600 transition-colors shrink-0" />
            <span className="truncate text-neutral-400 font-normal">
              Search for events, products, services, jobs...
            </span>
            <span className="ml-auto hidden sm:inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 border border-neutral-200">
              Explore All
            </span>
          </Link>
        </div>
      </section>

      {/* 2. Hero Event Banner: Kampmax Fest 2025 */}
      <HeroEventBanner event={featuredEvent} />

      {/* 3. 8-Icon Quick Access Grid (Marketplace, Services, Jobs, Events, Courses, Communities, Nearby, Pay) */}
      <QuickAccessGrid />

      {/* 4. Nearby & Trending Story Reel */}
      <NearbyStoryReel />

      {/* 5. Campus Services & Gigs — High Prominence */}
      <section aria-label="Campus Services" className="space-y-3">
        <SectionHeader
          title="Campus Services & Gigs"
          subtitle={`Hire trusted student & campus pros at ${selectedCampus.abbreviation}`}
          icon={<Wrench className="h-4 w-4 text-primary-600" aria-hidden />}
          action={{ label: "Explore services", href: "/services" }}
        />
        {services.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {services.slice(0, 4).map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                provider={getProviderById(service.providerId)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 sm:p-8 text-center">
            {servicesQuery.isPending ? (
              <p className="text-sm text-neutral-500">Loading campus services…</p>
            ) : (
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-50 text-primary-600">
                  <Wrench className="h-5 w-5" />
                </div>
                <p className="text-sm font-medium text-neutral-900">Discover Campus Services</p>
                <p className="text-xs text-neutral-500 max-w-sm">
                  Laundry, tech repairs, hair styling, photography, tutoring, and more from verified campus providers.
                </p>
                <Link
                  href="/services"
                  className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-primary-700 transition-colors"
                >
                  Browse all services <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 6. Marketplace Categories */}
      {categories.length > 0 && (
        <section aria-label="Categories" className="space-y-2.5">
          <SectionHeader
            title="Browse categories"
            action={{ label: "See all", href: "/categories" }}
          />
          <div className="grid grid-cols-4 gap-2.5 sm:gap-3 lg:grid-cols-8">
            {categories.slice(0, 8).map((cat) => (
              <CategoryCard key={cat.id} category={cat} />
            ))}
          </div>
        </section>
      )}

      {/* 7. Recommended for you (Products) */}
      {recommended.length > 0 ? (
        <section aria-label="Recommended for you" className="space-y-3">
          <SectionHeader
            title="Recommended for you"
            subtitle={`Picked for ${selectedCampus.abbreviation} students`}
            icon={<Star className="h-4 w-4 text-amber-500" aria-hidden />}
            action={{ label: "See all", href: "/marketplace" }}
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {recommended.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      ) : null}

      {/* 8. Fresh Arrivals / Just Listed */}
      {recent.length > 0 && (
        <section aria-label="Fresh Arrivals" className="space-y-3">
          <SectionHeader
            title="Fresh Arrivals"
            subtitle="Just listed across campus"
            icon={<Sparkles className="h-4 w-4 text-primary-600" aria-hidden />}
            action={{ label: "View all", href: "/marketplace" }}
          />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
            {recent.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* 9. Upcoming Campus Events */}
      {upcomingEvents.length > 0 && (
        <section aria-label="Upcoming Events" className="space-y-3">
          <SectionHeader
            title="Upcoming Campus Events"
            subtitle={`Happening soon at ${selectedCampus.abbreviation}`}
            icon={<Calendar className="h-4 w-4 text-primary-600" aria-hidden />}
            action={{ label: "All events", href: "/events" }}
          />
          <HorizontalScroll>
            {upcomingEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </HorizontalScroll>
        </section>
      )}

      {/* 10. Student Gigs & Quick Work */}
      {opportunities.length > 0 && (
        <section aria-label="Student Gigs and Jobs" className="space-y-3">
          <SectionHeader
            title="Student Gigs & Work"
            subtitle="Earn on campus with short gigs & freelance tasks"
            icon={<Briefcase className="h-4 w-4 text-teal-600" aria-hidden />}
            action={{ label: "Find work", href: "/jobs" }}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            {opportunities.map((opp) => (
              <HomeGigCard key={opp.id} opportunity={opp} />
            ))}
          </div>
        </section>
      )}

      {/* 11. Deals & Discounts */}
      {featured.length > 0 && (
        <section aria-label="Deals and discounts" className="rounded-2xl bg-amber-50/70 border border-amber-100 p-4 sm:p-5 space-y-3">
          <SectionHeader
            title="Deals & Discounts"
            subtitle="Campus-specific offers"
            icon={<TrendingUp className="h-4 w-4 text-amber-600" aria-hidden />}
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
      )}

      {/* 12. Campus Vendors */}
      {vendors.length > 0 && (
        <section aria-label="Campus vendors" className="space-y-3">
          <SectionHeader
            title="Campus vendors"
            subtitle={`Shops at ${selectedCampus.abbreviation}`}
            icon={<StoreIcon className="h-4 w-4 text-primary-600" aria-hidden />}
            action={{ label: "View all", href: "/marketplace" }}
          />
          <HorizontalScroll>
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </HorizontalScroll>
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
