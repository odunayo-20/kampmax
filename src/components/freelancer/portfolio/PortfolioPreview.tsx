"use client";

import Image from "next/image";
import { ImageIcon, ExternalLink, Calendar } from "lucide-react";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import { categoryLabel } from "../services/serviceHelpers";
import { useCategories } from "@/hooks/use-taxonomy";

/** Public-style preview of a portfolio item — what clients see. */
export function PortfolioPreview({ item }: { item: FreelancerPortfolioItem }) {
  useCategories("SERVICE"); // warms id -> name for categoryLabel()
  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[4/3] w-full bg-neutral-100">
        {item.imageUrl ? (
          <Image
            src={item.imageUrl}
            alt={item.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <ImageIcon className="h-12 w-12" aria-hidden />
          </div>
        )}
      </div>

      <div className="p-6">
        {item.categoryId && (
          <span className="inline-block rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
            {categoryLabel(item.categoryId)}
          </span>
        )}
        <h2 className="mt-3 text-xl font-bold text-neutral-900">{item.title}</h2>

        {item.completionDate && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar className="h-3.5 w-3.5" aria-hidden />
            Completed {item.completionDate}
          </p>
        )}

        <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
          {item.description}
        </p>

        {item.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {item.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {item.externalUrl && (
          <a
            href={item.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View project
          </a>
        )}
      </div>
    </div>
  );
}
