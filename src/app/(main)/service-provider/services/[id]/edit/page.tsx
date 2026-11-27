"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ServiceForm } from "@/components/service-provider/dashboard/ServiceForm";
import {
  fetchSpServicesLive,
  updateSpDashboardServiceLive,
} from "@/services/service-provider-dashboard";
import type { ServiceProviderServiceInput } from "@/types/service-provider-dashboard";

const SERVICES_KEY = ["service-provider", "services"];

export default function EditServicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useParams<{ id: string }>();
  const services = useQuery({ queryKey: SERVICES_KEY, queryFn: fetchSpServicesLive, retry: false });
  const service = services.data?.find((s) => s.id === params.id);

  if (services.isPending) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!service) {
    return (
      <div role={services.isError ? "alert" : undefined} className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <p className="text-sm font-medium text-kampmax-text">
          {services.isError ? "We couldn't load this service." : "Service not found."}
        </p>
        {services.isError && (
          <button type="button" onClick={() => void services.refetch()} className="mt-3 mr-4 text-sm font-medium text-primary-600 hover:underline">
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/service-provider/services")}
          className="mt-3 text-sm font-medium text-primary-600 hover:underline"
        >
          Back to services
        </button>
      </div>
    );
  }

  async function handleSubmit(input: ServiceProviderServiceInput) {
    const res = await updateSpDashboardServiceLive(params.id, input);
    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
      router.push("/service-provider/services");
    }
    return res;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-kampmax-text">Edit service</h1>
      <div className="rounded-xl border border-kampmax-border bg-white p-6">
        <ServiceForm
          key={service.id}
          initial={service}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/service-provider/services")}
        />
      </div>
    </div>
  );
}
