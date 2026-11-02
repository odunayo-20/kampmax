import Link from "next/link";
import Image from "next/image";
import { Clock, Laptop } from "lucide-react";
import type { FreelancerService } from "@/types/freelancer-services";
import { deliveryLabel, priceText, serviceHref } from "@/components/freelancer/public/service-format";

/** A freelancer service as one row of the Explore stream, shaped like the other verticals' rows. */
export function FreelanceServiceRow({ service, distance }: { service: FreelancerService; distance?: string }) {
  const delivery = deliveryLabel(service);

  return (
    <Link
      href={serviceHref(service)}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-neutral-200/90 bg-white p-3.5 shadow-xs transition-all hover:shadow-md"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-indigo-100 bg-indigo-50">
          {service.coverImageUrl ? (
            <Image
              src={service.coverImageUrl}
              alt=""
              fill
              sizes="56px"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-indigo-300">
              <Laptop className="h-6 w-6" aria-hidden />
            </div>
          )}
        </div>
        <div className="min-w-0 space-y-0.5">
          <h3 className="line-clamp-1 text-sm font-bold text-neutral-900 group-hover:text-indigo-600">{service.title}</h3>
          {service.freelancer && <p className="line-clamp-1 text-xs text-neutral-500">by {service.freelancer.name}</p>}
          <p className="text-xs font-extrabold text-neutral-900">{priceText(service)}</p>
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
        <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">Freelance</span>
        {delivery && (
          <span className="inline-flex items-center gap-1 text-[11px] text-neutral-400">
            <Clock className="h-3 w-3" aria-hidden />
            {delivery}
          </span>
        )}
        {distance && <span className="text-[11px] text-neutral-400">{distance}</span>}
      </div>
    </Link>
  );
}
