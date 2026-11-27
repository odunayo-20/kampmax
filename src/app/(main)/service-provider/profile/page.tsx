"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { CampusNames } from "@/components/service-provider/dashboard/CampusNames";
import { ProfileImagesHeader } from "@/components/service-provider/dashboard/ProfileImagesHeader";
import { PROFILE_KEY, ProfessionalDetailsEditor } from "@/components/service-provider/dashboard/ProfessionalDetailsEditor";
import { ServiceProviderVerificationBadge } from "@/components/service-provider/dashboard/ServiceProviderStatusBadge";
import { fetchSpProfileDetails } from "@/services/service-provider-dashboard";

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: PROFILE_KEY, queryFn: fetchSpProfileDetails, retry: false });

  if (q.isPending) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!q.data) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        We couldn&apos;t load your profile.{" "}
        <button type="button" onClick={() => void q.refetch()} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const profile = q.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-kampmax-text">Profile</h1>
        <Link
          href={`/services/providers/${profile.slug}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View public profile
        </Link>
      </div>

      <ProfileImagesHeader
        displayName={profile.displayName}
        logo={profile.logoUrl}
        coverImage={profile.coverImageUrl}
        badge={<ServiceProviderVerificationBadge status={profile.verification} />}
        onChanged={() => void queryClient.invalidateQueries({ queryKey: PROFILE_KEY })}
      />

      <section aria-labelledby="about-title" className="rounded-xl border border-kampmax-border bg-white p-6">
        <h2 id="about-title" className="mb-5 text-base font-bold text-kampmax-text">
          About you
        </h2>
        <ProfessionalDetailsEditor initial={profile} />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-kampmax-text">Campuses you serve</h2>
            <Link href="/service-provider/availability" className="text-xs font-medium text-primary-600 hover:underline">
              Change
            </Link>
          </div>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            <CampusNames ids={[profile.primaryCampusId, ...profile.additionalCampusIds]} fallback="No campus set yet" />
          </p>
        </section>

        <section className="rounded-xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-kampmax-text">Portfolio</h2>
            <Link href="/service-provider/portfolio" className="text-xs font-medium text-primary-600 hover:underline">
              Manage
            </Link>
          </div>
          <p className="mt-2 text-sm text-kampmax-text-secondary">Pictures of your past work.</p>
        </section>
      </div>
    </div>
  );
}
