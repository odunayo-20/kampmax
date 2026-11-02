"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

/**
 * Search that updates as you type, for the server-rendered browse pages. After a short
 * pause it puts the search in the URL (keeping the other filters) and the server sends
 * back fresh results; the old ones stay on screen meanwhile, so the list never flashes
 * empty. Enter searches at once.
 *
 * `params` are the page's other active filters, kept as they are; empty ones are left
 * out. Paging is dropped, so a new search starts on page 1.
 */
export function SearchBox({
  action,
  value,
  params = {},
  placeholder,
  label,
}: {
  /** The page this searches, e.g. "/freelancers". */
  action: string;
  /** The search currently in the URL. */
  value: string;
  params?: Record<string, string>;
  placeholder: string;
  label: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [text, setText] = useState(value);
  const debounced = useDebounce(text.trim(), 300);
  // The search we last put in the URL. Tells our own navigation apart from someone else's.
  const pushed = useRef(value);

  function search(q: string) {
    if (q === pushed.current) return;
    pushed.current = q;
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    for (const [key, v] of Object.entries(params)) if (v) query.set(key, v);
    const qs = query.toString();
    startTransition(() => router.replace(qs ? `${action}?${qs}` : action, { scroll: false }));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- run when the typed text settles, not on every filter change
  useEffect(() => search(debounced), [debounced]);

  // When the URL's search changes to something we didn't put there (a removed tag,
  // "Clear all", back/forward), follow it, unless our own search is still on its way.
  useEffect(() => {
    if (isPending || value === pushed.current) return;
    pushed.current = value;
    setText(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to the URL changing, not to the pending flag flipping
  }, [value]);

  return (
    <form
      method="get"
      action={action}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        search(text.trim());
      }}
      className="relative"
    >
      {/* Without JavaScript, Enter still submits the form with the other filters. */}
      {Object.entries(params).map(([key, v]) => v && <input key={key} type="hidden" name={key} value={v} />)}

      {isPending ? (
        <Loader2
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-primary-600"
          aria-hidden
        />
      ) : (
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
      )}
      <input
        type="search"
        name="q"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={100}
        autoComplete="off"
        placeholder={placeholder}
        aria-label={label}
        className="h-11 w-full rounded-md border border-neutral-200 bg-white pl-9 pr-10 text-sm shadow-sm [&::-webkit-search-cancel-button]:hidden focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/20"
      />
      {text && (
        <button
          type="button"
          onClick={() => {
            setText("");
            search("");
          }}
          aria-label="Clear search"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </form>
  );
}
