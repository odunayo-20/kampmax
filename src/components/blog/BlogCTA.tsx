import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ctaForCategory } from "@/lib/blog";

interface BlogCTAProps {
  /** Category slug of the surrounding content; picks the most relevant platform feature. */
  categorySlug?: string | null;
}

/** One quiet, contextual next step. Never a banner. */
export function BlogCTA({ categorySlug }: BlogCTAProps) {
  const cta = ctaForCategory(categorySlug);
  return (
    <aside
      aria-label="Next step on Kampmax"
      className="flex flex-col gap-4 rounded-xl border border-kampmax-border bg-primary-50 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="max-w-xl">
        <p className="text-base font-semibold text-kampmax-navy">{cta.heading}</p>
        <p className="mt-1 text-sm leading-relaxed text-kampmax-text-secondary">{cta.body}</p>
      </div>
      <Link
        href={cta.href}
        data-blog-cta={categorySlug ?? "default"}
        className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-md bg-kampmax-blue px-5 text-sm font-semibold text-white hover:bg-kampmax-blue-dark focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kampmax-blue"
      >
        {cta.label}
        <ArrowRight aria-hidden className="h-4 w-4" />
      </Link>
    </aside>
  );
}
