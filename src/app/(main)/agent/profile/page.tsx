"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { User, Building2, MapPin, Phone, Mail, ExternalLink, ShieldCheck, Save, Check } from "lucide-react";
import {
  useAccommodationAgentProfile,
  useAccommodationAgentStatus,
  useUpdateAccommodationAgent,
} from "@/hooks/use-accommodation";
import { AgentStatusBadge } from "@/components/agent/AgentStatusBadge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AgentProfilePage() {
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));
  const update = useUpdateAccommodationAgent();

  const agent = profileQuery.data;
  const status = statusQuery.data?.status ?? "PENDING";

  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [operatingLocation, setOperatingLocation] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (agent) {
      setPhone(agent.phone);
      setEmail(agent.email);
      setOperatingLocation(agent.operatingLocation);
      setAgencyName(agent.agencyName || "");
      setBusinessAddress(agent.businessAddress || "");
    }
  }, [agent]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavedSuccess(false);
    update.mutate(
      {
        phone: phone.trim(),
        email: email.trim(),
        operatingLocation: operatingLocation.trim(),
        agencyName: agencyName.trim() || undefined,
        businessAddress: businessAddress.trim() || undefined,
      },
      {
        onSuccess: () => {
          setSavedSuccess(true);
          setTimeout(() => setSavedSuccess(false), 4000);
        },
      }
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            Agent Profile
          </h1>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            This professional information is shown to students across campus accommodation listings.
          </p>
        </div>
        <Link
          href="/accommodation"
          className="inline-flex items-center gap-1.5 rounded-xl border border-kampmax-border bg-white px-3.5 py-2 text-xs font-semibold text-kampmax-text hover:bg-neutral-50"
        >
          <ExternalLink className="h-4 w-4" aria-hidden />
          <span>View Public Marketplace</span>
        </Link>
      </div>

      {/* Header Profile Card */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-kampmax-blue/10 text-kampmax-blue">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-kampmax-text">
                {agent?.fullName ?? "Loading…"}
              </h2>
              <p className="text-xs text-kampmax-text-secondary">
                {agent?.agencyName || "Independent Accommodation Agent"}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <AgentStatusBadge status={status} />
                <span className="inline-flex items-center gap-1 text-[11px] text-kampmax-text-secondary">
                  <MapPin className="h-3 w-3 text-kampmax-blue" />
                  {agent?.operatingLocation || "Campus Area"}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/agent/verification"
            className="inline-flex items-center gap-1.5 rounded-xl border border-kampmax-border bg-neutral-50 px-3.5 py-2 text-xs font-semibold text-kampmax-text hover:bg-neutral-100"
          >
            <ShieldCheck className="h-4 w-4 text-kampmax-blue" />
            <span>Verification Status</span>
          </Link>
        </div>
      </section>

      {/* Professional Details Editor */}
      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        <h2 className="text-base font-bold text-kampmax-text">Professional Information</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">
          Keep your phone and operating locations up-to-date so students can reach you for inspections.
        </p>

        {profileQuery.isPending ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-kampmax-text">
                Full Legal Name
                <input
                  disabled
                  value={agent?.fullName ?? ""}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border bg-neutral-100 px-3.5 py-2 text-sm text-neutral-500 cursor-not-allowed"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text">
                Operating Location / Campus *
                <input
                  required
                  placeholder="e.g. UNILAG, Yaba, Akoka"
                  value={operatingLocation}
                  onChange={(e) => setOperatingLocation(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text">
                Inquiry Phone Number *
                <input
                  required
                  type="tel"
                  placeholder="e.g. 08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text">
                Inquiry Email Address *
                <input
                  required
                  type="email"
                  placeholder="agent@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
                Agency or Property Brand Name (Optional)
                <input
                  placeholder="e.g. Prime Student Housing Ltd"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
                Office / Business Address (Optional)
                <input
                  placeholder="e.g. Suite 12, Student Hub Complex"
                  value={businessAddress}
                  onChange={(e) => setBusinessAddress(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>
            </div>

            {update.error && (
              <p role="alert" className="rounded-lg bg-red-50 p-3 text-xs text-red-700">
                {update.error.message}
              </p>
            )}

            {savedSuccess && (
              <div className="flex items-center gap-1.5 rounded-lg bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                <Check className="h-4 w-4 text-emerald-600" />
                <span>Profile details updated successfully!</span>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={update.isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-kampmax-blue px-5 py-2.5 text-xs font-bold text-white shadow-2xs hover:bg-kampmax-blue/90 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{update.isPending ? "Saving Changes…" : "Save Changes"}</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}

