import { BLOG_TAGLINE } from "@/lib/blog";
import { BlogSearch } from "./BlogSearch";

export function BlogHero() {
  return (
    <section aria-labelledby="blog-hero-title" className="py-8 sm:py-12">
      <p className="text-sm font-semibold uppercase tracking-wide text-kampmax-blue">Kampmax Blog</p>
      <h1
        id="blog-hero-title"
        className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-kampmax-navy sm:text-4xl lg:text-5xl"
      >
        Ideas, opportunities &amp; stories for the next generation
      </h1>
      <p className="mt-3 max-w-2xl text-base leading-relaxed text-kampmax-text-secondary sm:text-lg">
        {BLOG_TAGLINE}
      </p>
      <div className="mt-6 max-w-xl">
        <BlogSearch />
      </div>
    </section>
  );
}
