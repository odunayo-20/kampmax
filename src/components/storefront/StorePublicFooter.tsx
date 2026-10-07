import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

/** Minimal public footer for storefront pages. */
export function StorePublicFooter() {
  return (
    <footer className="border-t border-kampmax-border bg-white mt-10">
      <div className="max-w-[1280px] mx-auto px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <Logo size="xs" href="/marketplace" />
        <p className="text-xs text-kampmax-text-secondary text-center">
          Your campus marketplace. Buy and sell with students around you.
        </p>
        <Link
          href="/marketplace"
          className="text-xs font-medium text-kampmax-blue hover:underline"
        >
          Browse marketplace
        </Link>
      </div>
    </footer>
  );
}
