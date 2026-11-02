import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";

export const metadata: Metadata = {
  title: "Service not found | Kampmax",
  robots: { index: false, follow: false },
};

export default function ServiceNotFound() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-24 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100">
        <SearchX className="h-8 w-8 text-kampmax-text-secondary" aria-hidden />
      </div>
      <h1 className="mt-4 text-2xl font-bold text-kampmax-text">This service isn&apos;t available</h1>
      <p className="mt-2 max-w-md text-sm text-kampmax-text-secondary">
        It may have been paused or removed by the freelancer, or the link may be incorrect. You can
        browse other freelancers instead.
      </p>
      <Link
        href="/freelancers"
        className="mt-6 rounded-lg bg-kampmax-blue px-4 py-2 text-sm font-medium text-white hover:bg-kampmax-navy"
      >
        Browse freelancers
      </Link>
    </div>
  );
}
