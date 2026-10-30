import type { ComponentType } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Dashboard tile that links into a freelancer module (find work, proposals, contracts). */
export function FreelancerSectionLink({
  href,
  icon: Icon,
  tone,
  title,
  description,
  cta,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Tailwind classes for the icon chip, e.g. "bg-primary-50 text-primary-600". */
  tone: string;
  title: string;
  description: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col items-start gap-3 rounded-xl border border-kampmax-border bg-white p-5 transition-shadow hover:shadow-md"
    >
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${tone}`}>
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-bold text-kampmax-text">{title}</p>
        <p className="mt-1 text-xs text-kampmax-text-secondary">{description}</p>
      </div>
      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary-600 group-hover:underline">
        {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
      </span>
    </Link>
  );
}
