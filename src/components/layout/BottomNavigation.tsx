"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BOTTOM_NAV_ITEMS } from "@/config/navigation";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const pathname = usePathname();

  function isTabActive(href: string, activeMatch?: (p: string) => boolean): boolean {
    if (activeMatch) {
      return activeMatch(pathname);
    }
    if (href === "/home") return pathname === "/home" || pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-neutral-200/90 z-50 safe-bottom lg:hidden shadow-[0_-2px_12px_rgba(0,0,0,0.04)]"
    >
      <div className="max-w-lg mx-auto flex items-center justify-around h-[62px] px-1">
        {BOTTOM_NAV_ITEMS.map((tab) => {
          const active = isTabActive(tab.href, tab.activeMatch);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.id}
              href={tab.href}
              aria-label={tab.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 w-16 h-full relative",
                "transition-colors duration-200",
                active ? "text-primary-600" : "text-neutral-500 hover:text-neutral-700"
              )}
            >
              <div className="relative flex items-center justify-center">
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] transition-all duration-200",
                    active ? "stroke-[2.5px] scale-105 text-primary-600" : "stroke-[1.8px]"
                  )}
                />
                {active && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 h-[3px] w-4 bg-primary-600 rounded-full" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] tracking-tight transition-all duration-200",
                  active ? "font-bold text-primary-700" : "font-medium text-neutral-500"
                )}
              >
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
