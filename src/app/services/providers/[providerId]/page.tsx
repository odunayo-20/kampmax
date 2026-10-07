import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProviderProfileView } from "@/components/service-marketplace/ProviderProfileView";
import { getSiteBaseUrl } from "@/lib/utils";
import { fetchProviderProfile } from "@/services/service-marketplace";

interface ProviderProfilePageProps {
  params: Promise<{ providerId: string }>;
}

export async function generateMetadata({
  params,
}: ProviderProfilePageProps): Promise<Metadata> {
  const { providerId } = await params;
  const profile = await fetchProviderProfile(providerId).catch(() => null);
  const provider = profile?.provider;
  if (!provider) {
    return { title: "Provider not found | Kampmax" };
  }
  const baseUrl = getSiteBaseUrl();
  const canonical = `${baseUrl}/services/providers/${provider.id}`;
  const title = `${provider.displayName} — verified service provider | Kampmax`;
  const description =
    provider.tagline ??
    `Browse ${provider.displayName}'s services on Kampmax. Rating ${provider.rating.toFixed(1)} with ${provider.ratingCount} reviews.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "profile",
      siteName: "Kampmax",
      images: provider.logoUrl ? [{ url: provider.logoUrl }] : undefined,
    },
  };
}

export default async function ProviderProfilePage({ params }: ProviderProfilePageProps) {
  const { providerId } = await params;
  const profile = await fetchProviderProfile(providerId);
  if (!profile) notFound();

  const { provider, services, reviews, reviewSummary, relatedProviders } = profile;

  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <div className="h-32 rounded-2xl bg-neutral-100 animate-pulse" />
          <div className="h-24 bg-neutral-100 animate-pulse rounded-2xl" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 rounded-[10px] bg-neutral-100 animate-pulse" />
              ))}
            </div>
            <div className="h-72 rounded-2xl bg-neutral-100 animate-pulse" />
          </div>
        </div>
      }
    >
      <ProviderProfileView
        provider={provider}
        services={services}
        reviews={reviews}
        reviewSummary={reviewSummary}
        relatedProviders={relatedProviders}
      />
    </Suspense>
  );
}