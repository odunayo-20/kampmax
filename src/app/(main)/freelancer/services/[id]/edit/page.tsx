"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { fetchMyService, updateMyService } from "@/services/freelancer-services";
import type { FreelancerService } from "@/types/freelancer-services";
import {
  ServiceForm,
  ServiceFormValues,
  ServiceFormSkeleton,
  ServiceStatusBadge,
} from "@/components/freelancer/services";
import { ServiceCreateHeader } from "../../_header";

function EditContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [service, setService] = useState<FreelancerService | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyService(id)
      .then((found) => {
        if (!cancelled) setService(found);
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Could not load this service.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <ServiceFormSkeleton />;

  if (!service) {
    return (
      <div className="space-y-6">
        <ServiceCreateHeader title="Edit Service" backTo={`/freelancer/services/${id}`} />
        <div
          role="alert"
          className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700"
        >
          {loadError ?? "This service could not be found or you don&apos;t have access to it."}
        </div>
      </div>
    );
  }

  async function handleSubmit(values: ServiceFormValues) {
    setSubmitting(true);
    setError(null);
    const result = await updateMyService(id, values);
    setSubmitting(false);
    if (result.ok) {
      router.push(`/freelancer/services/${id}`);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ServiceCreateHeader title="Edit Service" backTo={`/freelancer/services/${id}`} />
        <ServiceStatusBadge status={service.status} withIcon />
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}
      {submitting ? (
        <ServiceFormSkeleton />
      ) : (
        <ServiceForm
          initial={service}
          onSubmit={handleSubmit}
          onCancel={() => router.push(`/freelancer/services/${id}`)}
          isSubmitting={submitting}
        />
      )}
    </div>
  );
}

export default function EditServicePage() {
  return (
    <Suspense fallback={<ServiceFormSkeleton />}>
      <EditContent />
    </Suspense>
  );
}
