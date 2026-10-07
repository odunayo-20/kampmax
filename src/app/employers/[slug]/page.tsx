import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { getEmployerPublicProfileFromBackend } from "@/services/employer";
import { getSiteBaseUrl } from "@/lib/utils";
import { EmployerPublicProfileContent } from "@/components/employer/public/EmployerPublicProfileContent";

interface EmployerPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: EmployerPageProps
): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getEmployerPublicProfileFromBackend(slug);

  if (!profile) {
    return {
      title: "Employer not found | Kampmax",
      robots: { index: false, follow: false },
    };
  }

  const canonical = `${getSiteBaseUrl()}/employers/${profile.slug}`;
  const description =
    profile.about ||
    profile.descriptor ||
    `${profile.name} hires on Kampmax. ${profile.openJobs.length} open job${
      profile.openJobs.length === 1 ? "" : "s"
    }.`;

  return {
    title: `${profile.name} | Kampmax Employer`,
    description,
    alternates: { canonical },
    robots: { index: profile.verified === true, follow: true },
    openGraph: {
      title: `${profile.name} | Kampmax`,
      description,
      url: canonical,
      type: "website",
      siteName: "Kampmax",
    },
    twitter: {
      card: "summary",
      title: `${profile.name} | Kampmax`,
      description,
    },
  };
}

export default async function EmployerPage({ params }: EmployerPageProps) {
  const { slug } = await params;
  const profile = await getEmployerPublicProfileFromBackend(slug);

  if (!profile) {
    notFound();
  }

  return <EmployerPublicProfileContent profile={profile} />;
}