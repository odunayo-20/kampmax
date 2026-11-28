"use client";

import Link from "next/link";

/** One profile step to do next, not a checklist or a percentage. Hidden once the profile is complete. */
export function NextStepCard({
  step,
  href,
  kicker,
}: {
  step: { title: string; detail: string; progress: string } | null;
  href: string;
  /** "Attract better people", "Win more work". */
  kicker: string;
}) {
  if (!step) return null;
  return (
    <section aria-labelledby="next-step" className="rounded-xl border border-kampmax-border bg-white px-4 py-4 sm:px-5">
      <p className="text-xs font-semibold text-kampmax-text-secondary">
        {kicker} · {step.progress}
      </p>
      <h2 id="next-step" className="mt-1 text-sm font-bold text-kampmax-text">
        {step.title}
      </h2>
      <p className="mt-0.5 text-xs text-kampmax-text-secondary">{step.detail}</p>
      <Link href={href} className="mt-3 inline-flex rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-primary-700">
        Add it now
      </Link>
    </section>
  );
}
