"use client";

import { useEffect, useState } from "react";
import { fetchCampuses, getCampuses } from "@/services/campus";
import type { Campus } from "@/types";

// One request serves every component on the page (a list of cards each asking
// for the campuses would otherwise make one request per card). A failed load is
// not kept, so the next component to ask tries again.
let loaded: Campus[] | null = null;
let inflight: Promise<Campus[] | null> | null = null;

function loadCampuses(): Promise<Campus[] | null> {
  if (loaded) return Promise.resolve(loaded);
  inflight ??= fetchCampuses({ limit: 100 })
    .then((res) => {
      if (!res.error && res.data.length > 0) loaded = res.data;
      return loaded;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Test hook: forget the campuses loaded so far. */
export function resetCampusOptionsCache(): void {
  loaded = null;
  inflight = null;
}

/** A campus's short name (e.g. RUGIPO), or its full name; undefined until known or when there is no such campus. */
export function useCampusLabel(campusId?: string | null): string | undefined {
  const { campuses } = useCampusOptions();
  const campus = campusId ? campuses.find((c) => c.id === campusId) : undefined;
  return campus?.abbreviation || campus?.name || undefined;
}

/**
 * Campuses from the backend, for pickers and labels. Starts from what was already
 * loaded (or the service's cache) so a list shows immediately, then refreshes.
 */
export function useCampusOptions(): { campuses: Campus[]; isLoading: boolean } {
  const [campuses, setCampuses] = useState<Campus[]>(() => loaded ?? getCampuses());
  const [isLoading, setIsLoading] = useState(!loaded);

  useEffect(() => {
    let active = true;
    loadCampuses().then((list) => {
      if (!active) return;
      if (list) setCampuses(list);
      setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return { campuses, isLoading };
}
