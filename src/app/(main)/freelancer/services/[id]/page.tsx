"use client";

import { Suspense, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Eye } from "lucide-react";
import { getMyService } from "@/services/freelancer-services";
import type { FreelancerService } from "@/types/freelancer-services";
import { ServiceStatusBadge, ServicePreview, ServiceActions } from "@/components/freelancer/services";
import type { ServiceActionKind } from "@/components/freelancer/services";
import { categoryLabel, servicePriceLabel } from "@/components/freelancer/services";
import { useCategories } from "@/hooks/use-taxonomy";
import {
  pauseMyService,
  resumeMyService,
  archiveMyService,
  deleteMyService,
  publishMyService,
  approveMyServiceForDemo,
} from "@/services/freelancer-services";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui";
import { ServicesErrorState } from "@/components/freelancer/services";

function DetailContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [service, setService] = useState<FreelancerService | null>(() => getMyService(id));
  const [busy, setBusy] = useState<ServiceActionKind | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  function runAction(kind: ServiceActionKind) {
    if (!service) return;
    setBusy(kind);
    setError(null);
    let result = { ok: true, message: "" };
    switch (kind) {
      case "publish":
        result = publishMyService(service.id);
        break;
      case "approve":
        result = approveMyServiceForDemo(service.id);
        break;
      case "pause":
        result = pauseMyService(service.id);
        break;
      case "resume":
        result = resumeMyService(service.id);
        break;
      case "archive":
        result = archiveMyService(service.id);
        break;
      case "delete":
        result = deleteMyService(service.id);
        break;
    }
    setBusy(null);
    if (result.ok) {
      if (kind === "delete") {
        router.push("/freelancer/services");
        return;
      }
      // Refetch authoritative state from the store.
      setService(getMyService(id));
    } else {
      setError(result.message);
    }
  }

  if (error && !service) {
    return <ServicesErrorState message={error} onRetry={() => setError(null)} />;
  }

  if (!service) {
    return (
      <ServicesErrorState
        message="This service could not be found or you don't have access to it."
        onRetry={() => router.push("/freelancer/services")}
      />
    );
  }

  const price = servicePriceLabel(service);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/freelancer/services"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to My Services
        </Link>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <ServiceStatusBadge status={service.status} withIcon />
          <span className="text-xs text-neutral-400">
            {service.visibility === "visible" ? "Visible to clients" : "Hidden"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setPreviewOpen((o) => !o)}>
            <Eye className="mr-1.5 h-4 w-4" aria-hidden />
            {previewOpen ? "Hide preview" : "Preview"}
          </Button>
          <Link href={`/freelancer/services/${service.id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
              Edit
            </Button>
          </Link>
          <ServiceActions service={service} isDemo busy={busy} onAction={runAction} />
        </div>
      </div>

      {previewOpen && service && (
        <ServicePreview service={service} />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                {categoryLabel(service.categoryId)}
              </span>
              {price && (
                <span className="rounded bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-600">
                  {price}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-xl font-bold text-neutral-900">{service.title}</h1>
            <p className="mt-1 text-sm text-neutral-500">{service.shortDescription}</p>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {service.description}
            </p>
          </section>

          {service.skills.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-neutral-900">Skills</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {service.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {service.deliverables.length > 0 && (
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-neutral-900">Deliverables</h2>
              <ul className="mt-3 space-y-1.5">
                {service.deliverables.map((d) => (
                  <li key={d} className="flex items-start gap-2 text-sm text-neutral-700">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-neutral-400" aria-hidden />
                    {d}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">Details</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Status</dt>
                <dd className="text-neutral-900">{service.status.replace(/_/g, " ")}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Visibility</dt>
                <dd className="text-neutral-900">
                  {service.visibility === "visible" ? "Visible" : "Hidden"}
                </dd>
              </div>
              {service.deliveryValue !== undefined && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Delivery</dt>
                  <dd className="text-neutral-900">
                    {service.deliveryValue} {service.deliveryUnit}
                  </dd>
                </div>
              )}
              {service.revisions !== undefined && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Revisions</dt>
                  <dd className="text-neutral-900">{service.revisions}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Created</dt>
                <dd className="text-neutral-900">{formatDate(service.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-neutral-500">Updated</dt>
                <dd className="text-neutral-900">{formatDate(service.updatedAt)}</dd>
              </div>
              {service.viewCount !== undefined && (
                <div className="flex justify-between gap-2">
                  <dt className="text-neutral-500">Views</dt>
                  <dd className="text-neutral-900">{service.viewCount}</dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </div>
  );
}

export default function ServiceDetailPage() {
  useCategories("SERVICE"); // warms id -> name for categoryLabel()
  return (
    <Suspense fallback={null}>
      <DetailContent />
    </Suspense>
  );
}
