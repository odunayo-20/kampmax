"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { useEmployerApplication } from "@/hooks/use-applications";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { Button } from "@/components/ui";
import { EmployerApplicationDetail } from "@/components/employer/applications/EmployerApplicationDetail";
import { peopleHref } from "@/services/employer-people";

export default function EmployerApplicationDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const applicationId = String(params.id);
  const query = useEmployerApplication(applicationId);
  const notFound = (query.error as { code?: string } | null)?.code === "NOT_FOUND";

  if (query.isPending) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-xl border border-neutral-200" />
        ))}
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-error-50 text-error-600 ring-1 ring-error-100">
          <ShieldAlert className="h-7 w-7" aria-hidden />
        </div>
        <h2 className="mt-4 text-lg font-bold text-neutral-900">
          {notFound ? "We couldn't find that application." : "We couldn't load this application."}
        </h2>
        <p className="mx-auto mt-1.5 max-w-sm text-sm text-neutral-500">
          {notFound
            ? "It may have been removed, or you don't have access to it."
            : getFriendlyErrorMessage(query.error)}
        </p>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => router.push(peopleHref())}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" aria-hidden /> Back to people
        </Button>
      </div>
    );
  }

  return <EmployerApplicationDetail application={query.data} />;
}