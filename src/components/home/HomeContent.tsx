"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Wrench,
  MapPin,
  ChevronDown,
  Store as StoreIcon,
  ArrowRight,
  Calendar,
  Briefcase,
} from "lucide-react";
import { CategoryCard } from "@/components/marketplace";
import { PageContainer, SectionHeader, HorizontalScroll } from "@/components/layout";
import {
  VendorCard,
  QuickAccessGrid,
  HeroEventBanner,
  NearbyStoryReel,
  EventCard,
  HomeGigCard,
  HomeSearch,
  FreelanceServicesSection,
  GuestSignupPrompt,
  ProductShowcase,
  YourProfilesStrip,
} from "@/components/home";
import {
  CardGridSkeleton,
  CategoryGridSkeleton,
  GigGridSkeleton,
  ScrollRowSkeleton,
  StoryReelSkeleton,
} from "@/components/home/Skeleton";
import { CampusSelector } from "@/components/layout/footer/CampusSelector";
import { ServiceCard } from "@/components/service-marketplace/ServiceCard";
import { Logo } from "@/components/ui/Logo";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import {
  useHomeCategories,
  useHomeEvents,
  useHomeGigs,
  useHomeProducts,
  useHomeServices,
  useHomeVendors,
} from "@/hooks/use-home";

/**
 * The home page. A client component that starts with data the server already loaded
 * (see `app/(main)/home/page.tsx`) and takes over from there.
 */
export function HomeContent() {
  const [campusPickerOpen, setCampusPickerOpen] = useState(false);
  const { selectedCampus } = useApp();
  const { user } = useAuth();
  const campusId = selectedCampus.id;

  const productsQuery = useHomeProducts(campusId);
  const servicesQuery = useHomeServices(campusId);
  const categoriesQuery = useHomeCategories();
  const vendorsQuery = useHomeVendors(campusId);
  const gigsQuery = useHomeGigs(campusId);
  const eventsQuery = useHomeEvents(campusId);

  const products = productsQuery.data ?? [];
  const services = servicesQuery.data ?? [];
  const categories = categoriesQuery.data ?? [];
  const vendors = vendorsQuery.data ?? [];

  // The greeting depends on the visitor's clock, which the server doesn't share, so it is
  // filled in once the page is in the browser (the server and browser would disagree).
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => setGreeting(getGreeting()), []);
  const firstName = user?.name ? user.name.split(" ")[0] : null;
  const upcomingEvents = eventsQuery.data ?? [];
  const featuredEvent = upcomingEvents.find((e) => e.isFeatured) ?? upcomingEvents[0];
  const opportunities = gigsQuery.data ?? [];

  return (
    <PageContainer className="space-y-5 lg:space-y-7 pb-12">
      {/* 1. Top Hub Header: Greeting, Campus Location Selector & Search */}
      <section className="space-y-3.5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            
            <div className="h-8 w-px bg-neutral-200 hidden sm:block shrink-0" />
            <div className="space-y-0.5 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-neutral-900 leading-tight">
                {firstName ? `${greeting}, ${firstName}` : `${greeting}!`} <span aria-hidden>👋</span>
              </h1>
              <p className="text-xs text-neutral-500 font-medium truncate">
                {user
                  ? "Discover what's happening around you"
                  : `Explore ${selectedCampus.abbreviation} marketplace, events & gigs`}
              </p>
            </div>
          </div>

          {/* Campus selector pill (shown once the live campus has loaded) */}
          {selectedCampus.id && (
            <button
              type="button"
              onClick={() => setCampusPickerOpen(true)}
              aria-haspopup="dialog"
              aria-label={`Campus: ${selectedCampus.name}. Change campus`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary-50/80 border border-primary-200/70 text-xs font-bold text-primary-700 shadow-2xs shrink-0 transition-colors hover:bg-primary-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0" aria-hidden />
              <span className="truncate max-w-[120px] sm:max-w-none">
                {[selectedCampus.abbreviation, selectedCampus.location.split(",")[0]].filter(Boolean).join(", ")}
              </span>
              <ChevronDown className="h-3 w-3 text-primary-500 shrink-0" aria-hidden />
            </button>
          )}
          <CampusSelector hideTrigger open={campusPickerOpen} onOpenChange={setCampusPickerOpen} />
        </div>

        <HomeSearch />
      </section>

      {/* 2. Hero Event Banner: Kampmax Fest 2025 */}
      <HeroEventBanner event={featuredEvent} />

      {/* 3. 8-Icon Quick Access Grid (Marketplace, Services, Jobs, Events, Courses, Communities, Nearby, Pay) */}
      <QuickAccessGrid />

      {/* 3b. Signed-in users: the profiles they hold, and a way to add one */}
      <YourProfilesStrip />

      {/* 4. Popular stores reel (live vendors) */}
      {vendorsQuery.isPending ? (
        <StoryReelSkeleton />
      ) : (
        <NearbyStoryReel vendors={vendors} campusAbbreviation={selectedCampus.abbreviation} />
      )}

      {/* 5. Campus Services & Gigs — High Prominence */}
      {servicesQuery.isPending ? (
        <CardGridSkeleton label="campus services" />
      ) : (
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
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-6 sm:p-8 text-center">
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
            </div>
          )}
        </section>
      )}

      {/* 5b. Freelancer services (shows once there are live ones) */}
      <FreelanceServicesSection />

      {/* 6. Marketplace Categories */}
      {categoriesQuery.isPending ? (
        <CategoryGridSkeleton />
      ) : (
        categories.length > 0 && (
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
        )
      )}

      {/* 7. Marketplace products: Picks, New and Deals in one section */}
      <ProductShowcase
        products={products}
        loading={productsQuery.isPending}
        campusAbbreviation={selectedCampus.abbreviation}
      />

      {/* 8. Upcoming Campus Events */}
      {eventsQuery.isPending ? (
        <ScrollRowSkeleton label="events" item="event" />
      ) : upcomingEvents.length > 0 && (
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

      {/* 9. Student Gigs & Quick Work */}
      {gigsQuery.isPending ? (
        <GigGridSkeleton />
      ) : opportunities.length > 0 && (
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

      {/* 10. Campus Vendors */}
      {vendorsQuery.isPending ? (
        <ScrollRowSkeleton label="campus vendors" item="vendor" />
      ) : vendors.length > 0 && (
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

      {/* 11. For visitors who aren't signed in: what an account unlocks */}
      <GuestSignupPrompt />
    </PageContainer>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
