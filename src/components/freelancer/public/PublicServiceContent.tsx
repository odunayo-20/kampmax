import Link from "next/link";
import Image from "next/image";
import { CheckCircle2, ChevronRight, Clock, Grid2X2, RefreshCw } from "lucide-react";
import { Avatar } from "@/components/ui";
import { FREELANCER_SERVICE_PRICING_LABEL } from "@/config/freelancer-services";
import type { FreelancerService } from "@/types/freelancer-services";
import { FreelancerProfileActions } from "@/components/freelancer/public/FreelancerProfileActions";
import { deliveryLabel, priceParts, priceText } from "./service-format";

export interface ServiceFreelancer {
  id: string;
  name: string;
  avatar?: string;
  headline?: string;
  city?: string;
}

function PriceBlock({ service }: { service: FreelancerService }) {
  const { prefix, amount, suffix } = priceParts(service);
  return (
    <div>
      <p className="text-xs text-kampmax-text-secondary">
        {FREELANCER_SERVICE_PRICING_LABEL[service.pricing]}
      </p>
      <p className="mt-0.5 text-2xl font-bold text-kampmax-text">
        {prefix && <span className="mr-1.5 text-sm font-medium text-kampmax-text-secondary">{prefix}</span>}
        {amount}
        {suffix && <span className="ml-0.5 text-sm font-medium text-kampmax-text-secondary">{suffix}</span>}
      </p>
    </div>
  );
}

/**
 * A freelancer service as a client sees it. Layout: the story on the left (cover,
 * what it is, what's included); the decision on the right (price, timing, one
 * clear action, who you'd be working with). On phones the action is pinned to the
 * bottom of the screen so it is always one tap away.
 */
export function PublicServiceContent({
  service,
  freelancer,
}: {
  service: FreelancerService;
  freelancer: ServiceFreelancer;
}) {
  const delivery = deliveryLabel(service);
  const firstName = freelancer.name.split(" ")[0] || "freelancer";
  const messageLabel = `Message ${firstName}`;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:pb-10">
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-kampmax-text-secondary">
        <Link href="/freelancers/services" className="hover:text-primary-600 hover:underline">
          Services
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <Link href={`/freelancers/${freelancer.id}`} className="hover:text-primary-600 hover:underline">
          {freelancer.name}
        </Link>
        <ChevronRight className="h-3 w-3" aria-hidden />
        <span aria-current="page" className="max-w-[16rem] truncate font-medium text-kampmax-text">
          {service.title}
        </span>
      </nav>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <article className="space-y-8">
          <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-kampmax-border bg-neutral-100">
            {service.coverImageUrl ? (
              <Image
                src={service.coverImageUrl}
                alt={service.title}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 640px"
                className="object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                <Grid2X2 className="h-12 w-12" aria-hidden />
              </div>
            )}
          </div>

          <header>
            {service.categoryName && (
              <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-700">
                {service.categoryName}
              </span>
            )}
            <h1 className="mt-3 text-2xl font-bold leading-tight text-kampmax-text sm:text-3xl">
              {service.title}
            </h1>
            <p className="mt-2 text-base text-kampmax-text-secondary">{service.shortDescription}</p>
          </header>

          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-lg font-bold text-kampmax-text">
              About this service
            </h2>
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-kampmax-text">
              {service.description}
            </p>
          </section>

          {service.deliverables.length > 0 && (
            <section aria-labelledby="included-heading">
              <h2 id="included-heading" className="text-lg font-bold text-kampmax-text">
                What you&apos;ll get
              </h2>
              <ul className="mt-3 space-y-2.5">
                {service.deliverables.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-sm text-kampmax-text">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {service.skills.length > 0 && (
            <section aria-labelledby="skills-heading">
              <h2 id="skills-heading" className="text-lg font-bold text-kampmax-text">
                Skills
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {service.skills.map((skill) => (
                  <li
                    key={skill}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium text-kampmax-text"
                  >
                    {skill}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <section className="rounded-xl border border-kampmax-border bg-white p-5">
            <PriceBlock service={service} />

            {(delivery || service.revisions !== undefined) && (
              <dl className="mt-4 space-y-2.5 border-t border-kampmax-border pt-4 text-sm">
                {delivery && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="inline-flex items-center gap-2 text-kampmax-text-secondary">
                      <Clock className="h-4 w-4" aria-hidden />
                      Delivery time
                    </dt>
                    <dd className="font-semibold text-kampmax-text">{delivery}</dd>
                  </div>
                )}
                {service.revisions !== undefined && (
                  <div className="flex items-center justify-between gap-2">
                    <dt className="inline-flex items-center gap-2 text-kampmax-text-secondary">
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      Revisions
                    </dt>
                    <dd className="font-semibold text-kampmax-text">{service.revisions}</dd>
                  </div>
                )}
              </dl>
            )}

            <div className="mt-5 hidden lg:block">
              <FreelancerProfileActions profileId={freelancer.id} label={messageLabel} fullWidth />
              <p className="mt-2 text-center text-xs text-kampmax-text-secondary">
                Chat first to agree on the details.
              </p>
            </div>
          </section>

          <section className="rounded-xl border border-kampmax-border bg-white p-5">
            <div className="flex items-center gap-3">
              <Avatar name={freelancer.name} src={freelancer.avatar} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-kampmax-text">{freelancer.name}</p>
                {freelancer.headline && (
                  <p className="truncate text-xs text-kampmax-text-secondary">{freelancer.headline}</p>
                )}
                {freelancer.city && (
                  <p className="truncate text-xs text-kampmax-text-secondary">{freelancer.city}</p>
                )}
              </div>
            </div>
            <Link
              href={`/freelancers/${freelancer.id}`}
              className="mt-4 block rounded-md border border-neutral-300 px-4 py-2 text-center text-sm font-semibold text-neutral-800 transition-colors hover:bg-neutral-100"
            >
              View full profile
            </Link>
          </section>
        </aside>
      </div>

      {/* Phones: price and the one action stay in reach while reading, just above the bottom navigation. */}
      <div className="fixed inset-x-0 bottom-[calc(62px+env(safe-area-inset-bottom))] z-30 border-t border-kampmax-border bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)] lg:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-base font-bold text-kampmax-text">
              {priceText(service)}
            </p>
            {delivery && <p className="text-xs text-kampmax-text-secondary">{delivery} delivery</p>}
          </div>
          <FreelancerProfileActions profileId={freelancer.id} label={messageLabel} />
        </div>
      </div>
    </div>
  );
}
