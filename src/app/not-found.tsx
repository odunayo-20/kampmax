import Link from "next/link";
import { Compass, Home, LifeBuoy, Search } from "lucide-react";

export const metadata = { title: "Page not found - Kampmax" };

/** Any URL that matches no page. Offers the three useful next steps, not a dead end. */
export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-kampmax-border bg-white p-6 text-center shadow-xs">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <Compass className="h-6 w-6" aria-hidden />
        </div>
        <h1 className="mt-4 text-lg font-bold text-kampmax-text">We can&apos;t find that page</h1>
        <p className="mt-2 text-sm leading-relaxed text-kampmax-text-secondary">
          The link may be old or mistyped, or what you were looking for was removed. Your account and orders are unaffected.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
          >
            <Home className="h-4 w-4" aria-hidden /> Go home
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-kampmax-border px-4 py-2.5 text-sm font-semibold text-kampmax-text hover:bg-neutral-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
          >
            <Search className="h-4 w-4" aria-hidden /> Search Kampmax
          </Link>
        </div>
        <p className="mt-4 text-xs">
          <Link href="/support" className="inline-flex items-center gap-1 font-semibold text-primary-600 hover:underline">
            <LifeBuoy className="h-3.5 w-3.5" aria-hidden /> Get help
          </Link>
        </p>
      </div>
    </main>
  );
}
