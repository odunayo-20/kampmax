"use client";

import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ServiceForm } from "@/components/service-provider/dashboard/ServiceForm";
import { NEW_SERVICE_NOTE } from "@/lib/service-form";
import { addSpDashboardServiceLive } from "@/services/service-provider-dashboard";
import type { ServiceProviderServiceInput } from "@/types/service-provider-dashboard";

export default function NewServicePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function handleSubmit(input: ServiceProviderServiceInput) {
    const res = await addSpDashboardServiceLive(input);
    if (res.ok) {
      await queryClient.invalidateQueries({ queryKey: ["service-provider", "services"] });
      router.push("/service-provider/services");
    }
    return res;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Add a service</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">{NEW_SERVICE_NOTE}</p>
      </div>
      <div className="rounded-xl border border-kampmax-border bg-white p-6">
        <ServiceForm onSubmit={handleSubmit} onCancel={() => router.push("/service-provider/services")} />
      </div>
    </div>
  );
}
