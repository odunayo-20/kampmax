"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { StepAvailability } from "@/components/service-provider/StepAvailability";
import { StepLocation } from "@/components/service-provider/StepLocation";
import { StepPricing } from "@/components/service-provider/StepPricing";
import {
  fetchSpAvailabilityLive,
  getSpAvailability,
  updateSpAvailability,
  updateSpAvailabilityLive,
  updateSpLocation,
  updateSpPricing,
  updateSpProfileLive,
} from "@/services/service-provider-dashboard";
import type { ServiceProviderOnboardingDraft, ServiceProviderOnboardingStepId } from "@/types/service-provider";
import type { ServiceProviderDashboardRecord } from "@/types/service-provider-dashboard";

export default function AvailabilityPage() {
  const [draft, setDraft] = useState<ServiceProviderOnboardingDraft | null>(() => {
    const src = getSpAvailability();
    if (!src) return null;
    return buildDraft(src);
  });
  const [loading, setLoading] = useState(!draft);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchSpAvailabilityLive()
      .then((live) => {
        if (cancelled) return;
        setDraft(buildDraft(live));
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading && !draft) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        Availability isn&apos;t available right now. Please refresh.
      </div>
    );
  }

  function handleUpdate(data: Partial<ServiceProviderOnboardingDraft>) {
    setDraft((d) => (d ? { ...d, ...data } : d));
  }

  function applyResult(ok: boolean, resError: string | undefined, okMessage: string) {
    if (ok) {
      setError(null);
      setSaved(okMessage);
    } else {
      setError(resError ?? "Unable to save. Please try again.");
      setSaved(null);
    }
  }

  // Use the current draft value for saving (not the stale closure).
  function getDraft(): ServiceProviderOnboardingDraft {
    return draft!;
  }

  async function saveAvailability() {
    const d = getDraft();
    if (d.availability?.days) {
      try {
        const liveRes = await updateSpAvailabilityLive(d.availability.days);
        if (liveRes.ok) {
          updateSpAvailability(d.availability);
          applyResult(true, undefined, "Weekly schedule saved to live server.");
          return;
        }
      } catch {
        // Fallback
      }
    }
    const res = updateSpAvailability(d.availability ?? {});
    applyResult(res.ok, res.error, "Weekly schedule saved.");
  }

  async function saveLocation() {
    const d = getDraft();
    const l = d.location ?? {};
    try {
      await updateSpProfileLive({
        locationCity: l.serviceCities?.[0] || undefined,
        serviceRadius: l.serviceRadiusKm ? String(l.serviceRadiusKm) : undefined,
      });
    } catch {
      // ignore
    }
    const res = updateSpLocation({
      type: l.type,
      primaryCampusId: l.primaryCampusId,
      additionalCampusIds: l.additionalCampusIds ?? [],
      serviceCities: l.serviceCities ?? [],
      serviceRadiusKm: l.serviceRadiusKm,
    });
    applyResult(res.ok, res.error, "Service areas saved.");
  }

  function savePricing() {
    const d = getDraft();
    const res = updateSpPricing(d.pricing ?? {});
    applyResult(res.ok, res.error, "Fees saved.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Availability & services</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Set your weekly schedule, service areas, and fees. Customers see available times on your public profile.
        </p>
      </div>

      {(saved || error) && (
        <div
          className={cn(
            "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset",
            error ? "bg-error-50 text-error-700 ring-error-200" : "bg-success-50 text-success-700 ring-success-200"
          )}
          role="status"
        >
          {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> : <Check className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />}
          {error ?? saved}
        </div>
      )}

      <SectionCard>
        <StepAvailability draft={draft} onUpdate={handleUpdate} />
        <div className="mt-4 flex justify-end border-t border-kampmax-border pt-4">
          <Button onClick={saveAvailability}>Save weekly schedule</Button>
        </div>
      </SectionCard>

      <SectionCard>
        <StepLocation draft={draft} onUpdate={handleUpdate} />
        <div className="mt-4 flex justify-end border-t border-kampmax-border pt-4">
          <Button onClick={saveLocation}>Save service areas</Button>
        </div>
      </SectionCard>

      <SectionCard>
        <StepPricing draft={draft} onUpdate={handleUpdate} />
        <div className="mt-4 flex justify-end border-t border-kampmax-border pt-4">
          <Button onClick={savePricing}>Save fees</Button>
        </div>
      </SectionCard>
    </div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-kampmax-border bg-white p-6">{children}</div>;
}

function buildDraft(src: {
  availability: ServiceProviderDashboardRecord["availability"];
  pricing: ServiceProviderDashboardRecord["pricing"];
  location: ServiceProviderDashboardRecord["location"];
}): ServiceProviderOnboardingDraft {
  return {
    userId: "",
    status: "APPROVED",
    currentStep: 6 satisfies ServiceProviderOnboardingStepId,
    createdAt: "",
    updatedAt: "",
    provider: { displayName: "", contactPreferences: {} },
    profile: { displayName: "", logo: null, coverImage: null, tagline: "", description: "" },
    category: { secondaryCategoryIds: [] },
    location: src.location,
    availability: src.availability,
    pricing: src.pricing,
    services: [],
    portfolio: [],
    verification: { status: "approved" },
    documents: [],
  };
}