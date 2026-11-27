"use client";


/**
 * Jobs Marketplace header. Count is the total open jobs served by the
 * backend for the current filter set.
 */
export function JobsHeader({ count }: { count: number }) {
  return (
    <div>
      <h1 className="flex items-center gap-2 text-xl font-bold text-neutral-900">
        Jobs and gigs
      </h1>
      <p className="mt-1 text-sm text-neutral-500">
        {count > 0 ? `${count} open ${count === 1 ? "posting" : "postings"}.` : "Gigs, internships and part-time and full-time roles near your campus."}
      </p>
    </div>
  );
}