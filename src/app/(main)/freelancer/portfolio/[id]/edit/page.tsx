"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { fetchMyPortfolioItem, updateMyPortfolioItem } from "@/services/freelancer-services";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import {
  PortfolioForm,
  PortfolioFormValues,
  PortfolioErrorState,
  PortfolioGridSkeleton,
} from "@/components/freelancer/portfolio";

export default function EditPortfolioPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [item, setItem] = useState<FreelancerPortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMyPortfolioItem(id).then((found) => {
      if (cancelled) return;
      setItem(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <PortfolioGridSkeleton />;

  if (!item) {
    return (
      <PortfolioErrorState
        message="This portfolio project could not be found or you don't have access to it."
        onRetry={() => router.push("/freelancer/portfolio")}
      />
    );
  }

  async function handleSubmit(values: PortfolioFormValues) {
    setSubmitting(true);
    setError(null);
    const result = await updateMyPortfolioItem(id, values);
    setSubmitting(false);
    if (result.ok) {
      router.push(`/freelancer/portfolio/${id}`);
    } else {
      setError(result.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/freelancer/portfolio/${id}`}
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to project
        </Link>
        <h1 className="mt-2 text-xl font-bold text-neutral-900">Edit Portfolio Project</h1>
      </div>
      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}
      <PortfolioForm
        initial={item}
        onSubmit={handleSubmit}
        onCancel={() => router.push(`/freelancer/portfolio/${id}`)}
        isSubmitting={submitting}
      />
    </div>
  );
}
