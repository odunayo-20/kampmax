"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Check } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { StepAvailability } from "@/components/service-provider/StepAvailability";
import { StepLocation } from "@/components/service-provider/StepLocation";
import {
  fetchSpAvailabilityLive,
  updateSpAvailabilityLive,
  updateSpProfileLive,
} from "@/services/service-provider-dashboard";
import type { ServiceProviderOnboardingDraft, ServiceProviderOnboardingStepId } from "@/types/service-provider";
import type { ServiceProviderDashboardRecord } from "@/types/service-provider-dashboard";

export default function AvailabilityPage() {
  const [draft, setDraft] = useState<ServiceProviderOnboardingDraft | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [saved, setSaved] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    fetchSpAvailabilityLive()
      .then((live) => {
        if (cancelled) return;
        setDraft(buildDraft(live));
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  if (loading && !draft) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600/20 border-t-primary-600" />
      </div>
    );
  }

  if (!draft) {
    return (
      <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-10 text-center text-sm text-kampmax-text-secondary">
        {loadError ? "We couldn't load your availability." : "Availability isn't available right now."}{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-primary-600 hover:underline">
          Try again
        </button>
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
    const a = d.availability;
    setSaved(null);
    setError(null);
    // The weekly hours and how bookings are taken are saved together, and
    // reported honestly: customers book against exactly what is saved here.
    const [hours, rules] = await Promise.all([
      a?.days ? updateSpAvailabilityLive(a.days) : Promise.resolve({ ok: true } as { ok: boolean; error?: string }),
      updateSpProfileLive({
        bookingPreference: a?.bookingPreference === "instant" ? "INSTANT" : "REQUEST_APPROVAL",
        minAdvanceNoticeHours: a?.minAdvanceNoticeHours,
        maxAdvanceBookingDays: a?.maxAdvanceBookingDays,
        bufferMinutes: a?.appointmentBufferMinutes,
      }),
    ]);
    const failure = !hours.ok ? hours.error : !rules.ok ? rules.error : null;
    applyResult(!failure, failure ?? undefined, "Saved. Customers can now book these times.");
  }

  async function saveLocation() {
    const d = getDraft();
    const l = d.location ?? {};
    setSaved(null);
    setError(null);
    const res = await updateSpProfileLive({
      locationCity: l.serviceCities?.[0] || undefined,
      serviceRadius: l.serviceRadiusKm ? String(l.serviceRadiusKm) : undefined,
    });
    applyResult(res.ok, res.error, "Saved your service city and radius.");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-kampmax-text">Availability & services</h1>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Set your weekly schedule and how bookings are taken. Customers book only the times you offer here.
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