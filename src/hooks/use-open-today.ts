"use client";

import { useEffect, useState } from "react";
import type { MarketplaceProvider } from "@/types/service-marketplace";

/**
 * Whether the provider is open on the viewer's current weekday.
 * Returns `null` until mounted: the day depends on the clock/timezone, so computing it
 * during render would differ between server and client and cause a hydration mismatch.
 */
export function useOpenToday(provider: MarketplaceProvider): boolean | null {
  const [todayIndex, setTodayIndex] = useState<number | null>(null);

  useEffect(() => {
    // Map Sunday..Sat → Monday-first, matching backend dayIndex
    setTodayIndex((new Date().getDay() + 6) % 7);
  }, []);

  if (todayIndex === null) return null;
  return Boolean(provider.availability.days[todayIndex]?.isAvailable);
}
