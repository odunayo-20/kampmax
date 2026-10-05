import Link from "next/link";
import { BLOG_BASE_PATH } from "@/lib/blog";

export default function BlogNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <p className="text-sm font-semibold text-kampmax-blue">404</p>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-kampmax-navy">We can&apos;t find that article</h1>
      <p className="mt-2 text-sm text-kampmax-text-secondary">
        It may have been moved, unpublished or the link may be mistyped.
      </p>
      <Link
        href={BLOG_BASE_PATH}
        className="mt-6 inline-flex h-11 items-center rounded-md bg-kampmax-navy px-5 text-sm font-semibold text-white hover:bg-kampmax-navy-light"
      >
        Browse the blog
      </Link>
    </div>
  );
}
