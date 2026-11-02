/**
 * What this browser searched for lately. Kept in the browser only: never sent anywhere,
 * and read after the page loads (never during server rendering, where there is no browser).
 * Used by the search page and to tailor the home page.
 */

const RECENT_KEY = "kampmax_recent_searches";
const MAX_RECENT = 10;

export function getRecentSearches(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((q): q is string => typeof q === "string") : [];
  } catch {
    return [];
  }
}

/** Remembers a search, newest first, without repeats. */
export function addRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  const trimmed = query.trim();
  if (!trimmed) return;
  try {
    const recent = getRecentSearches().filter((r) => r !== trimmed);
    recent.unshift(trimmed);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {
    // localStorage unavailable
  }
}

export function removeRecentSearch(query: string): void {
  if (typeof window === "undefined") return;
  try {
    const recent = getRecentSearches().filter((r) => r !== query);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // localStorage unavailable
  }
}

export function clearRecentSearches(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(RECENT_KEY);
  } catch {
    // localStorage unavailable
  }
}
