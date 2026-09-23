"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  PortfolioForm,
  PortfolioFormValues,
} from "@/components/freelancer/portfolio";
import { createMyPortfolioItem } from "@/services/freelancer-services";

export default function NewPortfolioPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(values: PortfolioFormValues) {
    setSubmitting(true);
    setError(null);
    const result = await createMyPortfolioItem(values);
    setSubmitting(false);
    if (result.ok) {
      router.push("/freelancer/portfolio");
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/freelancer/portfolio"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Portfolio
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Add Portfolio Project</h1>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}
      <PortfolioForm
        onSubmit={handleSubmit}
        onCancel={() => router.push("/freelancer/portfolio")}
        isSubmitting={submitting}
      />
    </div>
  );
}
