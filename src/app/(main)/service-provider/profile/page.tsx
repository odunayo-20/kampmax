"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Image as ImageIcon, MapPin, Wallet, User } from "lucide-react";
import { ProfessionalDetailsEditor } from "@/components/service-provider/dashboard/ProfessionalDetailsEditor";
import { ServiceProviderVerificationBadge } from "@/components/service-provider/dashboard/ServiceProviderStatusBadge";
import {
  fetchSpAvailabilityLive,
  fetchSpProfileRecordLive,
  getSpAvailability,
  getSpProfileRecord,
  getSpSettings,
} from "@/services/service-provider-dashboard";
import { formatNaira } from "@/lib/utils";
import type { ServiceProviderDashboardRecord } from "@/types/service-provider-dashboard";

export default function ProfilePage() {
  const [record, setRecord] = useState<ServiceProviderDashboardRecord | null>(() => getSpProfileRecord());
  const [areas, setAreas] = useState<any>(() => getSpAvailability());
  const [settings] = useState(() => getSpSettings());
  const [loading, setLoading] = useState(!record);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchSpProfileRecordLive().catch(() => null),
      fetchSpAvailabilityLive().catch(() => null),
    ]).then(([liveProfile, liveAvailability]) => {
      if (cancelled) return;
      if (liveProfile) setRecord(liveProfile);
      if (liveAvailability) setAreas(liveAvailability);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !record) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!record || !areas) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        Profile isn&apos;t available right now. Please refresh.
      </div>
    );
  }

  const { profile, verification, slug } = record;
  const campuses = [areas.location.primaryCampusId, ...areas.location.additionalCampusIds].filter(Boolean) as string[];

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
          href={`/service-provider/${slug}`}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          View public profile
        </Link>
      </div>

      {/* Cover / logo */}
      <div className="overflow-hidden rounded-xl border border-kampmax-border bg-white">
        <div className="h-36 w-full bg-gradient-to-r from-primary-600/20 to-kampmax-gold/30 sm:h-44">
          {profile.coverImage && (
            <img src={profile.coverImage} alt="Cover" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="px-5 pb-5">
          <div className="-mt-10 flex items-end gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-primary-100 text-primary-600 shadow-sm">
              {profile.logo ? (
                <img src={profile.logo} alt={profile.displayName} className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-10 w-10" aria-hidden />
              )}
            </div>
            <div className="pb-1">
              <ServiceProviderVerificationBadge status={verification.status} />
            </div>
          </div>
        </div>
      </div>

      {/* Editor */}
      <div className="rounded-xl border border-kampmax-border bg-white p-6">
        <h2 className="mb-5 text-base font-bold text-kampmax-text">Professional details</h2>
        <ProfessionalDetailsEditor />
      </div>

      {/* Service areas + pricing + account */}
      <div className="grid gap-4 lg:grid-cols-3">
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
            {campuses.length > 0 ? campuses.join(", ") : "No campuses set yet"} · {areas.location.serviceCities.join(", ") || "no cities listed"}
          </p>
        </div>

        <div className="rounded-xl border border-kampmax-border bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold text-kampmax-text">
              <Wallet className="h-4 w-4 text-primary-600" aria-hidden /> Fees
            </h2>
            <Link href="/service-provider/availability" className="text-xs font-medium text-primary-600 hover:underline">
              Manage
            </Link>
          </div>
          <p className="mt-2 text-sm text-kampmax-text-secondary">
            Travel {formatNaira(areas.pricing.travelFee)} · Emergency {formatNaira(areas.pricing.emergencyFee)} · Min booking {areas.pricing.minimumBookingQuantity}
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
          <p className="mt-1 text-xs text-kampmax-text-muted">
            Provider contacts: {settings.contactPreferences.allowEmail ? "email on" : "email off"}
          </p>
        </div>
      </div>
    </div>
  );
}