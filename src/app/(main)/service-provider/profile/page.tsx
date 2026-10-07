"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin, User } from "lucide-react";
import { PortfolioManager } from "@/components/service-provider/dashboard/PortfolioManager";
import { ProfileImagesHeader } from "@/components/service-provider/dashboard/ProfileImagesHeader";
import { ProfessionalDetailsEditor } from "@/components/service-provider/dashboard/ProfessionalDetailsEditor";
import { ServiceProviderVerificationBadge } from "@/components/service-provider/dashboard/ServiceProviderStatusBadge";
import {
  fetchSpAvailabilityLive,
  fetchSpProfileRecordLive,
} from "@/services/service-provider-dashboard";
import type { ServiceProviderDashboardRecord } from "@/types/service-provider-dashboard";

type Areas = Awaited<ReturnType<typeof fetchSpAvailabilityLive>>;

export default function ProfilePage() {
  const [record, setRecord] = useState<ServiceProviderDashboardRecord | null>(null);
  const [areas, setAreas] = useState<Areas | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    Promise.all([fetchSpProfileRecordLive(), fetchSpAvailabilityLive()])
      .then(([liveProfile, liveAvailability]) => {
        if (cancelled) return;
        setRecord(liveProfile);
        setAreas(liveAvailability);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loading && !record) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!record || !areas) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        {failed ? "We couldn't load your profile." : "Profile isn't available right now."}{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
      </div>
    );
  }

  const { profile, verification, slug } = record;
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Profile</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            This is the professional information customers see on your public profile.
          </p>
        </div>
        <Link
          href={`/services/providers/${slug}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View public profile
        </Link>
      </div>

      {/* Cover / logo */}
      <ProfileImagesHeader
        displayName={profile.displayName}
        logo={profile.logo}
        coverImage={profile.coverImage}
        badge={<ServiceProviderVerificationBadge status={verification.status} />}
        onChanged={() => setAttempt((n) => n + 1)}
      />

      {/* Editor */}
      <div className="rounded-xl border border-kampmax-border bg-white p-6">
        <h2 className="mb-5 text-base font-bold text-kampmax-text">Professional details</h2>
        <ProfessionalDetailsEditor />
      </div>

      <PortfolioManager />

      {/* Service areas + pricing + account */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
              <MapPin className="h-4 w-4 text-primary-600" aria-hidden /> Service areas
            </h2>
            <Link href="/service-provider/availability" className="text-xs font-medium text-primary-600 hover:underline">
              Manage
            </Link>
          </div>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            {areas.location.primaryCampusId || "No city set yet"} · within {areas.location.serviceRadiusKm ?? 0} km
          </p>
        </div>

        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
              <User className="h-4 w-4 text-primary-600" aria-hidden /> Account
            </h2>
            <Link href="/profile" className="text-xs font-medium text-primary-600 hover:underline">
              Manage
            </Link>
          </div>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            Global account settings (email, password, security) live in your Kampmax account.
          </p>
        </div>
      </div>
    </div>
  );
}