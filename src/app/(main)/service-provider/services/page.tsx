"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Wrench, Edit, Trash2, Clock, MapPin, Power, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui";
import { cn, formatNaira } from "@/lib/utils";
import {
  fetchSpServicesLive,
  getSpServices,
  removeSpDashboardService,
  setSpDashboardServiceStatus,
  setSpDashboardServiceStatusLive,
} from "@/services/service-provider-dashboard";
import { spServiceCategoryName } from "@/data/service-categories";
import { useCategories } from "@/hooks/use-taxonomy";
import { SERVICE_PROVIDER_SERVICE_STATUS } from "@/types/service-provider";
import type { ServiceProviderDashboardService } from "@/types/service-provider-dashboard";

const STATUS_TONE: Record<string, string> = {
  active: "bg-success-50 text-success-700 ring-success-200",
  draft: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  inactive: "bg-neutral-100 text-neutral-700 ring-neutral-200",
  pending_review: "bg-warning-50 text-warning-700 ring-warning-200",
  rejected: "bg-error-50 text-error-700 ring-error-200",
};

const LOCATION_LABEL: Record<string, string> = {
  provider_location: "At my location",
  customer_location: "At customer's location",
  both: "Both",
  online: "Online only",
  flexible: "Flexible",
};

function priceLabel(service: ServiceProviderDashboardService): string {
  switch (service.pricingModel) {
    case "fixed":
      return formatNaira(service.price);
    case "starting_from":
      return `From ${formatNaira(service.price)}`;
    case "range":
      return `${formatNaira(service.price)} – ${formatNaira(service.priceMax ?? service.price)}`;
    case "quote":
      return "Quote required";
  }
}

export default function ServicesPage() {
  const router = useRouter();
  // Loads the SERVICE tree so category ids below resolve to names.
  useCategories("SERVICE");
  const [services, setServices] = useState<ServiceProviderDashboardService[]>(() => getSpServices());
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    try {
      const liveServices = await fetchSpServicesLive();
      if (liveServices.length > 0 || services.length === 0) {
        setServices(liveServices);
        return;
      }
    } catch {
      // Fallback
    }
    setServices(getSpServices());
  }

  useEffect(() => {
    refresh();
  }, []);

  async function toggleStatus(service: ServiceProviderDashboardService) {
    const next = service.status === "active" ? "inactive" : "active";
    setError(null);
    try {
      const res = await setSpDashboardServiceStatusLive(service.id, next as "active" | "inactive");
      if (res.ok) {
        await refresh();
        return;
      }
    } catch {
      // Fallback to local
    }
    const localRes = setSpDashboardServiceStatus(service.id, next as "active" | "inactive");
    if (localRes.ok) refresh();
    else setError(localRes.error ?? "Unable to update the service.");
  }

  function remove(service: ServiceProviderDashboardService) {
    const ok = window.confirm(`Remove "${service.name}" permanently?`);
    if (!ok) return;
    const res = removeSpDashboardService(service.id);
    if (res.ok) refresh();
    else setError(res.error ?? "Unable to remove the service.");
  }

  const activeCount = services.filter((s) => s.status === SERVICE_PROVIDER_SERVICE_STATUS.ACTIVE).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Services</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            {activeCount} active · {services.length} total. Services only appear on your public profile when active.
          </p>
        </div>
        <Link
          href="/service-provider/services/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Add service
        </Link>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-error-50 px-3 py-2.5 text-sm text-error-700 ring-1 ring-inset ring-error-200" role="alert">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          {error}
        </div>
      )}

      {services.length === 0 ? (
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
          {services.map((service) => (
            <div key={service.id} className="rounded-xl border border-kampmax-border bg-white p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-kampmax-text">{service.name}</h2>
                    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset", STATUS_TONE[service.status] ?? STATUS_TONE.draft)}>
                      {service.status === "active" ? "Active" : service.status === "draft" ? "Draft" : service.status === "pending_review" ? "Pending review" : service.status === "rejected" ? "Rejected" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-kampmax-text-secondary line-clamp-1">{service.description || "No description"}</p>
                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-kampmax-text-secondary">
                    <span>{spServiceCategoryName(service.categoryId)}</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden /> {service.durationMinutes} min
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" aria-hidden /> {LOCATION_LABEL[service.locationType] ?? service.locationType}
                    </span>
                    <span className="font-semibold text-kampmax-text">{priceLabel(service)}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => toggleStatus(service)}
                    aria-label={service.status === "active" ? "Deactivate service" : "Activate service"}
                  >
                    <Power className="h-4 w-4 mr-1" aria-hidden />
                    {service.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => router.push(`/service-provider/services/${service.id}/edit`)}>
                    <Edit className="h-4 w-4 mr-1" aria-hidden />
                    Edit
                  </Button>
                  <Button variant="ghost" size="sm" className="text-error-600 hover:bg-error-50" onClick={() => remove(service)} aria-label="Remove service">
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}