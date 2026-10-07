"use client";

import { useState } from "react";
import { CheckCircle, AlertCircle, XCircle, ChevronRight, Edit, Shield, Clock, MapPin, DollarSign, Image, Settings, User } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils";
import type { ServiceProviderOnboardingDraft, ServiceProviderServiceStatus, ServiceProviderLocationType, ServiceProviderPricingModel, ServiceProviderBookingPreference } from "@/types/service-provider";

const SERVICE_STATUS_LABELS: Record<ServiceProviderServiceStatus, string> = {
  draft: "Draft",
  active: "Active",
  inactive: "Inactive",
  pending_review: "Pending Review",
  rejected: "Rejected",
};

const TYPE_LABELS: Record<string, string> = {
  individual: "Individual",
  business: "Business",
  team_agency: "Team / Agency",
};

const LOCATION_LABELS: Record<ServiceProviderLocationType, string> = {
  provider_location: "At My Location",
  customer_location: "At Customer's Location",
  both: "Both",
  online: "Online Only",
  flexible: "Flexible",
};

const PRICING_LABELS: Record<ServiceProviderPricingModel, string> = {
  fixed: "Fixed Price",
  starting_from: "Starting From",
  range: "Price Range",
  quote: "Quote Required",
};

const BOOKING_LABELS: Record<ServiceProviderBookingPreference, string> = {
  instant: "Instant Booking",
  request_approval: "Request Approval",
};

interface StepReviewProps {
  draft: ServiceProviderOnboardingDraft | null;
  onEditStep: (step: number) => void;
  onSubmit: () => void;
  canSubmit: boolean;
  isSubmitting: boolean;
}

export function StepReview({ draft, onEditStep, onSubmit, canSubmit, isSubmitting }: StepReviewProps) {
  const [openSection, setOpenSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section);
  };

  const sections = [
    {
      key: "provider",
      label: "Provider Type",
      icon: User,
      content: (
        <div>
          <p className="font-medium text-kampmax-text">
            {TYPE_LABELS[draft?.provider?.type ?? ""] || "Not set"}
          </p>
        </div>
      ),
    },
    {
      key: "profile",
      label: "Profile",
      icon: User,
      content: (
        <div className="space-y-3">
          <div>
            <p className="text-sm text-kampmax-text-secondary">Display Name</p>
            <p className="font-medium text-kampmax-text">{draft?.profile?.displayName || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-kampmax-text-secondary">Tagline</p>
            <p className="font-medium text-kampmax-text">{draft?.profile?.tagline || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-kampmax-text-secondary">Bio</p>
            <p className="text-kampmax-text">{draft?.provider?.bio || "Not set"}</p>
          </div>
          <div>
            <p className="text-sm text-kampmax-text-secondary">Description</p>
            <p className="text-kampmax-text">{draft?.profile?.description || "Not set"}</p>
          </div>
        </div>
      ),
    },
    {
      key: "category",
      label: "Categories",
      icon: Shield,
      content: (
        <div className="space-y-2">
          <div>
            <p className="text-sm text-kampmax-text-secondary">Primary Category</p>
            <p className="font-medium text-kampmax-text">{draft?.category?.primaryCategoryId || "Not set"}</p>
          </div>
          {draft?.category?.secondaryCategoryIds?.length && (
            <div>
              <p className="text-sm text-kampmax-text-secondary">Additional Categories</p>
              <p className="font-medium text-kampmax-text">
                {draft.category.secondaryCategoryIds.join(", ")}
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "services",
      label: `Services (${draft?.services?.length ?? 0})`,
      icon: Settings,
      content: (
        <div className="space-y-3">
          {draft?.services?.map((svc, i) => (
            <div key={i} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-kampmax-text">{svc.name || "Unnamed"}</p>
                  <p className="text-sm text-kampmax-text-secondary">{svc.description || "No description"}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                      <DollarSign className="h-3 w-3" />
                      {PRICING_LABELS[svc.pricingModel] || svc.pricingModel}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-700">
                      <Clock className="h-3 w-3" />
                      {svc.durationMinutes} min
                    </span>
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                      svc.status === "active" && "bg-success-100 text-success-700",
                      svc.status === "inactive" && "bg-neutral-100 text-neutral-700",
                      "bg-warning-100 text-warning-700"
                    )}>
                      {SERVICE_STATUS_LABELS[svc.status] || svc.status}
                    </span>
                  </div>
                </div>
                <span className="font-semibold text-kampmax-text text-neutral-700">
                  {formatNaira(svc.price)}
                </span>
              </div>
            </div>
          )) || (
            <p className="text-kampmax-text-secondary">No services added</p>
          )}
        </div>
      ),
    },
    {
      key: "location",
      label: "Location",
      icon: MapPin,
      content: (
        <div className="space-y-2">
          <div>
            <p className="text-sm text-kampmax-text-secondary">Location Type</p>
            <p className="font-medium text-kampmax-text">
              {draft?.location?.type ? (LOCATION_LABELS[draft.location.type] || "Not set") : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-sm text-kampmax-text-secondary">Primary Campus</p>
            <p className="font-medium text-kampmax-text">{draft?.location?.primaryCampusId || "Not set"}</p>
          </div>
          {draft?.location?.additionalCampusIds?.length && (
            <div>
              <p className="text-sm text-kampmax-text-secondary">Additional Campuses</p>
              <p className="font-medium text-kampmax-text">
                {draft.location.additionalCampusIds.join(", ")}
              </p>
            </div>
          )}
          {draft?.location?.serviceCities?.length && (
            <div>
              <p className="text-sm text-kampmax-text-secondary">Service Cities</p>
              <p className="font-medium text-kampmax-text">
                {draft.location.serviceCities.join(", ")}
              </p>
            </div>
          )}
          {!draft?.location?.type?.includes("online") && (
            <div>
              <p className="text-sm text-kampmax-text-secondary">Service Radius</p>
              <p className="font-medium text-kampmax-text">
                {draft?.location?.serviceRadiusKm ?? 10} km
              </p>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "availability",
      label: "Availability",
      icon: Clock,
      content: (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Booking Mode</p>
              <p className="font-medium text-kampmax-text">
                {draft?.availability?.bookingPreference ? (BOOKING_LABELS[draft.availability.bookingPreference] || "Not set") : "Not set"}
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Buffer</p>
              <p className="font-medium text-kampmax-text">
                {draft?.availability?.appointmentBufferMinutes ?? 15} min
              </p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Min. Notice</p>
              <p className="font-medium text-kampmax-text">
                {draft?.availability?.minAdvanceNoticeHours ?? 2} hours
              </p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-sm text-kampmax-text-secondary">Weekly Schedule</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                const dayData = draft?.availability?.days?.find((d) => d.dayIndex === i);
                const available = dayData?.isAvailable ?? (i < 5);
                return (
                  <span
                    key={day}
                    className={cn(
                      "px-2 py-1 rounded-full text-xs font-medium",
                      available
                        ? "bg-success-100 text-success-700"
                        : "bg-neutral-100 text-neutral-500"
                    )}
                  >
                    {day}
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "pricing",
      label: "Pricing",
      icon: DollarSign,
      content: (
        <div className="space-y-2">
          <div className="grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Travel Fee</p>
              <p className="font-medium text-kampmax-text">{formatNaira(draft?.pricing?.travelFee ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Emergency Fee</p>
              <p className="font-medium text-kampmax-text">{formatNaira(draft?.pricing?.emergencyFee ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Weekend Fee</p>
              <p className="font-medium text-kampmax-text">{formatNaira(draft?.pricing?.weekendFee ?? 0)}</p>
            </div>
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-xs text-kampmax-text-secondary">Min. Booking</p>
              <p className="font-medium text-kampmax-text">{draft?.pricing?.minimumBookingQuantity ?? 1} unit(s)</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "portfolio",
      label: `Portfolio (${draft?.portfolio?.length ?? 0})`,
      icon: Image,
      content: (
        <div>
          {draft?.portfolio?.map((item, i) => (
            <div key={i} className="p-3 rounded-lg bg-neutral-50 border border-neutral-200">
              <p className="font-medium text-kampmax-text">{item.title || "Untitled"}</p>
              <p className="text-sm text-kampmax-text-secondary">{item.description || "No description"}</p>
              <p className="mt-1 text-xs text-kampmax-text-secondary">Category: {item.categoryId}</p>
            </div>
          )) || (
            <p className="text-kampmax-text-secondary">No portfolio items</p>
          )}
        </div>
      ),
    },
  ];

  const allComplete = () => {
    if (!draft) return false;
    if (!draft.provider?.type) return false;
    if (!draft.provider?.displayName) return false;
    if (!draft.profile?.displayName) return false;
    if (!draft.category?.primaryCategoryId) return false;
    if (!draft?.services?.length) return false;
    if (!draft?.location?.primaryCampusId) return false;
    if (!draft?.availability?.days?.some((d) => d.isAvailable)) return false;
    return true;
  };

  const isComplete = allComplete();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Review & Submit</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Please review all information below. You can edit any section by clicking the Edit button.
        </p>
      </div>

      {/* Completeness indicator */}
      <div className={cn(
        "rounded-xl p-4 flex items-center gap-3",
        isComplete ? "bg-success-50 border border-success-200" : "bg-warning-50 border border-warning-200"
      )}>
        {isComplete ? (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success-100">
              <CheckCircle className="h-5 w-5 text-success-600" />
            </div>
            <div>
              <p className="font-semibold text-success-800">Application ready for submission</p>
              <p className="text-sm text-success-700">All required sections are complete.</p>
            </div>
          </>
        ) : (
          <>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-100">
              <AlertCircle className="h-5 w-5 text-warning-600" />
            </div>
            <div>
              <p className="font-semibold text-warning-800">Application incomplete</p>
              <p className="text-sm text-warning-700">Please complete all required sections before submitting.</p>
            </div>
          </>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <div
            key={section.key}
            className="rounded-xl border border-kampmax-border bg-white overflow-hidden"
          >
            <div className="w-full flex items-center justify-between p-4 hover:bg-neutral-50 transition-colors">
              <button
                type="button"
                onClick={() => toggleSection(section.key)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                aria-expanded={openSection === section.key}
                aria-controls={`review-section-${section.key}`}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                  <section.icon className="h-5 w-5 text-kampmax-text-secondary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-kampmax-text">{section.label}</p>
                  <p className="text-sm text-kampmax-text-secondary">Click to review</p>
                </div>
              </button>
              <div className="flex items-center gap-2 pl-3">
                <ChevronRight
                  className={cn(
                    "h-5 w-5 text-kampmax-text-secondary transition-transform",
                    openSection === section.key && "rotate-90"
                  )}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onEditStep(
                      sections.findIndex((s) => s.key === section.key) + 1
                    )
                  }
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
              </div>
            </div>

            {openSection === section.key && (
              <div
                id={`review-section-${section.key}`}
                className="border-t border-kampmax-border p-4 animate-in fade-in"
              >
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Terms & Agreement */}
      <div className="rounded-xl border border-kampmax-border bg-white p-6 space-y-4">
        <h3 className="text-lg font-semibold text-kampmax-text">Terms & Agreement</h3>
        <p className="text-sm text-kampmax-text-secondary">
          By submitting this application, you agree to the following:
        </p>
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-lg p-3 border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" required />
            <div className="text-sm text-kampmax-text">
              <p className="font-medium">Service Provider Terms of Service</p>
              <p className="text-sm text-kampmax-text-secondary">I have read and agree to the Kampmax Service Provider Terms of Service.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg p-3 border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" required />
            <div className="text-sm text-kampmax-text">
              <p className="font-medium">Marketplace Policies</p>
              <p className="text-sm text-kampmax-text-secondary">I agree to follow Kampmax marketplace policies and community guidelines.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg p-3 border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" required />
            <div className="text-sm text-kampmax-text">
              <p className="font-medium">Payment & Payout Policies</p>
              <p className="text-sm text-kampmax-text-secondary">I understand and accept the payment processing and payout policies.</p>
            </div>
          </label>
          <label className="flex items-start gap-3 rounded-lg p-3 border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
            <input type="checkbox" className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-600" required />
            <div className="text-sm text-kampmax-text">
              <p className="font-medium">Cancellation & Refund Policies</p>
              <p className="text-sm text-kampmax-text-secondary">I agree to the cancellation and refund policies for service bookings.</p>
            </div>
          </label>
        </div>
      </div>

      {/* Submit */}
      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <Button variant="outline" onClick={() => onEditStep(8)} disabled={isSubmitting}>
          <XCircle className="h-4 w-4 mr-2" />
          Back to Portfolio
        </Button>
        <Button
          variant="primary"
          size="lg"
          onClick={onSubmit}
          disabled={!canSubmit || !isComplete || isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? (
            <>
              <div className="h-4 w-4 animate-spin border-2 border-white border-t-transparent rounded-full mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Shield className="h-4 w-4 mr-2" />
              Submit Application
            </>
          )}
        </Button>
      </div>
    </div>
  );
}