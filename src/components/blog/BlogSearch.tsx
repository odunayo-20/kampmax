import { Search } from "lucide-react";
import { BLOG_BASE_PATH } from "@/lib/blog";

/**
 * Plain GET form: works without JavaScript, and results are a normal
 * server-rendered, shareable URL (/blog?q=...).
 */
export function BlogSearch({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action={BLOG_BASE_PATH} method="get" role="search" className="relative w-full">
      <label htmlFor="blog-search" className="sr-only">
        Search articles
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-muted" />
      <input
        id="blog-search"
        name="q"
        type="search"
        defaultValue={defaultValue}
        maxLength={100}
        placeholder="Search articles"
        className="h-11 w-full rounded-lg border border-kampmax-border bg-white pl-10 pr-24 text-base text-kampmax-text placeholder:text-kampmax-text-muted focus:border-kampmax-blue focus:outline-none focus:ring-2 focus:ring-kampmax-blue/20 sm:text-sm"
      />
      <button
        type="submit"
        className="absolute right-1.5 top-1/2 h-8 -translate-y-1/2 rounded-md bg-kampmax-navy px-3.5 text-sm font-medium text-white hover:bg-kampmax-navy-light focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kampmax-blue"
      >
        Search
      </button>
    </form>
  );
}
