"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronDown, Tag, Clock, DollarSign, MapPin, Globe, Home, Wifi, Settings } from "lucide-react";
import { Button, Input, Select } from "@/components/ui";
import { cn, formatNaira } from "@/lib/utils";
import { TaxonomySelect } from "@/components/taxonomy";
import type { ServiceProviderOnboardingDraft, ServiceProviderServiceDraft, ServiceProviderPricingModel, ServiceProviderLocationType, ServiceProviderServiceStatus } from "@/types/service-provider";

const PRICING_MODELS = [
  { value: "fixed", label: "Fixed Price", description: "₦5,000" },
  { value: "starting_from", label: "Starting From", description: "From ₦5,000" },
  { value: "range", label: "Price Range", description: "₦5,000 - ₦10,000" },
  { value: "quote", label: "Quote Required", description: "Custom pricing" },
] as const;

const LOCATION_TYPES = [
  { value: "provider_location", label: "At My Location", icon: MapPin, description: "Customers come to your shop/office" },
  { value: "customer_location", label: "At Customer's Location", icon: Home, description: "You travel to the customer" },
  { value: "both", label: "Both", icon: Settings, description: "Flexible - either location works" },
  { value: "online", label: "Online Only", icon: Wifi, description: "Remote services via video/chat" },
  { value: "flexible", label: "Flexible", icon: Globe, description: "Depends on the service" },
] as const;

interface ServiceFormData extends ServiceProviderServiceDraft {
  tempId: string;
}

interface StepServicesProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
}

export function StepServices({ draft, onUpdate }: StepServicesProps) {
  const [services, setServices] = useState<ServiceFormData[]>(
    draft?.services?.map((s) => ({ ...s, tempId: s.id ?? `temp_${Date.now()}_${Math.random()}` })) ?? []
  );
  const [editingId, setEditingId] = useState<string | null>(null);

  const addService = () => {
    const newService: ServiceFormData = {
      tempId: `temp_${Date.now()}`,
      name: "",
      description: "",
      categoryId: draft?.category?.primaryCategoryId ?? "",
      pricingModel: "fixed",
      price: 0,
      durationMinutes: 60,
      locationType: "provider_location",
      status: "draft",
    };
    setServices((prev) => [...prev, newService]);
    setEditingId(newService.tempId);
  };

  const updateService = (tempId: string, updates: Partial<ServiceFormData>) => {
    const next = services.map((s) => (s.tempId === tempId ? { ...s, ...updates } : s));
    setServices(next);
    // Also sync to draft
    onUpdate({
      services: next as ServiceProviderServiceDraft[],
    });
  };

  const removeService = (tempId: string) => {
    setServices((prev) => prev.filter((s) => s.tempId !== tempId));
    onUpdate({
      services: services.filter((s) => s.tempId !== tempId) as ServiceProviderServiceDraft[],
    });
  };

  const saveService = (tempId: string) => {
    setEditingId(null);
  };

  if (services.length === 0 && !editingId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-kampmax-text">Your Services</h2>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Add the individual services you offer. Each service will be listed on your profile.
          </p>
        </div>
        <Button onClick={addService} className="w-full py-4">
          <Plus className="h-4 w-4 mr-2" />
          Add Your First Service
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-kampmax-text">Your Services</h2>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            {services.length} service{services.length !== 1 ? "s" : ""} added
          </p>
        </div>
        <Button variant="outline" onClick={addService} disabled={!!editingId}>
          <Plus className="h-4 w-4 mr-2" />
          Add Another Service
        </Button>
      </div>

      <div className="space-y-4">
        {services.map((service) => (
          <ServiceCard
            key={service.tempId}
            service={service}
            isEditing={editingId === service.tempId}
            onEdit={() => setEditingId(service.tempId)}
            onSave={() => saveService(service.tempId)}
            onCancel={() => setEditingId(null)}
            onRemove={() => removeService(service.tempId)}
            onUpdate={(updates) => updateService(service.tempId, updates)}
          />
        ))}
      </div>

      {services.length === 0 && (
        <div className="text-center py-8">
          <p className="text-kampmax-text-secondary">No services added yet</p>
          <Button onClick={addService} className="mt-3">
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Service
          </Button>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onRemove,
  onUpdate,
}: {
  service: ServiceFormData;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<ServiceFormData>) => void;
}) {
  if (isEditing) {
    return (
      <div className="rounded-xl border-2 border-primary-300 bg-primary-50 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-kampmax-text">Editing Service</h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onCancel}>Cancel</Button>
            <Button size="sm" onClick={onSave}>Save</Button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Service Name <span className="text-kampmax-error">*</span>
            </label>
            <Input
              value={service.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="e.g., Phone Screen Replacement"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Category <span className="text-kampmax-error">*</span>
            </label>
            <TaxonomySelect
              type="SERVICE"
              value={service.categoryId}
              onChange={(id) => onUpdate({ categoryId: id })}
              placeholder="Select category"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-kampmax-text mb-1.5">
            Description
          </label>
          <textarea
            value={service.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Describe what this service includes..."
            rows={3}
            className="w-full px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-600/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Pricing Model
            </label>
            <Select
              value={service.pricingModel}
              onChange={(e) => onUpdate({ pricingModel: e.target.value as ServiceProviderPricingModel })}
            >
              <option value="fixed">Fixed Price</option>
              <option value="starting_from">Starting From</option>
              <option value="range">Price Range</option>
              <option value="quote">Quote Required</option>
            </Select>
          </div>

          {service.pricingModel === "range" ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-kampmax-text mb-1.5">
                  Price (₦) <span className="text-kampmax-error">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  value={service.price}
                  onChange={(e) => onUpdate({ price: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                  inputMode="numeric"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-kampmax-text mb-1.5">
                  Max Price (₦)
                </label>
                <Input
                  type="number"
                  min="0"
                  value={service.priceMax ?? 0}
                  onChange={(e) => onUpdate({ priceMax: parseInt(e.target.value) || undefined })}
                  placeholder="Max"
                  inputMode="numeric"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-kampmax-text mb-1.5">
                Price (₦) <span className="text-kampmax-error">*</span>
              </label>
              <Input
                type="number"
                min="0"
                value={service.price}
                onChange={(e) => onUpdate({ price: parseInt(e.target.value) || 0 })}
                placeholder="0"
                inputMode="numeric"
              />
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Duration (minutes) <span className="text-kampmax-error">*</span>
            </label>
            <Input
              type="number"
              min="15"
              max="480"
              step="15"
              value={service.durationMinutes}
              onChange={(e) => onUpdate({ durationMinutes: parseInt(e.target.value) || 60 })}
              inputMode="numeric"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Location Type
            </label>
            <Select
              value={service.locationType}
              onChange={(e) => onUpdate({ locationType: e.target.value as ServiceProviderLocationType })}
            >
              <option value="provider_location">At My Location</option>
              <option value="customer_location">At Customer's Location</option>
              <option value="both">Both</option>
              <option value="online">Online Only</option>
              <option value="flexible">Flexible</option>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-kampmax-text mb-1.5">
              Status
            </label>
            <Select
              value={service.status}
              onChange={(e) => onUpdate({ status: e.target.value as ServiceProviderServiceStatus })}
            >
              <option value="draft">Draft</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </div>
        </div>
      </div>
    );
  }
  // View mode
  const pricingLabels = {
    fixed: `Fixed: ${formatNaira(service.price)}`,
    starting_from: `From ${formatNaira(service.price)}`,
    range: `Range: ${formatNaira(service.price)} - ${formatNaira(service.priceMax ?? service.price)}`,
    quote: "Quote Required",
  };

  const locationLabels = {
    provider_location: "At My Location",
    customer_location: "At Customer's Location",
    both: "Both Locations",
    online: "Online Only",
    flexible: "Flexible",
  };

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-kampmax-text">{service.name || "Unnamed Service"}</h3>
          <p className="mt-1 text-sm text-kampmax-text-secondary line-clamp-2">{service.description || "No description"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-primary-100 text-primary-700">
            <Tag className="h-3 w-3" />
            {pricingLabels[service.pricingModel]}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-kampmax-text-secondary">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          {service.durationMinutes} min
        </span>
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3.5 w-3.5" />
          {locationLabels[service.locationType]}
        </span>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          service.status === "active" ? "bg-success-100 text-success-700" :
          service.status === "inactive" ? "bg-neutral-100 text-neutral-700" :
          "bg-warning-100 text-warning-700"
        }`}>
          {service.status.charAt(0).toUpperCase() + service.status.slice(1)}
        </span>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-kampmax-border">
        <Button variant="outline" size="sm" onClick={onRemove}>
          <Trash2 className="h-4 w-4 mr-1" />
          Remove
        </Button>
        <Button variant="outline" size="sm" onClick={onEdit}>
          <Settings className="h-4 w-4 mr-1" />
          Edit
        </Button>
      </div>
    </div>
  );
}