"use client";

import Link from "next/link";
import Image from "next/image";
import { ImageIcon, Eye, EyeOff, Pencil, ExternalLink, MoreHorizontal } from "lucide-react";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import { categoryLabel } from "../services/serviceHelpers";
import { useCategories } from "@/hooks/use-taxonomy";

export function PortfolioCard({
  item,
  onAction,
}: {
  item: FreelancerPortfolioItem;
  onAction?: (item: FreelancerPortfolioItem) => void;
}) {
  useCategories("SERVICE"); // warms id -> name for categoryLabel()
  return (
    <article className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/freelancer/portfolio/${item.id}`} className="block">
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <ImageIcon className="h-10 w-10" aria-hidden />
            </div>
          )}
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-neutral-700 shadow-sm">
            {item.visible ? (
              <>
                <Eye className="h-3 w-3" aria-hidden /> Public
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" aria-hidden /> Private
              </>
            )}
          </span>
        </div>

        <div className="p-4">
          {item.categoryId && (
            <span className="inline-block rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
              {categoryLabel(item.categoryId)}
            </span>
          )}
          <h3 className="mt-2 line-clamp-1 text-sm font-semibold text-neutral-900">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{item.description}</p>

          {item.skills.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-neutral-200 px-2 py-0.5 text-[10px] text-neutral-500"
                >
                  {skill}
                </span>
              ))}
              {item.skills.length > 3 && (
                <span className="text-[10px] text-neutral-400">+{item.skills.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
        {item.externalUrl ? (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] text-neutral-400 hover:text-primary-600"
          >
            <ExternalLink className="h-3 w-3" aria-hidden /> Live link
          </a>
        ) : (
          <span className="text-[11px] text-neutral-400">
            {item.completionDate ? `Completed ${item.completionDate}` : "—"}
          </span>
        )}
        <div className="flex items-center gap-1">
          <Link
            href={`/freelancer/portfolio/${item.id}/edit`}
            className="inline-flex items-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={`Edit ${item.title}`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => onAction?.(item)}
            className="inline-flex items-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={`Actions for ${item.title}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
