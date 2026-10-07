"use client";

import Link from "next/link";
import { ExternalLink, Wrench } from "lucide-react";
import { ServiceProviderVerificationBadge } from "./ServiceProviderStatusBadge";
import { ServiceProviderNotifications } from "./ServiceProviderNotifications";
import { ProfileSwitcher } from "@/components/vendor-dashboard/ProfileSwitcher";
import type { ServiceProviderVerificationStatus } from "@/types/service-provider";

export function ServiceProviderTopbar({
  providerName,
  slug,
  verification,
}: {
  providerName: string;
  slug?: string;
  verification: ServiceProviderVerificationStatus;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-kampmax-border bg-white px-4 lg:px-8">
      <div className="flex min-w-0 items-center gap-3">
        <span className="truncate text-sm font-bold text-kampmax-text">{providerName}</span>
        <ServiceProviderVerificationBadge status={verification} className="hidden sm:inline-flex" />
      </div>
      <div className="flex items-center gap-2">
        <ServiceProviderNotifications />
        <Link
          href={slug ? `/services/providers/${slug}` : "/service-provider"}
          className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border px-3 py-1.5 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <Wrench className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">View Public Profile</span>
          <ExternalLink className="hidden h-3.5 w-3.5 sm:inline" aria-hidden />
        </Link>
        <ProfileSwitcher />
      </div>
    </header>
  );
}