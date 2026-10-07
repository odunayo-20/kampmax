import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ServiceDetailView } from "@/components/service-marketplace/ServiceDetailView";
import { ServiceCardSkeleton } from "@/components/service-marketplace/ServiceSkeletons";
import { getSiteBaseUrl } from "@/lib/utils";
import { fetchServiceDetail } from "@/services/service-marketplace";

interface ServiceDetailPageProps {
  params: Promise<{ serviceId: string }>;
}

export async function generateMetadata({
  params,
}: ServiceDetailPageProps): Promise<Metadata> {
  const { serviceId } = await params;
  const detail = await fetchServiceDetail(serviceId).catch(() => null);
  if (!detail) {
    return { title: "Service not found | Kampmax" };
  }
  const { service, provider } = detail;
  const baseUrl = getSiteBaseUrl();
  const canonical = `${baseUrl}/services/${service.id}`;
  const title = `${service.name} by ${provider.displayName} | Kampmax`;
  const description = `${service.description?.slice(0, 150) ?? `${service.name} on Kampmax services.`} Price: ${service.price > 0 ? `from ₦${service.price.toLocaleString()}` : "quote on request"}.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "Kampmax",
      images: service.imageUrl ? [{ url: service.imageUrl }] : undefined,
    },
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { serviceId } = await params;
  const detail = await fetchServiceDetail(serviceId);
  if (!detail) notFound();

  const { service, provider, related, similarProviders, reviews, reviewSummary } = detail;

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-4 w-40 bg-neutral-100 animate-pulse rounded" />
          <div className="aspect-[16/9] rounded-2xl bg-neutral-100 animate-pulse max-h-[420px]" />
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
            <div className="space-y-3">
              <div className="h-6 w-3/4 bg-neutral-100 animate-pulse rounded" />
              <div className="h-4 w-1/2 bg-neutral-100 animate-pulse rounded" />
              <div className="h-24 bg-neutral-100 animate-pulse rounded-2xl" />
            </div>
            <div className="h-80 rounded-2xl bg-neutral-100 animate-pulse" />
          </div>
        </div>
      }
    >
      <ServiceDetailView
        service={service}
        provider={provider}
        relatedServices={related}
        similarProviders={similarProviders}
        reviews={reviews}
        reviewSummary={reviewSummary}
      />
    </Suspense>
  );
}