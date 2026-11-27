"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { PortfolioManager } from "@/components/service-provider/dashboard/PortfolioManager";
import { useQuery } from "@tanstack/react-query";
import { PROFILE_KEY } from "@/components/service-provider/dashboard/ProfessionalDetailsEditor";
import { fetchSpProfileDetails } from "@/services/service-provider-dashboard";
import { SERVICE_PROVIDER_VERIFICATION_STATUS } from "@/types/service-provider";

export default function PortfolioPage() {
  // The same profile the rest of the dashboard already loaded; if it is not there yet the portfolio still works.
  const record = useQuery({ queryKey: PROFILE_KEY, queryFn: fetchSpProfileDetails, retry: false }).data;
  const verified = record?.verification === SERVICE_PROVIDER_VERIFICATION_STATUS.APPROVED;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-kampmax-text">Portfolio</h1>
        {record && verified && (
          <Link
            href={`/services/providers/${record.slug}#portfolio`}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50 sm:self-auto"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View public portfolio
          </Link>
        )}
      </div>

      {/* Until the profile is known the line above the pieces says nothing about who can see them. */}
      <PortfolioManager verified={!record || verified} />
    </div>
  );
}
