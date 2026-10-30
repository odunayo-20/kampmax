"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCw } from "lucide-react";

/**
 * Error boundary for every freelancer route. It renders inside the dashboard
 * layout, so the sidebar stays usable while the failed page offers a retry.
 */
export default function FreelancerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="rounded-xl border border-kampmax-border bg-white p-10 text-center"
    >
      <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-error-50 text-error-600">
        <AlertTriangle className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="mt-4 text-base font-bold text-kampmax-text">This page couldn&apos;t load</h2>
      <p className="mt-1 text-sm text-kampmax-text-secondary">
        Something went wrong on our side. Your data is safe — try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-5 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-2"
      >
        <RotateCw className="h-4 w-4" aria-hidden /> Try again
      </button>
    </div>
  );
}
