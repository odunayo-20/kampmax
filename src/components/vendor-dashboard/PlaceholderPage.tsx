import Link from "next/link";
import { ArrowLeft, Lock } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Placeholder entry point for future vendor modules (promotions, analytics,
 * financials, staff). It is an explicit "coming soon" screen — NOT fake
 * functionality. The backend/features ship in later modules.
 */
export function PlaceholderPage({
  title,
  description,
  icon: Icon = Lock,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-kampmax-text">{title}</h1>

      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-kampmax-border bg-white px-6 py-16 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-primary-700">
          <Icon className="h-8 w-8" aria-hidden />
        </div>
        <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1 text-xs font-semibold text-success-700">
          Coming soon
        </span>
        <h2 className="text-lg font-bold text-kampmax-text">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-kampmax-text-secondary">{description}</p>
        <Link
          href="/vendor"
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
