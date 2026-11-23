import { Clock, Laptop } from "lucide-react";
import type { FreelancerService } from "@/types/freelancer-services";
import { deliveryLabel, priceText, serviceHref } from "@/components/freelancer/public/service-format";
import { EXPLORE_TONES, ExploreRow, ExploreThumb } from "./ExploreRow";

/** A freelancer service as one row of the Explore stream, shaped like the other verticals' rows. */
export function FreelanceServiceRow({ service, distance }: { service: FreelancerService; distance?: string }) {
  const delivery = deliveryLabel(service);
  const tone = EXPLORE_TONES.freelance;

  return (
    <ExploreRow
      href={serviceHref(service)}
      tone={tone}
      title={service.title}
      tag="Freelance"
      thumb={
        <ExploreThumb
          src={service.coverImageUrl}
          alt=""
          tone={tone}
          fallback={<Laptop className="h-6 w-6 text-indigo-300" aria-hidden />}
        />
      }
      aside={
        <>
          {delivery && (
            <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
              <Clock className="h-3 w-3" aria-hidden />
              {delivery}
            </span>
          )}
          {distance && <span className="text-[11px] text-neutral-400">{distance}</span>}
        </>
      }
    >
      {service.freelancer && <p className="line-clamp-1 text-xs text-neutral-500">by {service.freelancer.name}</p>}
      <p className="text-xs font-extrabold text-neutral-900">{priceText(service)}</p>
    </ExploreRow>
  );
}
