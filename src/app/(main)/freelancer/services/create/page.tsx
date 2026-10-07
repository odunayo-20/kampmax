"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { createMyService } from "@/services/freelancer-services";
import {
  ServiceForm,
  ServiceFormValues,
} from "@/components/freelancer/services";
import { ServiceCreateHeader } from "../_header";

function CreatePage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: ServiceFormValues) {
    setSubmitting(true);
    setError(null);
    const result = await createMyService(values);
    setSubmitting(false);
    if (result.ok && result.service) {
      router.push(`/freelancer/services/${result.service.id}`);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-6">
      <ServiceCreateHeader title="Create Service" />
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700"
        >
          {error}
        </div>
      )}
      <ServiceForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/freelancer/services")}
        isSubmitting={submitting}
      />
    </div>
  );
}

export default function CreateServicePage() {
  return (
    <Suspense fallback={null}>
      <CreatePage />
    </Suspense>
  );
}
