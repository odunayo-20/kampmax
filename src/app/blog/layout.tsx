import type { Metadata } from "next";
import { BlogHeader } from "@/components/blog/BlogHeader";
import { BlogFooter } from "@/components/blog/BlogFooter";
import { BLOG_TAGLINE } from "@/lib/blog";

export const metadata: Metadata = {
  title: { default: "Blog | Kampmax", template: "%s | Kampmax Blog" },
  description: BLOG_TAGLINE,
};

/**
 * Public, guest-accessible shell for the blog. Lives outside the (main) group
 * so anyone, including search-engine crawlers, can read without signing in.
 */
export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <a
        href="#blog-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-kampmax-navy focus:px-3 focus:py-2 focus:text-sm focus:text-white"
      >
        Skip to content
      </a>
      <BlogHeader />
      <main id="blog-main" className="mx-auto w-full max-w-[1280px] flex-1 px-4">
        {children}
      </main>
      <BlogFooter />
    </div>
  );
}
