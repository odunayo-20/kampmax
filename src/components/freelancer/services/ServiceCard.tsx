"use client";

import Link from "next/link";
import Image from "next/image";
import { Clock, Eye, Grid2X2, Pencil, MoreHorizontal } from "lucide-react";
import type { FreelancerService } from "@/types/freelancer-services";
import { ServiceStatusBadge } from "./ServiceStatusBadge";
import { categoryLabel, servicePriceLabel } from "./serviceHelpers";
import { formatDate } from "@/lib/utils";
import { useCategories } from "@/hooks/use-taxonomy";

export function ServiceCard({
  service,
  onAction,
}: {
  service: FreelancerService;
  onAction?: (service: FreelancerService) => void;
}) {
  useCategories("SERVICE"); // warms id -> name for categoryLabel()
  const price = servicePriceLabel(service);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/freelancer/services/${service.id}`} className="block">
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-neutral-100">
          {service.coverImageUrl ? (
            <Image
              src={service.coverImageUrl}
              alt={service.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-neutral-300">
              <Grid2X2 className="h-10 w-10" aria-hidden />
            </div>
          )}
        </div>
        <div className="p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
              {categoryLabel(service.categoryId)}
            </span>
            <ServiceStatusBadge status={service.status} withIcon />
          </div>
          <h3 className="line-clamp-1 text-sm font-semibold text-neutral-900">{service.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs text-neutral-500">{service.shortDescription}</p>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div>
              {price ? (
                <p className="text-sm font-bold text-neutral-900">{price}</p>
              ) : (
                <p className="text-sm text-neutral-400">Price not set</p>
              )}
              <p className="mt-0.5 flex items-center gap-1 text-[11px] text-neutral-400">
                <Clock className="h-3 w-3" aria-hidden />
                {service.deliveryValue ? `${service.deliveryValue} ${service.deliveryUnit}` : "—"}
              </p>
            </div>
            {(service.viewCount !== undefined || service.orderCount !== undefined) && (
              <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                {service.viewCount !== undefined && (
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" aria-hidden />
                    {service.viewCount}
                  </span>
                )}
                {service.orderCount !== undefined && service.orderCount > 0 && (
                  <span>{service.orderCount} order{service.orderCount === 1 ? "" : "s"}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between border-t border-neutral-100 px-4 py-2.5">
        <span className="text-[11px] text-neutral-400">Updated {formatDate(service.updatedAt)}</span>
        <div className="flex items-center gap-1">
          <Link
            href={`/freelancer/services/${service.id}/edit`}
            className="inline-flex items-center gap-1 rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={`Edit ${service.title}`}
          >
            <Pencil className="h-4 w-4" aria-hidden />
          </Link>
          <button
            type="button"
            onClick={() => onAction?.(service)}
            className="inline-flex items-center rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
            aria-label={`Actions for ${service.title}`}
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </article>
  );
}
