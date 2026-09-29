"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { MapPin, Star, Clock, Calendar, CheckCircle, Shield, BadgeCheck, Wrench, DollarSign, Image, MessageSquare, Phone, Mail, Settings, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils";
import { getSpPublicProfile, getSpPublicProfileLive } from "@/services/service-provider";
import { getSpProfileByUserId } from "@/data/service-provider";
import type { ServiceProviderProfile } from "@/types/service-provider";

const SERVICE_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  draft: "Draft",
  inactive: "Inactive",
};

const LOCATION_LABELS: Record<string, string> = {
  provider_location: "At Provider's Location",
  customer_location: "At Customer's Location",
  both: "Both Locations",
  online: "Online Only",
  flexible: "Flexible",
};

const PRICING_LABELS: Record<string, string> = {
  fixed: "Fixed Price",
  starting_from: "Starting From",
  range: "Price Range",
  quote: "Quote Required",
};

export default function ServiceProviderPublicProfilePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [profile, setProfile] = useState<ServiceProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const data = await getSpPublicProfileLive(slug);
        if (data) {
          setProfile(data);
        } else {
          setNotFound(true);
        }
      } catch (e) {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent" />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <div className="min-h-screen bg-kampmax-bg flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center p-8 bg-white rounded-xl border border-kampmax-border">
          <Wrench className="mx-auto h-12 w-12 text-kampmax-text-secondary mb-4" />
          <h1 className="text-xl font-bold text-kampmax-text mb-2">Service Provider Not Found</h1>
          <p className="text-kampmax-text-secondary mb-6">
            The service provider profile you're looking for doesn't exist or has been removed.
          </p>
          <Link href="/home" className="inline-flex items-center gap-2 text-primary-600 hover:underline">
            <ExternalLink className="h-4 w-4" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-kampmax-border bg-white sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/home" className="text-kampmax-text-secondary hover:text-kampmax-text">
            <ExternalLink className="h-5 w-5" />
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/onboarding/service-provider/1" className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700">
              <Wrench className="h-4 w-4" />
              Become a Provider
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <section className="mb-12">
          {profile.coverImage ? (
            <div className="relative h-64 lg:h-80 rounded-2xl overflow-hidden">
              <img
                src={profile.coverImage}
                alt=""
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>
          ) : (
            <div className="relative h-64 lg:h-80 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 flex items-center justify-center">
              <Wrench className="h-24 w-24 text-primary-300" />
            </div>
          )}

          {/* Profile Info Overlay */}
          <div className="relative -mt-16 px-6 pb-8">
            <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
              <div className="relative z-10 lg:w-36">
                {profile.logo ? (
                  <img
                    src={profile.logo}
                    alt={profile.displayName}
                    className="w-36 h-36 rounded-2xl border-4 border-white shadow-xl object-cover"
                  />
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-primary-100 border-4 border-white shadow-xl flex items-center justify-center">
                    <Wrench className="h-16 w-16 text-primary-600" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 pt-4 lg:pt-0">
                <div className="flex items-start gap-3 flex-wrap">
                  <div>
                    <h1 className="text-3xl lg:text-4xl font-bold text-white">{profile.displayName}</h1>
                    {profile.verified && (
                      <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-sm font-medium bg-success-500/90 text-white backdrop-blur">
                        <BadgeCheck className="h-4 w-4" />
                        Verified Provider
                      </span>
                    )}
                  </div>
                </div>
                {profile.tagline && (
                  <p className="mt-2 text-lg text-white/90 max-w-2xl">{profile.tagline}</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/onboarding/service-provider/1"
                  className="flex-1 sm:flex-none"
                >
                  <Button size="lg" className="w-full">
                    <MessageSquare className="h-5 w-5 mr-2" />
                    Message
                  </Button>
                </Link>
                <Link
                  href="/onboarding/service-provider/1"
                  className="flex-1 sm:flex-none"
                >
                  <Button variant="outline" size="lg" className="w-full">
                    <Calendar className="h-5 w-5 mr-2" />
                    Book Service
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Main Content */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About */}
            <section className="rounded-xl border border-kampmax-border bg-white p-6">
              <h2 className="text-xl font-semibold text-kampmax-text mb-4 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-primary-600" />
                About
              </h2>
              <p className="text-kampmax-text-secondary whitespace-pre-line">{profile.description || "No description provided."}</p>
            </section>

            {/* Services */}
            <section className="rounded-xl border border-kampmax-border bg-white p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold text-kampmax-text flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary-600" />
                  Services ({profile.services.length})
                </h2>
              </div>
              {profile.services.length === 0 ? (
                <p className="text-kampmax-text-secondary py-8 text-center">No services listed yet.</p>
              ) : (
                <div className="space-y-4">
                  {profile.services.map((service) => (
                    <article
                      key={service.id}
                      className="rounded-lg border border-kampmax-border p-5 hover:bg-neutral-50 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <h3 className="font-semibold text-kampmax-text">{service.name}</h3>
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary-100 text-primary-700">
                              <DollarSign className="h-3 w-3" />
                              {service.pricingModel === "fixed" ? `${formatNaira(service.price)}` :
                               service.pricingModel === "starting_from" ? `From ${formatNaira(service.price)}` :
                               service.pricingModel === "range" ? `${formatNaira(service.price)} - ${formatNaira(service.priceMax || service.price)}` :
                               "Quote Required"}
                            </span>
                          </div>
                          <p className="text-kampmax-text-secondary mb-2">{service.description}</p>
                          <div className="flex flex-wrap gap-2 text-sm text-kampmax-text-secondary">
                            <span className="inline-flex items-center gap-1">
                              <DollarSign className="h-3.5 w-3.5" />
                              {service.pricingModel === "fixed" ? `${formatNaira(service.price)}` :
                               service.pricingModel === "starting_from" ? `From ${formatNaira(service.price)}` :
                               service.pricingModel === "range" ? `${formatNaira(service.price)} - ${formatNaira(service.priceMax || service.price)}` :
                               "Quote Required"}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {service.durationMinutes} min
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {LOCATION_LABELS[service.locationType] || service.locationType}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-semibold text-lg text-kampmax-text">
                            {service.pricingModel === "quote" ? "Get Quote" : formatNaira(service.price)}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* Portfolio */}
            {profile.portfolio.length > 0 && (
              <section className="rounded-xl border border-kampmax-border bg-white p-6">
                <h2 className="text-xl font-semibold text-kampmax-text mb-6 flex items-center gap-2">
                  <Image className="h-5 w-5 text-primary-600" />
                  Portfolio ({profile.portfolio.length})
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {profile.portfolio.map((item, index) => (
                    <article key={index} className="rounded-lg border border-kampmax-border overflow-hidden">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt={item.title}
                          className="w-full h-48 object-cover"
                        />
                      ) : (
                        <div className="w-full h-48 bg-neutral-100 flex items-center justify-center">
                          <Image className="h-10 w-10 text-neutral-300" />
                        </div>
                      )}
                      <div className="p-4">
                        <h3 className="font-medium text-kampmax-text">{item.title || "Untitled"}</h3>
                        <p className="mt-1 text-sm text-kampmax-text-secondary line-clamp-2">{item.description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}

            {/* Service Areas */}
            <section className="rounded-xl border border-kampmax-border bg-white p-6">
              <h2 className="text-xl font-semibold text-kampmax-text mb-6 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary-600" />
                Service Areas
              </h2>
              <div className="space-y-3">
                {profile.location.primaryCampusId && (
                  <div className="p-4 rounded-lg bg-primary-50 border border-primary-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary-600" />
                      <span className="font-medium text-primary-800">Primary: {profile.location.primaryCampusId.toUpperCase()}</span>
                    </div>
                  </div>
                )}
                {profile.location.additionalCampusIds?.length && (
                  <div>
                    <p className="text-sm text-kampmax-text-secondary mb-2">Additional Campuses</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.location.additionalCampusIds.map((c) => (
                        <span key={c} className="px-3 py-1 rounded-full bg-primary-100 text-primary-700 text-sm font-medium">
                          {c.toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.location.serviceCities?.length && (
                  <div>
                    <p className="text-sm text-kampmax-text-secondary mb-2">Service Cities</p>
                    <div className="flex flex-wrap gap-2">
                      {profile.location.serviceCities.map((city) => (
                        <span key={city} className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-sm font-medium">
                          {city}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {!profile.location.type.includes("online") && (
                  <div className="p-4 rounded-lg bg-info-50 border border-info-200">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-info-600" />
                      <span className="font-medium text-info-800">Service Radius: {profile.location.serviceRadiusKm} km</span>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Availability */}
            <section className="rounded-xl border border-kampmax-border bg-white p-6">
              <h2 className="text-xl font-semibold text-kampmax-text mb-6 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary-600" />
                Availability
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mb-6">
                {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => {
                  const dayData = profile.availability.days.find((d) => d.dayIndex === i);
                  const available = dayData?.isAvailable ?? (i < 5);
                  return (
                    <div
                      key={day}
                      className={cn(
                        "p-3 rounded-lg text-center font-medium",
                        available
                          ? "bg-success-50 text-success-700 border border-success-200"
                          : "bg-neutral-50 text-neutral-500 border border-neutral-200"
                      )}
                    >
                      <p className="text-sm">{day}</p>
                      {available && dayData && (
                        <p className="text-xs text-success-600 mt-1">
                          {dayData.openTime} – {dayData.closeTime}
                        </p>
                      )}
                      {!available && <p className="text-xs text-neutral-500 mt-1">Closed</p>}
                    </div>
                  );
                })}
              </div>
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div className="p-3 rounded-lg bg-neutral-50">
                  <p className="text-kampmax-text-secondary">Booking Mode</p>
                  <p className="font-medium text-kampmax-text capitalize">{profile.availability.bookingPreference.replace("_", " ")}</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50">
                  <p className="text-kampmax-text-secondary">Buffer</p>
                  <p className="font-medium text-kampmax-text">{profile.availability.appointmentBufferMinutes} min</p>
                </div>
                <div className="p-3 rounded-lg bg-neutral-50">
                  <p className="text-kampmax-text-secondary">Max Advance</p>
                  <p className="font-medium text-kampmax-text">{profile.availability.maxAdvanceBookingDays} days</p>
                </div>
              </div>
            </section>

            {/* Pricing Rules */}
            <section className="rounded-xl border border-kampmax-border bg-white p-6">
              <h2 className="text-xl font-semibold text-kampmax-text mb-6 flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary-600" />
                Additional Pricing
              </h2>
              <div className="grid gap-3 sm:grid-cols-4">
                <PricingCard label="Travel Fee" value={formatNaira(profile.pricing.travelFee ?? 0)} icon={Wrench} />
                <PricingCard label="Emergency Fee" value={formatNaira(profile.pricing.emergencyFee ?? 0)} icon={Shield} />
                <PricingCard label="Weekend Fee" value={formatNaira(profile.pricing.weekendFee ?? 0)} icon={Calendar} />
                <PricingCard label="Min. Booking" value={`${profile.pricing.minimumBookingQuantity} unit(s)`} icon={Settings} />
              </div>
            </section>

            {/* Contact & Verification */}
            <section className="rounded-xl border border-kampmax-border bg-white p-6">
              <h2 className="text-xl font-semibold text-kampmax-text mb-6 flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary-600" />
                Verification & Contact
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="p-4 rounded-lg bg-success-50 border border-success-200">
                  <div className="flex items-center gap-2 mb-2">
                    {profile.verification.status === "approved" && <BadgeCheck className="h-4 w-4 text-success-600" />}
                    {profile.verification.status === "pending" && <Clock className="h-4 w-4 text-warning-600" />}
                    <span className="font-semibold text-success-800">
                      {profile.verification.status === "approved" && "Identity Verified"}
                      {profile.verification.status === "pending" && "Under Review"}
                      {profile.verification.status === "action_required" && "Action Required"}
                      {profile.verification.status === "not_required" && "Not Verified"}
                    </span>
                  </div>
                  <p className="text-sm text-success-700">
                    Verified providers get a trust badge and higher visibility in search.
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-neutral-50">
                  <p className="text-sm text-kampmax-text-secondary mb-1">Response Time</p>
                  <p className="font-semibold text-kampmax-text">{profile.responseTime || "Not specified"}</p>
                </div>
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Contact Card */}
            <aside className="rounded-xl border border-kampmax-border bg-white p-6 sticky top-24">
              <h3 className="text-lg font-semibold text-kampmax-text mb-4">Contact</h3>
              <Button className="w-full mb-3" variant="primary">
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </Button>
              <Button className="w-full mb-3" variant="primary">
                <Calendar className="h-4 w-4 mr-2" />
                Book Appointment
              </Button>
              <div className="border-t border-kampmax-border pt-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-kampmax-text-secondary" />
                  <span className="text-kampmax-text">Serves: {profile.location.primaryCampusId?.toUpperCase()}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-kampmax-text">{profile.rating} ({profile.totalBookings} bookings)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="h-4 w-4 text-kampmax-text-secondary" />
                  <span className="text-kampmax-text">Typically responds in {profile.responseTime || "a few hours"}</span>
                </div>
                {profile.verification.status === "approved" && (
                  <div className="flex items-center gap-3 text-sm">
                    <BadgeCheck className="h-4 w-4 text-success-600" />
                    <span className="text-success-700 font-medium">Verified Provider</span>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}

function PricingCard({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4 text-primary-600" />
        <span className="text-sm text-kampmax-text-secondary">{label}</span>
      </div>
      <p className="font-semibold text-kampmax-text">{value}</p>
    </div>
  );
}