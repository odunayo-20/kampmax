"use client";

import Link from "next/link";
import {
  Store,
  Wrench,
  Briefcase,
  Ticket,
  Laptop,
  Users,
  MapPin,
  CreditCard,
  Home,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickAccessItem {
  id: string;
  label: string;
  href: string;
  icon: React.ElementType;
  bgClass: string;
  iconClass: string;
  borderClass: string;
  hoverClass: string;
}

const ITEMS: QuickAccessItem[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    href: "/marketplace",
    icon: Store,
    bgClass: "bg-blue-50/90",
    iconClass: "text-blue-600",
    borderClass: "border-blue-100",
    hoverClass: "group-hover:bg-blue-600 group-hover:text-white",
  },
  {
    id: "services",
    label: "Services",
    href: "/services",
    icon: Wrench,
    bgClass: "bg-purple-50/90",
    iconClass: "text-purple-600",
    borderClass: "border-purple-100",
    hoverClass: "group-hover:bg-purple-600 group-hover:text-white",
  },
  {
    id: "jobs",
    label: "Jobs",
    href: "/jobs",
    icon: Briefcase,
    bgClass: "bg-teal-50/90",
    iconClass: "text-teal-600",
    borderClass: "border-teal-100",
    hoverClass: "group-hover:bg-teal-600 group-hover:text-white",
  },
  {
    id: "events",
    label: "Events",
    href: "/events",
    icon: Ticket,
    bgClass: "bg-rose-50/90",
    iconClass: "text-rose-600",
    borderClass: "border-rose-100",
    hoverClass: "group-hover:bg-rose-600 group-hover:text-white",
  },
  {
    id: "freelance",
    label: "Freelance",
    href: "/freelancers/services",
    icon: Laptop,
    bgClass: "bg-indigo-50/90",
    iconClass: "text-indigo-600",
    borderClass: "border-indigo-100",
    hoverClass: "group-hover:bg-indigo-600 group-hover:text-white",
  },
  {
    id: "communities",
    label: "Communities",
    href: "/community",
    icon: Users,
    bgClass: "bg-violet-50/90",
    iconClass: "text-violet-600",
    borderClass: "border-violet-100",
    hoverClass: "group-hover:bg-violet-600 group-hover:text-white",
  },
  {
    id: "nearby",
    label: "Nearby",
    href: "/nearby",
    icon: MapPin,
    bgClass: "bg-sky-50/90",
    iconClass: "text-sky-600",
    borderClass: "border-sky-100",
    hoverClass: "group-hover:bg-sky-600 group-hover:text-white",
  },
  {
    id: "pay",
    label: "Kampmax Pay",
    href: "/pay",
    icon: CreditCard,
    bgClass: "bg-amber-50/90",
    iconClass: "text-amber-600",
    borderClass: "border-amber-100",
    hoverClass: "group-hover:bg-amber-600 group-hover:text-white",
  },
];

export function QuickAccessGrid() {
  return (
    <section aria-label="Quick Access" className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Quick Access</h2>
      </div>

      <div className="grid grid-cols-4 gap-2.5 sm:gap-3.5">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex flex-col items-center justify-center p-3 bg-white rounded-2xl border border-neutral-200/80",
                "shadow-[0_1px_3px_rgba(0,0,0,0.03)] hover:shadow-md hover:border-primary-200 transition-all duration-200",
                "active:scale-[0.97]"
              )}
            >
              <div
                className={cn(
                  "w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center border transition-all duration-200 mb-1.5",
                  item.bgClass,
                  item.iconClass,
                  item.borderClass,
                  item.hoverClass
                )}
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200 group-hover:scale-110" />
              </div>
              <span className="text-[11px] sm:text-xs font-semibold text-neutral-800 text-center tracking-tight leading-tight line-clamp-1 group-hover:text-primary-600">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Housing: its own banner, as on the app's Home */}
      <Link
        href="/accommodation"
        aria-label="Find a place to live. Rooms and flats from verified agents"
        className="group flex items-center gap-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 transition-all duration-200 hover:border-emerald-300 hover:shadow-md active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600">
          <Home className="h-5 w-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-neutral-800">Find a place to live</span>
          <span className="block text-xs text-neutral-600">Rooms, hostels and flats from verified agents</span>
        </span>
        <ChevronRight className="h-[18px] w-[18px] shrink-0 text-neutral-400" aria-hidden />
      </Link>
    </section>
  );
}
