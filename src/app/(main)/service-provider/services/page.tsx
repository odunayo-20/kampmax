"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Wrench, Edit, Clock, MapPin, Power } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import {
  fetchSpProfileDetails,
  fetchSpServicesLive,
  setSpDashboardServiceStatusLive,
} from "@/services/service-provider-dashboard";
import { spServiceCategoryName } from "@/data/service-categories";
import { useCategories } from "@/hooks/use-taxonomy";
import { PROFILE_KEY } from "@/components/service-provider/dashboard/ProfessionalDetailsEditor";
import {
  locationName,
  nextServiceStatus,
  SERVICE_STATUS_NAME,
  SERVICE_SWITCH_ERROR,
  servicePriceLabel,
  servicesSummary,
  UNVERIFIED_SERVICES_NOTE,
} from "@/lib/provider-services";
import { SERVICE_PROVIDER_VERIFICATION_STATUS } from "@/types/service-provider";

const STATUS_TONE: Record<string, string> = {
  active: "bg-success-50 text-success-700 ring-success-200",
  draft: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  inactive: "bg-neutral-100 text-neutral-700 ring-neutral-200",
};

const SERVICES_KEY = ["service-provider", "services"];

export default function ServicesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  // Loads the SERVICE tree so category ids below resolve to names.
  useCategories("SERVICE");
  const services = useQuery({ queryKey: SERVICES_KEY, queryFn: fetchSpServicesLive, retry: false });
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: fetchSpProfileDetails, retry: false });
  const toggle = useMutation({
    mutationFn: async ({ id, to }: { id: string; to: "active" | "inactive" }) => {
      const res = await setSpDashboardServiceStatusLive(id, to);
      if (!res.ok) throw new Error(res.error);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: SERVICES_KEY }),
  });

  const items = services.data ?? [];
  const live = items.filter((s) => s.status === "active").length;
  const unverified = !!profile.data && profile.data.verification !== SERVICE_PROVIDER_VERIFICATION_STATUS.APPROVED;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Services</h1>
          {items.length > 0 && (
            <p className="mt-1 text-sm text-kampmax-text-secondary">
              {servicesSummary(live, items.length)}
              {unverified && ` ${UNVERIFIED_SERVICES_NOTE}`}
            </p>
          )}
        </div>
        <Link
          href="/service-provider/services/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add service
        </Link>
      </div>

      {toggle.isError && (
        <p className="rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 ring-1 ring-inset ring-error-200" role="alert">
          {SERVICE_SWITCH_ERROR}
        </p>
      )}

      {services.isPending ? (
        <p className="py-10 text-center text-sm text-kampmax-text-secondary">Loading your services…</p>
      ) : services.isError ? (
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
          We couldn&apos;t load your services.{" "}
          <button type="button" onClick={() => void services.refetch()} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-kampmax-border bg-white p-14 text-center">
          <Wrench className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden />
          <h2 className="text-base font-bold text-kampmax-text">No services yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-kampmax-text-secondary">
            Add your first service so customers can find and book you.
          </p>
          <Link
            href="/service-provider/services/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Add your first service
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((service) => {
            const next = nextServiceStatus(service.status);
            const switching = toggle.isPending && toggle.variables?.id === service.id;
            const where = locationName(service.locationType);
            return (
              <div key={service.id} className="rounded-xl border border-kampmax-border bg-white p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {service.images?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={service.images[0]}
                      alt=""
                      loading="lazy"
                      className="h-20 w-28 shrink-0 rounded-lg border border-kampmax-border object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-bold text-kampmax-text">{service.name}</h2>
                      <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_TONE[service.status] ?? STATUS_TONE.draft)}>
                        {SERVICE_STATUS_NAME[service.status] ?? "Draft"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-kampmax-text-secondary line-clamp-1">{service.description || "No description"}</p>
                    <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-kampmax-text-secondary">
                      <span>{spServiceCategoryName(service.categoryId)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" aria-hidden /> {service.durationMinutes} min
                      </span>
                      {where && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5" aria-hidden /> {where}
                        </span>
                      )}
                      <span className="font-semibold text-kampmax-text">{servicePriceLabel(service)}</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={switching}
                      onClick={() => toggle.mutate({ id: service.id, to: next.to })}
                      aria-label={`${next.label}: ${service.name}`}
                    >
                      <Power className="mr-1 h-4 w-4" aria-hidden />
                      {switching ? "Saving…" : next.label}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => router.push(`/service-provider/services/${service.id}/edit`)}>
                      <Edit className="mr-1 h-4 w-4" aria-hidden />
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
