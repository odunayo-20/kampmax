"use client";

import { useEffect, useState } from "react";
import { Input, Select } from "@/components/ui";
import {
  EMPLOYER_CONTACT_METHODS,
  EMPLOYER_WORK_PREFERENCES,
} from "@/config/employer";
import { getEmployerCampusOptions } from "@/services/employer";
import { fetchCampuses } from "@/services/campus";
import { getCurrentUser } from "@/services/users";
import { isValidEmail } from "@/lib/utils";
import type { EmployerOnboardingDraft, EmployerWorkPreference } from "@/types/employer";

interface StepContactProps {
  draft: EmployerOnboardingDraft | null;
  onUpdate: (data: Partial<EmployerOnboardingDraft>) => void;
}

export function StepContact({ draft, onUpdate }: StepContactProps) {
  const [campuses, setCampuses] = useState(getEmployerCampusOptions());
  const [emailError, setEmailError] = useState<string | undefined>(undefined);
  const userEmail = getCurrentUser().email;

  // Load real campuses (UUID ids) — the sync cache starts with mock slug ids.
  useEffect(() => {
    let active = true;
    fetchCampuses({ limit: 100 }).then((res) => {
      if (active && !res.error && res.data.length > 0) setCampuses(res.data);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const email = draft?.contact.email;
    if (!email) return;
    if (!isValidEmail(email)) setEmailError("Enter a valid email address.");
    else setEmailError(undefined);
  }, [draft?.contact.email]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Contact & Location</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          How should freelancers reach you, and where are you hiring? This is private and only
          shared with freelancers you engage.
        </p>
      </div>

      <div>
        <label htmlFor="contactEmail" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Contact Email <span className="text-kampmax-error">*</span>
        </label>
        <Input
          id="contactEmail"
          type="email"
          value={draft?.contact.email ?? userEmail ?? ""}
          onChange={(e) => onUpdate({ contact: { ...draft?.contact, email: e.target.value } })}
          placeholder="you@example.com"
          error={emailError}
          required
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Pre-filled from your verified account email where available.
        </p>
      </div>

      <div>
        <label htmlFor="contactPhone" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Phone <span className="text-kampmax-error">*</span>
        </label>
        <Input
          id="contactPhone"
          type="tel"
          value={draft?.contact.phone ?? ""}
          onChange={(e) => onUpdate({ contact: { ...draft?.contact, phone: e.target.value } })}
          placeholder="+234 801 234 5678"
          required
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Used to reach you about your projects. Never shown publicly.
        </p>
      </div>

      <Select
        id="preferredContact"
        label="Preferred Contact Method"
        value={draft?.contact.preferredContact ?? ""}
        onChange={(e) =>
          onUpdate({ contact: { ...draft?.contact, preferredContact: e.target.value } })
        }
        placeholder="Select a method"
      >
        {EMPLOYER_CONTACT_METHODS.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </Select>

      <div className="border-t border-kampmax-border pt-6 space-y-6">
        <div>
          <h3 className="font-semibold text-kampmax-text">Where are you hiring?</h3>
          <p className="text-sm text-kampmax-text-secondary mt-0.5">
            Your primary campus and location.
          </p>
        </div>

        <Select
          id="campusId"
          label="Primary Campus"
          value={draft?.location.campusId ?? ""}
          onChange={(e) => onUpdate({ location: { ...draft?.location, campusId: e.target.value } })}
          placeholder="Select your campus"
        >
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>

        <div className="grid gap-6 sm:grid-cols-2">
          <Input
            id="city"
            label="City"
            value={draft?.location.city ?? ""}
            onChange={(e) => onUpdate({ location: { ...draft?.location, city: e.target.value } })}
            placeholder="e.g., Owo"
            maxLength={60}
          />
          <Input
            id="state"
            label="State"
            value={draft?.location.state ?? ""}
            onChange={(e) => onUpdate({ location: { ...draft?.location, state: e.target.value } })}
            placeholder="e.g., Ondo"
            maxLength={60}
          />
        </div>

        <Select
          id="workPreference"
          label="Work Preference"
          value={draft?.location.workPreference ?? ""}
          onChange={(e) =>
            onUpdate({
              location: {
                ...draft?.location,
                workPreference: e.target.value as EmployerWorkPreference,
              },
            })
          }
          placeholder="How do you prefer to work?"
        >
          {EMPLOYER_WORK_PREFERENCES.map((w) => (
            <option key={w.value} value={w.value}>
              {w.label}
            </option>
          ))}
        </Select>

        <label className="flex items-start gap-3 p-4 rounded-xl border border-kampmax-border cursor-pointer hover:border-primary-200">
          <input
            type="checkbox"
            checked={draft?.location.remoteAvailable ?? false}
            onChange={(e) =>
              onUpdate({ location: { ...draft?.location, remoteAvailable: e.target.checked } })
            }
            className="mt-1 h-4 w-4 accent-primary-600"
          />
          <span>
            <span className="block font-medium text-kampmax-text">Open to remote freelancers</span>
            <span className="block text-sm text-kampmax-text-secondary">
              Allow freelancers to work remotely for your projects.
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
