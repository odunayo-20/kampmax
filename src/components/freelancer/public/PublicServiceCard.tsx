import Link from "next/link";
import Image from "next/image";
import { Clock, Grid2X2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import type { FreelancerService } from "@/types/freelancer-services";
import { deliveryLabel, priceText, serviceHref } from "./service-format";

/**
 * A published service as a client browses it: picture first, then who offers it,
 * what it is, and what it costs. The whole card is one link to the service page.
 * On a freelancer's own profile the seller row is left out (`showFreelancer={false}`).
 */
export function PublicServiceCard({
  service,
  showFreelancer = true,
}: {
  service: FreelancerService;
  showFreelancer?: boolean;
}) {
  const delivery = deliveryLabel(service);
  const seller = showFreelancer ? service.freelancer : undefined;

  const body = (
    <>
      <div className="relative aspect-video w-full bg-neutral-100">
        {service.coverImageUrl ? (
          <Image
            src={service.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 320px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-neutral-300">
            <Grid2X2 className="h-8 w-8" aria-hidden />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        {seller && (
          <div className="mb-2.5 flex items-center gap-2">
            <Avatar name={seller.name} src={seller.avatar} size="sm" />
            <span className="truncate text-xs font-medium text-kampmax-text-secondary">{seller.name}</span>
          </div>
        )}
        {service.categoryName && (
          <p className="text-xs text-kampmax-text-secondary">{service.categoryName}</p>
        )}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-bold text-kampmax-text group-hover:text-primary-700">
          {service.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-xs text-kampmax-text-secondary">{service.shortDescription}</p>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <span className="truncate text-sm font-bold text-kampmax-text">{priceText(service)}</span>
          {delivery && (
            <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-kampmax-text-secondary">
              <Clock className="h-3 w-3" aria-hidden />
              {delivery}
            </span>
          )}
        </div>
      </div>
    </>
  );

  const cardClass =
    "group flex h-full flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white transition-shadow";

  return (
    <Link
      href={serviceHref(service)}
      className={`${cardClass} hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600`}
    >
      {body}
    </Link>
  );
}
