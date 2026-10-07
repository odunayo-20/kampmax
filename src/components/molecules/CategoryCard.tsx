"use client";

import Link from "next/link";
import {
  BookOpen,
  Laptop,
  Shirt,
  Gamepad2,
  Home,
  UtensilsCrossed,
  Wrench,
  type LucideIcon,
  Flower2,
} from "lucide-react";
import { Category } from "@/types";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  cat1: BookOpen,
  cat2: Laptop,
  cat3: Shirt,
  cat4: Gamepad2,
  cat5: Home,
  cat6: UtensilsCrossed,
  cat7: Flower2,
  cat8: Wrench,
};

interface CategoryCardProps {
  category: Category;
  className?: string;
}

export function CategoryCard({ category, className }: CategoryCardProps) {
  const Icon = CATEGORY_ICONS[category.id] ?? BookOpen;
  return (
    <Link
      href={`/marketplace?category=${category.id}`}
      className={cn(
        "group flex flex-col items-center gap-2 p-3 bg-white rounded-2xl border border-neutral-200/80 shadow-2xs",
        "hover:border-primary-300 hover:shadow-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
        className
      )}
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600 transition-all group-hover:bg-primary-600 group-hover:text-white group-hover:scale-105">
        <Icon className="h-5 w-5" strokeWidth={2} aria-hidden />
      </span>
      <span className="text-xs font-bold text-neutral-800 text-center leading-tight line-clamp-1 group-hover:text-primary-600">
        {category.name}
      </span>
      <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-neutral-100 text-neutral-500">
        {category.productCount} items
      </span>
    </Link>
  );
}

interface CategoryPillProps {
  category: Category;
  isActive?: boolean;
  className?: string;
}

export function CategoryPill({ category, isActive, className }: CategoryPillProps) {
  const Icon = CATEGORY_ICONS[category.id] ?? BookOpen;
  return (
    <Link
      href={`/marketplace?category=${category.id}`}
      className={cn(
        "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150",
        isActive
          ? "bg-primary-600 text-white shadow-xs"
          : "bg-white text-neutral-700 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50",
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      <span>{category.name}</span>
    </Link>
  );
}
