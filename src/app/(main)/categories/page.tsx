"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  Laptop,
  Shirt,
  Gamepad2,
  Home as HomeIcon,
  UtensilsCrossed,
  Sparkles,
  Wrench,
  Search,
  ArrowRight,
  Store,
  Layers,
  Briefcase,
  Scissors,
  Camera,
  GraduationCap,
  Car,
  ChevronRight,
  TrendingUp,
  Tag,
  type LucideIcon,
} from "lucide-react";
import { PageContainer } from "@/components/layout";
import { useHomeCategories, useHomeProducts, useHomeServices } from "@/hooks/use-home";
import { SP_SERVICE_CATEGORIES } from "@/data/service-categories";
import { getAllOpportunities } from "@/data/opportunity";
import { cn } from "@/lib/utils";
import { useApp } from "@/lib/app-context";

const CATEGORY_ICON_MAP: Record<string, LucideIcon> = {
  cat1: BookOpen,
  cat2: Laptop,
  cat3: Shirt,
  cat4: Gamepad2,
  cat5: HomeIcon,
  cat6: UtensilsCrossed,
  cat7: Sparkles,
  cat8: Wrench,
};

const SERVICE_ICON_MAP: Record<string, LucideIcon> = {
  cat1: Scissors,
  cat2: GraduationCap,
  cat3: Laptop,
  cat4: Wrench,
  cat5: Camera,
  cat6: HomeIcon,
  cat7: Car,
  cat8: UtensilsCrossed,
};

interface ComputedCategoryItem {
  key: string;
  id: string;
  name: string;
  department: "marketplace" | "services" | "gigs";
  icon: LucideIcon;
  colorClass: string;
  itemCount: number;
  tags: string[];
  href: string;
}

type DepartmentFilter = "all" | "marketplace" | "services" | "gigs";

export default function CategoriesPage() {
  const { selectedCampus } = useApp();
  const [activeTab, setActiveTab] = useState<DepartmentFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const campusId = selectedCampus.id;

  // Live queries
  const categoriesQuery = useHomeCategories();
  const productsQuery = useHomeProducts(campusId);
  const servicesQuery = useHomeServices(campusId);

  const rawCategories = categoriesQuery.data ?? [];
  const rawProducts = productsQuery.data ?? [];
  const rawServices = servicesQuery.data ?? [];
  const rawOpportunities = useMemo(() => getAllOpportunities(), []);

  // Compute live categories directly from active data records
  const categoryData = useMemo<ComputedCategoryItem[]>(() => {
    // 1. Marketplace Categories (From Live Categories & Products)
    const marketplaceItems: ComputedCategoryItem[] = rawCategories
      .filter((cat) => cat.id !== "cat8") // cat8 is services, mapped in services section
      .map((cat) => {
        const matchingProducts = rawProducts.filter((p) => {
          const matchesCat = p.categoryId === cat.id;
          const matchesCampus = !campusId || p.campusId === campusId;
          return matchesCat && matchesCampus;
        });

        const tagSet = new Set<string>();
        matchingProducts.forEach((p) => {
          p.tags?.forEach((t) => tagSet.add(t));
        });

        return {
          key: `mkt-${cat.id}`,
          id: cat.id,
          name: cat.name,
          department: "marketplace",
          icon: CATEGORY_ICON_MAP[cat.id] ?? Tag,
          colorClass: "text-primary-600 bg-primary-50 border-primary-200",
          itemCount: matchingProducts.length,
          tags: Array.from(tagSet).slice(0, 5),
          href: `/marketplace?category=${cat.id}`,
        };
      });

    // 2. Service Categories (From Service Categories & Active Services)
    const serviceItems: ComputedCategoryItem[] = SP_SERVICE_CATEGORIES.slice(0, 6).map((scat) => {
      const matchingServices = rawServices.filter((s) => s.categoryId === scat.id);

      const tagSet = new Set<string>();
      matchingServices.forEach((s) => {
        s.tags?.forEach((t) => tagSet.add(t));
      });

      return {
        key: `srv-${scat.id}`,
        id: scat.id,
        name: scat.name,
        department: "services",
        icon: SERVICE_ICON_MAP[scat.id] ?? Wrench,
        colorClass: "text-purple-600 bg-purple-50 border-purple-200",
        itemCount: matchingServices.length,
        tags: Array.from(tagSet).slice(0, 5),
        href: `/services?category=${scat.id}`,
      };
    });

    // 3. Gig & Opportunity Categories (Extracted from Real Opportunities)
    const oppCategoryMap = new Map<string, typeof rawOpportunities>();
    rawOpportunities.forEach((opp) => {
      const catName = opp.categoryName || "General Gigs";
      const existing = oppCategoryMap.get(catName) || [];
      existing.push(opp);
      oppCategoryMap.set(catName, existing);
    });

    const gigItems: ComputedCategoryItem[] = Array.from(oppCategoryMap.entries()).map(
      ([catName, opps], idx) => {
        const skillSet = new Set<string>();
        opps.forEach((o) => {
          o.skills?.forEach((s) => skillSet.add(s));
        });

        return {
          key: `gig-${idx}-${catName.toLowerCase().replace(/\s+/g, "-")}`,
          id: `gig-${idx}`,
          name: catName,
          department: "gigs",
          icon: Briefcase,
          colorClass: "text-teal-600 bg-teal-50 border-teal-200",
          itemCount: opps.length,
          tags: Array.from(skillSet).slice(0, 5),
          href: `/jobs`,
        };
      }
    );

    return [...marketplaceItems, ...serviceItems, ...gigItems];
  }, [rawCategories, rawProducts, rawServices, rawOpportunities, campusId]);

  // Aggregate department counts
  const counts = useMemo(() => {
    const marketplaceCount = categoryData
      .filter((c) => c.department === "marketplace")
      .reduce((acc, c) => acc + c.itemCount, 0);
    const servicesCount = categoryData
      .filter((c) => c.department === "services")
      .reduce((acc, c) => acc + c.itemCount, 0);
    const gigsCount = categoryData
      .filter((c) => c.department === "gigs")
      .reduce((acc, c) => acc + c.itemCount, 0);
    return {
      total: marketplaceCount + servicesCount + gigsCount,
      marketplace: marketplaceCount,
      services: servicesCount,
      gigs: gigsCount,
    };
  }, [categoryData]);

  // Search filter
  const filteredCategories = useMemo(() => {
    return categoryData.filter((cat) => {
      const matchesTab = activeTab === "all" || cat.department === activeTab;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesTab;

      const matchesSearch =
        cat.name.toLowerCase().includes(q) ||
        cat.tags.some((t) => t.toLowerCase().includes(q));

      return matchesTab && matchesSearch;
    });
  }, [activeTab, searchQuery, categoryData]);

  return (
    <PageContainer className="space-y-6 pb-16">
      {/* 1. Header & Department Search */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-primary-600 uppercase tracking-wider mb-1">
              <Layers className="h-3.5 w-3.5" />
              <span>Campus Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-neutral-900">
              Browse Categories
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 font-medium">
              Explore active listings and student services across {selectedCampus.name} ({selectedCampus.abbreviation})
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-700 transition-colors"
            >
              <Store className="h-3.5 w-3.5" />
              Marketplace
            </Link>
            <Link
              href="/services"
              className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-neutral-100 hover:bg-neutral-200 text-xs font-bold text-neutral-700 transition-colors"
            >
              <Wrench className="h-3.5 w-3.5" />
              Services
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories and tags (e.g. Textbooks, Electronics, Repairs, Hair)..."
            className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-neutral-200/90 text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent shadow-2xs transition-all"
          />
        </div>

        {/* Department Switcher Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setActiveTab("all")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150",
              activeTab === "all"
                ? "bg-neutral-900 text-white shadow-xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            All Departments ({categoryData.length})
          </button>
          <button
            onClick={() => setActiveTab("marketplace")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150",
              activeTab === "marketplace"
                ? "bg-primary-600 text-white shadow-xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            Marketplace Products ({counts.marketplace})
          </button>
          <button
            onClick={() => setActiveTab("services")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150",
              activeTab === "services"
                ? "bg-purple-600 text-white shadow-xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            Campus Services ({counts.services})
          </button>
          <button
            onClick={() => setActiveTab("gigs")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all duration-150",
              activeTab === "gigs"
                ? "bg-teal-600 text-white shadow-xs"
                : "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50"
            )}
          >
            Student Gigs & Work ({counts.gigs})
          </button>
        </div>
      </section>

      {/* 2. Category Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Link
              key={category.key}
              href={category.href}
              className={cn(
                "group bg-white rounded-2xl border border-neutral-200/90 p-5 flex flex-col justify-between relative overflow-hidden",
                "hover:border-primary-300 hover:shadow-md transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
              )}
            >
              <div className="space-y-3 relative z-10">
                {/* Header: Icon + Department Badge + Live Count */}
                <div className="flex items-start justify-between">
                  <div className={cn("p-2.5 rounded-xl border", category.colorClass)}>
                    <Icon className="h-6 w-6" />
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600">
                      {category.department === "marketplace" ? "Product" : category.department === "services" ? "Service" : "Gig"}
                    </span>
                    <span className="text-xs font-extrabold text-neutral-900 bg-neutral-100/90 px-2 py-0.5 rounded-md">
                      {category.itemCount} {category.department === "marketplace" ? "products" : category.department === "services" ? "services" : "gigs"}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <div>
                  <h3 className="text-base font-bold text-neutral-900 group-hover:text-primary-600 transition-colors flex items-center justify-between">
                    <span>{category.name}</span>
                    <ArrowRight className="h-4 w-4 text-neutral-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
                  </h3>
                </div>

                {/* Tags from Real Active Records */}
                {category.tags.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1.5">
                      Popular Tags:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {category.tags.map((tag) => (
                        <span
                          key={`${category.key}-${tag}`}
                          className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-neutral-50 text-neutral-700 border border-neutral-200/70 group-hover:bg-white transition-colors capitalize"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Action */}
              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-end text-[11px] text-neutral-400 relative z-10">
                <span className="text-primary-600 font-bold flex items-center gap-0.5 group-hover:underline">
                  Browse department <ChevronRight className="h-3 w-3" />
                </span>
              </div>
            </Link>
          );
        })}
      </section>

      {/* 3. Empty State */}
      {filteredCategories.length === 0 && (
        <div className="rounded-2xl border border-dashed border-neutral-200 bg-white p-10 text-center space-y-3">
          <div className="h-12 w-12 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
            <Search className="h-6 w-6" />
          </div>
          <h3 className="text-base font-bold text-neutral-900">No categories found</h3>
          <p className="text-xs text-neutral-500 max-w-sm mx-auto">
            No departments matched &quot;{searchQuery}&quot;. Try searching for general terms like &quot;Textbooks&quot;, &quot;Electronics&quot;, or &quot;Repairs&quot;.
          </p>
          <button
            onClick={() => {
              setSearchQuery("");
              setActiveTab("all");
            }}
            className="px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-bold hover:bg-primary-700 transition-colors"
          >
            Clear Search
          </button>
        </div>
      )}

      {/* 4. Bottom Quick Discovery Banner */}
      <section className="rounded-2xl bg-gradient-to-r from-primary-900 to-indigo-950 p-6 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-amber-400 tracking-wide uppercase">
            <TrendingUp className="h-3.5 w-3.5" />
            Sell or Offer a Service
          </span>
          <h2 className="text-lg sm:text-xl font-black tracking-tight">
            Got items to sell or skills to offer on campus?
          </h2>
          <p className="text-xs text-neutral-300 max-w-md">
            Join campus students earning daily. Post a product, register your service, or apply for student gigs at {selectedCampus.name}.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link
            href="/vendor/register"
            className="px-4 py-2.5 rounded-xl bg-white text-neutral-950 text-xs font-extrabold hover:bg-neutral-100 active:scale-95 transition-all shadow-sm"
          >
            Sell on Kampmax
          </Link>
          <Link
            href="/service-provider/register"
            className="px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-extrabold active:scale-95 transition-all"
          >
            Offer Services
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}
