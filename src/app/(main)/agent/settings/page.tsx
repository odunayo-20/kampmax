"use client";

import { FormEvent, useEffect, useState } from "react";
import { Settings, Save, Check } from "lucide-react";
import {
  useAccommodationAgentProfile,
  useAccommodationAgentStatus,
  useUpdateAccommodationAgent,
} from "@/hooks/use-accommodation";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AgentSettingsPage() {
  const statusQuery = useAccommodationAgentStatus();
  const profileQuery = useAccommodationAgentProfile(Boolean(statusQuery.data?.applied));
  const update = useUpdateAccommodationAgent();

  const agent = profileQuery.data;

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [operatingLocation, setOperatingLocation] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (agent) {
      setFullName(agent.fullName);
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
      <div>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-kampmax-blue" />
          <h1 className="text-2xl font-bold tracking-tight text-kampmax-text">
            Agent Profile & Settings
          </h1>
        </div>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          Update your operating locations, public agency branding, and contact details.
        </p>
      </div>

      <section className="rounded-2xl border border-kampmax-border bg-white p-6 shadow-xs">
        {profileQuery.isPending ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-kampmax-text">
                Full Name
                <input
                  disabled
                  value={fullName}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border bg-neutral-100 px-3.5 py-2 text-sm text-neutral-500 cursor-not-allowed"
                />
                <span className="mt-1 block text-[11px] text-kampmax-text-secondary">
                  Legal name matches your verification ID. Contact support to update.
                </span>
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
                Contact Phone *
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
                Contact Email *
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
                Agency / Brand Name (Optional)
                <input
                  placeholder="e.g. Apex Campus Properties Ltd"
                  value={agencyName}
                  onChange={(e) => setAgencyName(e.target.value)}
                  className="mt-1 block w-full rounded-xl border border-kampmax-border px-3.5 py-2 text-sm text-kampmax-text focus:border-kampmax-blue focus:outline-none"
                />
              </label>

              <label className="text-xs font-semibold text-kampmax-text sm:col-span-2">
                Office / Business Address (Optional)
                <input
                  placeholder="e.g. Suite 4, Campus Commercial Complex"
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
                <span>Your profile settings have been updated successfully!</span>
              </div>
            )}

            <div className="flex justify-end pt-3">
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

