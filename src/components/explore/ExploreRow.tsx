import Link from "next/link";
import type { ReactNode } from "react";
import { FallbackImage } from "@/components/ui/FallbackImage";
import { cn } from "@/lib/utils";

/** Colour for one kind of result: its picture tile, its tag, and the title's hover. */
export interface ExploreTone {
  tile: string;
  tag: string;
  hover: string;
}

export const EXPLORE_TONES = {
  event: { tile: "bg-neutral-900", tag: "bg-rose-50 text-rose-600", hover: "group-hover:text-primary-600" },
  product: {
    tile: "border border-neutral-100 bg-neutral-100",
    tag: "bg-blue-50 text-blue-600",
    hover: "group-hover:text-primary-600",
  },
  service: {
    tile: "border border-purple-100 bg-purple-50",
    tag: "bg-purple-50 text-purple-600",
    hover: "group-hover:text-purple-600",
  },
  freelance: {
    tile: "border border-indigo-100 bg-indigo-50",
    tag: "bg-indigo-50 text-indigo-600",
    hover: "group-hover:text-indigo-600",
  },
  job: {
    tile: "border border-teal-100 bg-teal-50",
    tag: "bg-teal-50 text-teal-700",
    hover: "group-hover:text-teal-600",
  },
} satisfies Record<string, ExploreTone>;

/** The row's square picture. A missing or broken image shows `fallback`, never alt text. */
export function ExploreThumb({
  src,
  alt,
  tone,
  fallback,
}: {
  src?: string | null;
  alt: string;
  tone: ExploreTone;
  fallback: ReactNode;
}) {
  return (
    <div className={cn("relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl", tone.tile)}>
      {src ? (
        // `unoptimized`: listing photos come from many hosts, so they skip the image optimiser.
        <FallbackImage
          src={src}
          alt={alt}
          fill
          unoptimized
          sizes="56px"
          className="object-cover transition-transform group-hover:scale-105"
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

/** The shared look of a result: picture, title and detail lines on the left, a tag on the right. */
export function ExploreCard({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-white p-3.5 shadow-xs transition-all hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}

/** A result that links to its page. `aside` sits under the tag, e.g. a distance. */
export function ExploreRow({
  href,
  thumb,
  tone,
  title,
  tag,
  aside,
  children,
}: {
  href: string;
  thumb: ReactNode;
  tone: ExploreTone;
  title: string;
  tag: string;
  aside?: ReactNode;
  /** The detail lines under the title. */
  children: ReactNode;
}) {
  return (
    <Link href={href} className="block">
      <ExploreCard>
        <div className="flex min-w-0 items-center gap-3">
          {thumb}
          <div className="min-w-0 space-y-0.5">
            <h3 className={cn("line-clamp-1 text-sm font-bold text-neutral-900", tone.hover)}>{title}</h3>
            {children}
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1 text-right">
          <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-semibold", tone.tag)}>{tag}</span>
          {aside}
        </div>
      </ExploreCard>
    </Link>
  );
}
