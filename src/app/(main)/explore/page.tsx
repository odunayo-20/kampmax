"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  SlidersHorizontal,
  Calendar,
  MapPin,
  Sparkles,
  ArrowRight,
  Store,
  Wrench,
  Briefcase,
  Ticket,
  GraduationCap,
  ChevronRight,
  Star,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { events } from "@/data/events";
import { products } from "@/data/products";
import { marketplaceServices } from "@/data/service-marketplace";
import { getAllOpportunities } from "@/data/opportunity";
import { campusCourses } from "@/data/courses";
import { cn } from "@/lib/utils";

type ExploreCategory = "all" | "events" | "products" | "services" | "jobs" | "courses";

const CATEGORIES: { id: ExploreCategory; label: string }[] = [
  { id: "all", label: "All" },
  { id: "events", label: "Events" },
  { id: "products", label: "Products" },
  { id: "services", label: "Services" },
  { id: "jobs", label: "Jobs" },
  { id: "courses", label: "Courses" },
];

export default function ExplorePage() {
  const [selectedCategory, setSelectedCategory] = useState<ExploreCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const q = searchQuery.toLowerCase().trim();

  const allOpportunities = useMemo(() => getAllOpportunities(), []);

  const filteredEvents = useMemo(() => {
    return events.filter(
      (e) =>
        !q ||
        e.title.toLowerCase().includes(q) ||
        e.location.toLowerCase().includes(q) ||
        e.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [q]);

  const filteredProducts = useMemo(() => {
    return products.filter(
      (p) => !q || p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }, [q]);

  const filteredServices = useMemo(() => {
    return marketplaceServices.filter(
      (s) =>
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.tags?.some((t) => t.toLowerCase().includes(q))
    );
  }, [q]);

  const filteredJobs = useMemo(() => {
    return allOpportunities.filter(
      (j) =>
        !q ||
        j.title.toLowerCase().includes(q) ||
        j.employer.name.toLowerCase().includes(q) ||
        j.skills.some((s) => s.toLowerCase().includes(q))
    );
  }, [allOpportunities, q]);

  const filteredCourses = useMemo(() => {
    return campusCourses.filter(
      (c) =>
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.provider.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
    );
  }, [q]);

  return (
    <PageContainer className="space-y-4 pb-12">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-neutral-900">Explore</h1>
            <p className="text-xs text-neutral-500">
              Browse events, products, services, jobs, courses and more
            </p>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search in Kampmax Hub..."
            className="w-full h-11 pl-10 pr-4 bg-white border border-neutral-200 rounded-xl text-sm text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600 focus:border-transparent shadow-xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
                selectedCategory === cat.id
                  ? "bg-primary-600 text-white shadow-xs"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Mixed Multi-Vertical Results Stream */}
      <div className="space-y-3.5">
        {/* Events Vertical */}
        {(selectedCategory === "all" || selectedCategory === "events") &&
          filteredEvents.map((event) => (
            <div
              key={`event-${event.id}`}
              className="group flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-900 shrink-0">
                  <img
                    src={
                      event.imageUrl ||
                      "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={event.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">
                      {event.title}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500 line-clamp-1">{event.location}</p>
                  <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-amber-500" />
                      <span>{event.timeDisplay || "Sat, 27 Sep 2025"}</span>
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-primary-500" />
                      <span>{event.distance || "0.6 km"}</span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-rose-50 text-rose-600 font-semibold text-[10px]">
                      Event
                    </span>
                  </div>
                </div>
              </div>

              <Link
                href={`/events/${event.id}`}
                className="w-full sm:w-auto text-center px-4 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                {event.ticketPrice && event.ticketPrice > 0
                  ? `Get Ticket (₦${event.ticketPrice.toLocaleString()})`
                  : "Get Ticket"}
              </Link>
            </div>
          ))}

        {/* Products Vertical */}
        {(selectedCategory === "all" || selectedCategory === "products") &&
          filteredProducts.slice(0, 4).map((product) => (
            <Link
              key={`product-${product.id}`}
              href={`/marketplace/product/${product.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 shrink-0 border border-neutral-100">
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-primary-600">
                    {product.title}
                  </h3>
                  <p className="text-xs text-neutral-500">Gadgets & Accessories</p>
                  <p className="text-xs font-extrabold text-neutral-900">
                    ₦{product.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 font-semibold text-[10px]">
                  Product
                </span>
                <span className="text-[11px] text-neutral-400">0.5 km</span>
              </div>
            </Link>
          ))}

        {/* Services Vertical */}
        {(selectedCategory === "all" || selectedCategory === "services") &&
          filteredServices.slice(0, 3).map((service) => (
            <Link
              key={`service-${service.id}`}
              href={`/services/${service.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-purple-50 shrink-0 border border-purple-100">
                  <img
                    src={
                      service.imageUrl ||
                      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80"
                    }
                    alt={service.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-purple-600">
                    {service.name}
                  </h3>
                  <p className="text-xs text-neutral-500">
                    {service.tags?.[0] || "Campus Service"} • Verified Pro
                  </p>
                  <p className="text-xs font-extrabold text-neutral-900">
                    ₦{service.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-600 font-semibold text-[10px]">
                  Service
                </span>
                <span className="text-[11px] text-neutral-400">1.1 km</span>
              </div>
            </Link>
          ))}

        {/* Jobs Vertical */}
        {(selectedCategory === "all" || selectedCategory === "jobs") &&
          filteredJobs.slice(0, 3).map((job) => (
            <Link
              key={`job-${job.id}`}
              href={`/jobs/${job.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-600 font-black text-lg shrink-0">
                  {job.employer.name.charAt(0)}
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-neutral-900 line-clamp-1 group-hover:text-teal-600">
                      {job.title}
                    </h3>
                  </div>
                  <p className="text-xs text-neutral-500">{job.employer.name}</p>
                  <p className="text-xs font-bold text-teal-700">
                    ₦{(job.budget.max || job.budget.min || 50000).toLocaleString()}/month
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold text-[10px]">
                  Job
                </span>
                <span className="text-[11px] text-neutral-400">1.5 km</span>
              </div>
            </Link>
          ))}

        {/* Courses Vertical */}
        {(selectedCategory === "all" || selectedCategory === "courses") &&
          filteredCourses.map((course) => (
            <div
              key={`course-${course.id}`}
              className="group flex items-center justify-between p-3.5 bg-white border border-neutral-200/90 rounded-2xl shadow-xs hover:shadow-md transition-all gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-indigo-50 shrink-0 border border-indigo-100">
                  <img
                    src={course.imageUrl}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>
                <div className="space-y-0.5">
                  <h3 className="text-sm font-bold text-neutral-900 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-neutral-500">{course.provider} • {course.duration}</p>
                  <p className="text-xs font-extrabold text-neutral-900">
                    ₦{course.price.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold text-[10px]">
                  Course
                </span>
                <span className="text-[11px] text-neutral-400">{course.distance || "2.0 km"}</span>
              </div>
            </div>
          ))}
      </div>
    </PageContainer>
  );
}
