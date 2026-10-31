"use client";

import { Plus, Search } from "lucide-react";
import { Input, Select } from "@/components/ui";
import { useCampusOptions } from "@/hooks/use-campus-options";
import { cn } from "@/lib/utils";
import type { ServiceProviderOnboardingDraft, ServiceProviderLocationType } from "@/types/service-provider";

const LOCATION_TYPE_OPTIONS = [
  { value: "provider_location", label: "At My Location", description: "Customers come to your shop/office" },
  { value: "customer_location", label: "At Customer's Location", description: "You travel to the customer" },
  { value: "both", label: "Both", description: "Flexible - either location works" },
  { value: "online", label: "Online Only", description: "Remote services via video/chat" },
  { value: "flexible", label: "Flexible", description: "Depends on the service" },
] as const;

interface StepLocationProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
}

export function StepLocation({ draft, onUpdate }: StepLocationProps) {
  const location = draft?.location;
  const { campuses: CAMPUSES, isLoading: campusesLoading } = useCampusOptions();

  const handleLocationTypeChange = (value: ServiceProviderLocationType) => {
    onUpdate({ location: { ...location, type: value } });
  };

  const handlePrimaryCampusChange = (value: string) => {
    onUpdate({ location: { ...location, primaryCampusId: value || undefined } });
  };

  const handleAdditionalCampusToggle = (campusId: string) => {
    const current = location?.additionalCampusIds ?? [];
    const updated = current.includes(campusId)
      ? current.filter((c) => c !== campusId)
      : [...current, campusId];
    onUpdate({ location: { ...location, additionalCampusIds: updated } });
  };

  const handleServiceCityAdd = () => {
    const city = prompt("Enter city name:");
    if (city?.trim()) {
      onUpdate({ location: { ...location, serviceCities: [...(location?.serviceCities ?? []), city.trim()] } });
    }
  };

  const handleServiceCityRemove = (city: string) => {
    onUpdate({ location: { ...location, serviceCities: (location?.serviceCities ?? []).filter((c) => c !== city) } });
  };

  const handleRadiusChange = (value: number) => {
    onUpdate({ location: { ...location, serviceRadiusKm: value } });
  };

  const isOnlineOnly = location?.type === "online";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Service Location</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Define where you provide your services. This helps customers find you.
        </p>
      </div>

      {/* Location Type */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-3">
          How do you provide your services? <span className="text-kampmax-error">*</span>
        </label>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {LOCATION_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => handleLocationTypeChange(opt.value)}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-left",
                location?.type === opt.value
                  ? "border-primary-600 bg-primary-50 ring-2 ring-primary-500/20"
                  : "border-neutral-200 hover:border-primary-300 bg-white"
              )}
            >
              <p className="font-semibold text-kampmax-text">{opt.label}</p>
              <p className="mt-1 text-sm text-kampmax-text-secondary">{opt.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Primary Campus */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-2">
          Primary Campus <span className="text-kampmax-error">*</span>
        </label>
        <Select
          value={location?.primaryCampusId ?? ""}
          onChange={(e) => handlePrimaryCampusChange(e.target.value)}
          placeholder={campusesLoading && CAMPUSES.length === 0 ? "Loading campuses..." : "Select your primary campus"}
        >
          <option value="">Select campus</option>
          {CAMPUSES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Additional Campuses */}
      {!isOnlineOnly && (
        <div>
          <label className="block text-sm font-medium text-kampmax-text mb-2">
            Additional Campuses (Optional)
          </label>
          <div className="space-y-2">
            <Select
              value=""
              onChange={(e) => {
                if (e.target.value) handleAdditionalCampusToggle(e.target.value);
                e.target.value = "";
              }}
              placeholder="Add another campus"
            >
              <option value="">Select campus to add</option>
              {CAMPUSES.filter((c) => c.id !== location?.primaryCampusId && !location?.additionalCampusIds?.includes(c.id))
                .map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
            </Select>

            {(location?.additionalCampusIds?.length ?? 0) > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {CAMPUSES.filter((c) => location?.additionalCampusIds?.includes(c.id))
                  .map((c) => (
                    <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 border border-primary-200 px-3 py-1 text-sm font-medium text-primary-700">
                      {c.name}
                      <button
                        type="button"
                        onClick={() => handleAdditionalCampusToggle(c.id)}
                        className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-primary-600 hover:bg-primary-100"
                      >
                        <Search className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Service Cities (Non-campus) */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-2">
          Service Cities / Areas (Optional)
        </label>
        <p className="text-sm text-kampmax-text-secondary mb-3">
          Add cities or areas outside campuses where you provide services.
        </p>
        <div className="flex flex-wrap gap-2">
          {location?.serviceCities?.map((city) => (
            <span key={city} className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 px-3 py-1 text-sm text-neutral-700">
              {city}
              <button
                type="button"
                onClick={() => handleServiceCityRemove(city)}
                className="ml-1 flex h-5 w-5 items-center justify-center rounded-full text-neutral-500 hover:bg-neutral-200"
              >
                <Search className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button type="button" onClick={handleServiceCityAdd} className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
            <Plus className="h-4 w-4" />
            Add City
          </button>
        </div>
      </div>

      {/* Service Radius */}
      {!isOnlineOnly && (
        <div>
          <label className="block text-sm font-medium text-kampmax-text mb-2">
            Service Radius (km) <span className="text-kampmax-error">*</span>
          </label>
          <div className="flex items-center gap-3">
            <Input
              type="number"
              min="1"
              max="100"
              value={location?.serviceRadiusKm ?? 10}
              onChange={(e) => handleRadiusChange(parseInt(e.target.value) || 10)}
              className="w-24"
              inputMode="numeric"
            />
            <span className="text-sm text-kampmax-text-secondary">kilometers from your location</span>
          </div>
        </div>
      )}

      {/* Address (Private) */}
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-1.5">
          Your Address (Private - Not displayed publicly)
        </label>
        <Input
          value={location?.address ?? ""}
          onChange={(e) => onUpdate({ location: { ...location, address: e.target.value } })}
          placeholder="e.g., Engineering Block, RUGIPO Campus, Owo"
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Used for distance calculations only. Never shown to customers.
        </p>
      </div>
    </div>
  );
}