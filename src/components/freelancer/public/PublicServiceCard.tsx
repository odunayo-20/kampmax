import Link from "next/link";
import { Clock, Grid2X2 } from "lucide-react";
import { Avatar } from "@/components/ui";
import { FallbackImage } from "@/components/ui/FallbackImage";
import type { FreelancerService } from "@/types/freelancer-services";
import { deliveryLabel, priceParts, serviceHref } from "./service-format";

/**
 * A published service as a client browses it. Top to bottom: the picture (with the
 * delivery time on it), what it is, then a footer with who offers it and what it
 * costs. The whole card is one link to the service page. On a freelancer's own
 * profile the seller is left out (`showFreelancer={false}`).
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
  const { prefix, amount, suffix } = priceParts(service);
  const placeholder = (
    <div className="flex h-full w-full items-center justify-center text-primary-200">
      <Grid2X2 className="h-10 w-10" aria-hidden />
    </div>
  );

  return (
    <Link
      href={serviceHref(service)}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white transition-all hover:border-primary-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 motion-safe:hover:-translate-y-0.5"
    >
      <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-primary-50 to-neutral-100">
        {service.coverImageUrl ? (
          <FallbackImage
            src={service.coverImageUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 320px"
            className="object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
            fallback={placeholder}
          />
        ) : (
          placeholder
        )}
        {delivery && (
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded-full bg-black/65 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
            <Clock className="h-3 w-3" aria-hidden />
            {delivery}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {service.categoryName && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">{service.categoryName}</p>
        )}
        <h3 className="mt-1 line-clamp-2 text-base font-bold leading-snug text-kampmax-text group-hover:text-primary-700">
          {service.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-kampmax-text-secondary">{service.shortDescription}</p>

        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-kampmax-border pt-3">
            {seller ? (
              <div className="flex min-w-0 items-center gap-2">
                <Avatar name={seller.name} src={seller.avatar} size="sm" />
                <span className="truncate text-xs font-medium text-kampmax-text-secondary">{seller.name}</span>
              </div>
            ) : (
              <span />
            )}
            <p className="shrink-0 text-right leading-tight">
              {prefix && <span className="block text-[11px] text-kampmax-text-secondary">{prefix}</span>}
              <span className="text-base font-bold text-kampmax-text">{amount}</span>
              {suffix && <span className="text-xs font-medium text-kampmax-text-secondary">{suffix}</span>}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}
