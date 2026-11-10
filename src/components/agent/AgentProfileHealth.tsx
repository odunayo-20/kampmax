"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAccommodationAgentProfile } from "@/hooks/use-accommodation";

export function AgentProfileHealth() {
  const { data: profile } = useAccommodationAgentProfile(true);

  const hasName = Boolean(profile?.fullName || profile?.agencyName);
  const hasLocation = Boolean(profile?.operatingLocation);
  const hasContact = Boolean(profile?.phone && profile?.email);
  const isApproved = profile?.status === "APPROVED";

  const items = [
    {
      id: "brand",
      label: "Profile and agency branding",
      detail: "Agents with branding earn more trust from students.",
      complete: hasName,
    },
    {
      id: "description",
      label: "Campus location and address",
      detail: "Tell students where your hostels and apartments are located.",
      complete: hasLocation,
    },
    {
      id: "contact",
      label: "Contact details",
      detail: "Add a phone number and verified WhatsApp line.",
      complete: hasContact,
    },
    {
      id: "kyc",
      label: "Verification documents",
      detail: "Upload government ID or student union affiliation.",
      complete: isApproved,
    },
  ];

  const completedCount = items.filter((i) => i.complete).length;
  const score = Math.round((completedCount / items.length) * 100);

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-kampmax-text">Agent Profile Health</h3>

      <div className="mb-3">
        <div className="flex items-end gap-2">
          <span className="text-2xl font-bold text-kampmax-text">{score}</span>
          <span className="mb-0.5 text-xs text-kampmax-text-muted">/ 100</span>
        </div>
        <div
          className="mt-1 h-2 w-full rounded-full bg-neutral-200"
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Agent profile health score"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              score >= 75 ? "bg-success-500" : score >= 50 ? "bg-warning-500" : "bg-error-500"
            )}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            {item.complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success-600" aria-hidden />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-neutral-300" aria-hidden />
            )}
            <div>
              <p className={cn("text-sm", item.complete ? "text-kampmax-text" : "text-kampmax-text-secondary")}>
                {item.label}
              </p>
              <p className="text-xs text-kampmax-text-muted">{item.detail}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

