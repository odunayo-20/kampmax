import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { cache } from "react";
import { fetchPublicServiceById, fetchPublicServiceBySlug } from "@/services/freelancer-services";
import { getPublicFreelancerById } from "@/services/freelancer";
import { getSiteBaseUrl, truncateText } from "@/lib/utils";
import { PublicServiceContent } from "@/components/freelancer/public/PublicServiceContent";
import { serviceHref, serviceIdFromAddress } from "@/components/freelancer/public/service-format";

// The address segment is "<slug>-<id>" (see serviceHref). Old links carry the slug
// alone; those are looked up best-effort and sent on to the exact address.
interface ServicePageProps {
  params: Promise<{ slug: string }>;
}

// A service is only shown while its freelancer's profile is public too.
// cache() shares the lookup between generateMetadata and the page render.
const resolve = cache(async (address: string) => {
  const id = serviceIdFromAddress(address);
  const service = id ? await fetchPublicServiceById(id) : await fetchPublicServiceBySlug(address);
  if (!service) return null;
  const { profile } = await getPublicFreelancerById(service.userId);
  if (!profile) return null;
  return { service, profile };
});

export async function generateMetadata({ params }: ServicePageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) {
    return { title: "Service not found | Kampmax", robots: { index: false, follow: false } };
  }

  const { service, profile } = found;
  const canonical = `${getSiteBaseUrl()}${serviceHref(service)}`;
  const title = `${service.title} by ${profile.fullName} | Kampmax`;
  const description = truncateText(service.shortDescription || service.description, 155);

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
      images: service.coverImageUrl ? [{ url: service.coverImageUrl }] : undefined,
    },
    twitter: { card: service.coverImageUrl ? "summary_large_image" : "summary", title, description },
  };
}

export default async function FreelancerServicePage({ params }: ServicePageProps) {
  const { slug } = await params;
  const found = await resolve(slug);
  if (!found) notFound();

  const { service, profile } = found;

  // One address per service: old slug-only links, and links from before the
  // title was edited, all end up here.
  const canonicalAddress = serviceHref(service).split("/").pop();
  if (canonicalAddress !== slug) permanentRedirect(serviceHref(service));

  return (
    <PublicServiceContent
      service={service}
      freelancer={{
        id: profile.id,
        userId: profile.userId,
        name: profile.fullName,
        avatar: profile.avatar ?? undefined,
        headline: profile.professionalTitle ?? undefined,
        city: profile.city ?? undefined,
      }}
    />
  );
}
