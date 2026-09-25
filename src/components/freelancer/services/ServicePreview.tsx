"use client";

import Image from "next/image";
import { Clock, Grid2X2, Check, ExternalLink } from "lucide-react";
import type { FreelancerService } from "@/types/freelancer-services";
import { categoryLabel, servicePriceLabel } from "./serviceHelpers";
import { useCategories } from "@/hooks/use-taxonomy";

/**
 * Public-style preview of a freelancer service. Reused for the "preview before
 * publication" experience so the freelancer sees the same presentation a
 * client would. No private fields are rendered.
 */
export function ServicePreview({ service }: { service: FreelancerService }) {
  useCategories("SERVICE"); // warms id -> name for categoryLabel()
  const price = servicePriceLabel(service);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-[16/9] w-full bg-neutral-100">
        {service.coverImageUrl ? (
          <Image
            src={service.coverImageUrl}
            alt={service.title}
            fill
            sizes="100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <Grid2X2 className="h-12 w-12" aria-hidden />
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="flex items-center gap-2 text-[11px]">
          <span className="rounded bg-primary-50 px-2 py-0.5 font-medium text-primary-700">
            {categoryLabel(service.categoryId)}
          </span>
          {price && (
            <span className="rounded bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">
              {price}
            </span>
          )}
        </div>

        <h1 className="mt-3 text-xl font-bold text-neutral-900">{service.title}</h1>
        <p className="mt-1 text-sm text-neutral-500">{service.shortDescription}</p>

        {service.skills.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {service.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {service.deliveryValue && (
          <p className="mt-4 flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            Delivery in {service.deliveryValue} {service.deliveryUnit}
            {service.revisions !== undefined ? ` · ${service.revisions} revisions included` : ""}
          </p>
        )}

        <div className="mt-5 border-t border-neutral-100 pt-5">
          <h2 className="text-sm font-semibold text-neutral-900">About this service</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
            {service.description}
          </p>
        </div>

        {service.deliverables.length > 0 && (
          <div className="mt-5 border-t border-neutral-100 pt-5">
            <h2 className="text-sm font-semibold text-neutral-900">What&apos;s included</h2>
            <ul className="mt-2 space-y-1.5">
              {service.deliverables.map((d) => (
                <li key={d} className="flex items-start gap-2 text-sm text-neutral-700">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
                  {d}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export function ServicePreviewPlaceholder({ service }: { service: FreelancerService }) {
  return (
    <div className="pointer-events-none select-none">
      <div className="flex items-center gap-1.5 px-1 pb-3 text-xs text-neutral-400">
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Preview — how this looks to clients
      </div>
      <ServicePreview service={service} />
    </div>
  );
}
