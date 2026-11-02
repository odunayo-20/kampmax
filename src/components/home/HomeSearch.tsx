"use client";

import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { useRecentSearches } from "@/hooks/use-recent-searches";

/** Things people commonly look for here, shown until this browser has searches of its own. */
const SUGGESTIONS = ["Logo design", "Laptop repair", "Hair braiding", "Tutoring", "Textbooks"];
const RECENT_SHOWN = 5;

const chipClass =
  "inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-neutral-600 transition-colors hover:bg-primary-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600";

/**
 * The home page's search: type, press Enter, and land on Explore with the search filled
 * in and results showing. A plain GET form, so it still works without JavaScript; with
 * it, each search is remembered here, and offered back next time in place of the
 * generic suggestions.
 */
export function HomeSearch() {
  const { searches, record, clear } = useRecentSearches();
  const hasRecent = searches.length > 0;
  const chips = hasRecent ? searches.slice(0, RECENT_SHOWN) : SUGGESTIONS;

  return (
    <div className="space-y-2.5">
      <form
        action="/explore"
        role="search"
        className="relative"
        // Remember the search, then let the form carry on to Explore as normal.
        onSubmit={(e) => record(String(new FormData(e.currentTarget).get("q") ?? ""))}
      >
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-neutral-400"
          aria-hidden
        />
        <input
          type="search"
          name="q"
          maxLength={100}
          autoComplete="off"
          placeholder="Search for events, products, services, jobs..."
          aria-label="Search Kampmax"
          className="h-[48px] w-full rounded-2xl border border-neutral-200/90 bg-white pl-11 pr-24 text-sm text-neutral-900 shadow-[0_1px_3px_rgba(0,0,0,0.04)] placeholder:text-neutral-400 hover:border-primary-500/40 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 h-9 -translate-y-1/2 rounded-xl bg-primary-600 px-4 text-xs font-semibold text-white transition-colors hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
        >
          Search
        </button>
      </form>

      <ul
        aria-label={hasRecent ? "Your recent searches" : "Popular searches"}
        className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {chips.map((term) => (
          <li key={term} className="shrink-0">
            <Link href={`/explore?q=${encodeURIComponent(term)}`} onClick={() => record(term)} className={chipClass}>
              {hasRecent && <Clock className="h-3 w-3 text-neutral-400" aria-hidden />}
              {term}
            </Link>
          </li>
        ))}
        {hasRecent && (
          <li className="shrink-0">
            <button
              type="button"
              onClick={clear}
              className="rounded-full px-2 py-1 text-xs font-medium text-neutral-400 hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
            >
              Clear
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
