import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import {
  getPublicFreelancerBySlug,
  getPublicFreelancerFromBackend,
} from "@/services/freelancer-dashboard";
import { getPublicFreelancerServices } from "@/services/freelancer-services";
import { getSiteBaseUrl, truncateText } from "@/lib/utils";
import { PublicFreelancerProfileContent } from "@/components/freelancer/public/PublicFreelancerProfileContent";

interface FreelancerPageProps {
  params: Promise<{ slug: string }>;
}

const MAX_DESCRIPTION_LENGTH = 155;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Real profiles are addressed by their backend id; anything else is a legacy
// demo slug served from the local mock store. cache() dedupes the lookup
// between generateMetadata and the page render.
const resolveProfile = cache(async (slug: string) =>
  UUID_RE.test(slug)
    ? getPublicFreelancerFromBackend(slug)
    : getPublicFreelancerBySlug(slug)
);

export async function generateMetadata({
  params,
}: FreelancerPageProps): Promise<Metadata> {
  const { slug } = await params;
  const profile = await resolveProfile(slug);

  if (!profile) {
    return {
      title: "Freelancer not found | Kampmax",
      description: "This freelancer profile could not be found.",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${getSiteBaseUrl()}/freelancers/${profile.slug}`;
  const description =
    truncateText(profile.bio ?? "", MAX_DESCRIPTION_LENGTH) ||
    (profile.headline ? `${profile.name} — ${profile.headline}.` : `${profile.name} on Kampmax.`);

  return {
    title: `${profile.name}${profile.headline ? ` — ${profile.headline}` : ""} | Kampmax`,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${profile.name} | Kampmax`,
      description,
      url: canonical,
      type: "profile",
      siteName: "Kampmax",
      firstName: profile.name.split(" ")[0],
      lastName: profile.name.split(" ").slice(1).join(" ") || undefined,
    },
    twitter: {
      card: "summary",
      title: `${profile.name} | Kampmax`,
      description,
    },
  };
}

export default async function FreelancerPage({ params }: FreelancerPageProps) {
  const { slug } = await params;
  const profile = await resolveProfile(slug);

  if (!profile) {
    notFound();
  }

  const services = getPublicFreelancerServices(profile.id);

  return <PublicFreelancerProfileContent profile={profile} services={services} />;
}