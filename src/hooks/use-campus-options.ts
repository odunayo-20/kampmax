"use client";

import { useEffect, useState } from "react";
import { fetchCampuses, getCampuses } from "@/services/campus";
import type { Campus } from "@/types";

/**
 * Campuses from the backend, for pickers. Starts from the service's in-memory cache
 * so a previously loaded list shows immediately, then refreshes from the API.
 */
export function useCampusOptions(): { campuses: Campus[]; isLoading: boolean } {
  const [campuses, setCampuses] = useState<Campus[]>(() => getCampuses());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetchCampuses({ limit: 100 }).then((res) => {
      if (!active) return;
      if (!res.error && res.data.length > 0) setCampuses(res.data);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { campuses, isLoading };
}
