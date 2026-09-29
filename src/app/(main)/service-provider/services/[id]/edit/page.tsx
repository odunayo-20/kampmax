"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ServiceForm } from "@/components/service-provider/dashboard/ServiceForm";
import {
  fetchSpServicesLive,
  getSpServices,
  updateSpDashboardService,
  updateSpDashboardServiceLive,
} from "@/services/service-provider-dashboard";
import type {
  ServiceProviderDashboardService,
  ServiceProviderServiceInput,
} from "@/types/service-provider-dashboard";

export default function EditServicePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceProviderDashboardService | undefined>(() =>
    getSpServices().find((s) => s.id === params.id)
  );
  const [loading, setLoading] = useState(!service);

  useEffect(() => {
    let cancelled = false;
    fetchSpServicesLive()
      .then((items) => {
        if (cancelled) return;
        const found = items.find((s) => s.id === params.id);
        if (found) setService(found);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center">
        <p className="text-sm font-medium text-kampmax-text">Service not found.</p>
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
    try {
      const liveRes = await updateSpDashboardServiceLive(params.id, input);
      if (liveRes.ok) {
        updateSpDashboardService(params.id, input);
        router.push("/service-provider/services");
        return { ok: true };
      }
    } catch {
      // Fallback
    }
    const res = updateSpDashboardService(params.id, input);
    if (res.ok) router.push("/service-provider/services");
    return { ok: res.ok, error: res.error };
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Edit service</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">Update the details below. Public profile updates immediately.</p>
      </div>
      <div className="rounded-xl border border-kampmax-border bg-white p-6">
        <ServiceForm
          key={service!.id}
          initial={service}
          onSubmit={handleSubmit}
          onCancel={() => router.push("/service-provider/services")}
        />
      </div>
    </div>
  );
}