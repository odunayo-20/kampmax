"use client";

import Link from "next/link";
import { Grid2X2, X } from "lucide-react";
import { FallbackImage } from "@/components/ui/FallbackImage";
import { deliveryLabel, priceText, serviceHref } from "@/components/freelancer/public/service-format";
import { usePublicService } from "@/hooks/use-staged-service";
import { FREELANCER_SERVICE_STATUS, type FreelancerService } from "@/types/freelancer-services";

/**
 * A service at a glance: cover, title, price and delivery time. Everything shown
 * is rendered as React text (escaped), never as HTML.
 */
export function ServiceSummary({
  service,
  onRemove,
}: {
  service: FreelancerService;
  /** Present on the staged copy next to the message box: lets the buyer drop it. */
  onRemove?: () => void;
}) {
  const delivery = deliveryLabel(service);
  const placeholder = (
    <div className="flex h-full w-full items-center justify-center text-neutral-300">
      <Grid2X2 className="h-5 w-5" aria-hidden />
    </div>
  );
  return (
    <div className="flex items-center gap-3 rounded-xl border border-kampmax-border bg-white p-2 text-kampmax-text">
      <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
        {service.coverImageUrl ? (
          <FallbackImage
            src={service.coverImageUrl}
            alt=""
            fill
            sizes="48px"
            className="object-cover"
            fallback={placeholder}
          />
        ) : (
          placeholder
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-kampmax-text-secondary">Service</p>
        <p className="truncate text-sm font-semibold">{service.title}</p>
        <p className="truncate text-xs text-kampmax-text-secondary">
          {priceText(service)}
          {delivery ? ` · ${delivery}` : ""}
        </p>
      </div>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove service from message"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-kampmax-text-secondary hover:bg-kampmax-muted"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      )}
    </div>
  );
}

/**
 * The service a chat message shares, loaded with a plain public request. A service
 * that is gone or no longer live shows a neutral note rather than stale details.
 */
export function ServiceCard({ serviceId }: { serviceId: string }) {
  const query = usePublicService(serviceId);

  if (query.isPending) {
    return <div className="h-16 w-64 animate-pulse rounded-xl bg-kampmax-muted" aria-label="Loading service" />;
  }
  const service = query.data;
  if (!service || service.status !== FREELANCER_SERVICE_STATUS.PUBLISHED) {
    return (
      <p className="rounded-xl border border-kampmax-border bg-white px-3 py-2 text-xs text-kampmax-text-secondary">
        This service isn&apos;t available.
      </p>
    );
  }

  return (
    <Link href={serviceHref(service)} className="block w-64 max-w-full hover:opacity-90 sm:w-72">
      <ServiceSummary service={service} />
    </Link>
  );
}
