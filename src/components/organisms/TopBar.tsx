"use client";

import Link from "next/link";
import { MapPin, ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { useApp } from "@/lib/app-context";
import { NotificationBell } from "@/components/notifications";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/Logo";

export function TopBar() {
  const { itemCount } = useCart();
  const { selectedCampus } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-kampmax-border">
      <div className="max-w-lg mx-auto flex items-center justify-between h-14 px-4">
        <Logo size="sm" href="/home" />

        <div className="flex items-center gap-1">
          <div className="flex items-center gap-1 text-xs text-kampmax-text-secondary mr-2">
            <MapPin className="h-3.5 w-3.5 text-kampmax-blue" />
            <span className="font-medium">{selectedCampus.abbreviation}</span>
          </div>
          <NotificationBell
            variant="link"
            className="rounded-lg text-kampmax-text-secondary hover:bg-kampmax-muted"
          />
          <Link
            href="/cart"
            className="relative h-9 w-9 flex items-center justify-center rounded-lg hover:bg-kampmax-muted transition-colors"
          >
            <ShoppingCart className="h-5 w-5 text-kampmax-text-secondary" />
            {itemCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-kampmax-blue text-white text-[10px] font-bold rounded-full px-1">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
