"use client";

import Link from "next/link";
import { MapPin, ShoppingCart, Search } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { Avatar } from "@/components/ui";
import { NotificationBell } from "@/components/notifications";
import { cn } from "@/lib/utils";

import { Logo } from "@/components/ui/Logo";

export function MobileHeader() {
  const { itemCount } = useCart();
  const { selectedCampus } = useApp();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-neutral-200 lg:hidden">
      <div className="max-w-lg mx-auto flex items-center justify-between h-[56px] px-4">
        <Logo size="sm" href="/home" />

        <div className="flex items-center gap-1">
          <Link
            href="/search"
            aria-label="Search"
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-md text-neutral-500",
              "hover:bg-neutral-100 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            )}
          >
            <Search className="h-[19px] w-[19px]" />
          </Link>

          <div className="flex items-center gap-1 text-xs text-neutral-600 mr-1 ml-0.5 px-1.5 py-1 rounded-md bg-neutral-50 border border-neutral-200">
            <MapPin className="h-3.5 w-3.5 text-primary-600 shrink-0" />
            <span className="font-semibold text-neutral-900">{selectedCampus.abbreviation}</span>
          </div>

          <Link
            href="/cart"
            aria-label="Cart"
            className={cn(
              "relative h-9 w-9 flex items-center justify-center rounded-md text-neutral-500",
              "hover:bg-neutral-100 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            )}
          >
            <ShoppingCart className="h-[19px] w-[19px]" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-primary-600 text-white text-[9px] font-bold rounded-full px-1 ring-1 ring-white">
                {itemCount > 9 ? "9+" : itemCount}
              </span>
            )}
          </Link>

          {user ? (
            <>
              <NotificationBell
                variant="link"
                className="text-neutral-500"
              />

              <Link
                href="/profile"
                aria-label="Profile"
                className="ml-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1"
              >
                <Avatar
                  name={user.name}
                  size="sm"
                  className="h-8 w-8 text-[11px] ring-1 ring-neutral-200"
                />
              </Link>
            </>
          ) : (
            <Link
              href="/login"
              className="ml-1 text-xs font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 border border-primary-200/80 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
