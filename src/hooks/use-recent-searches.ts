"use client";

import { useCallback, useEffect, useState } from "react";
import { addRecentSearch, clearRecentSearches, getRecentSearches } from "@/lib/recent-searches";

/**
 * This browser's recent searches, newest first. Empty on the server and for the first
 * render in the browser, then filled in: reading browser storage while rendering would
 * make the server's page and the browser's disagree.
 */
export function useRecentSearches() {
  const [searches, setSearches] = useState<string[]>([]);

  useEffect(() => setSearches(getRecentSearches()), []);

  const record = useCallback((term: string) => {
    addRecentSearch(term);
    setSearches(getRecentSearches());
  }, []);

  const clear = useCallback(() => {
    clearRecentSearches();
    setSearches([]);
  }, []);

  return { searches, record, clear };
}
