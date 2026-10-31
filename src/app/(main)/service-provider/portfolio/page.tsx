"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { PortfolioManager } from "@/components/service-provider/dashboard/PortfolioManager";
import { fetchSpProfileRecordLive } from "@/services/service-provider-dashboard";

export default function PortfolioPage() {
  const [publicInfo, setPublicInfo] = useState<{ slug: string; verified: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSpProfileRecordLive()
      .then((record) => {
        if (cancelled) return;
        setPublicInfo({ slug: record.slug, verified: record.verification.status === "approved" });
      })
      .catch(() => {
        // The manager below still works; only the public link is unavailable.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">Portfolio</h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Show customers what you can do. Add photos of finished work, and edit or remove them any time.
          </p>
        </div>
        {publicInfo?.verified && (
          <Link
            href={`/services/providers/${publicInfo.slug}#portfolio`}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-lg border border-kampmax-border bg-white px-3.5 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50 sm:self-auto"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            View public portfolio
          </Link>
        )}
      </div>

      {publicInfo && !publicInfo.verified && (
        <div className="flex items-start gap-2 rounded-lg bg-primary-50 px-3 py-2.5 text-sm text-primary-700 ring-1 ring-inset ring-primary-200">
          <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          Your portfolio goes public on your profile once your verification is approved.
        </div>
      )}

      <PortfolioManager />
    </div>
  );
}
