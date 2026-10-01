"use client";

import { useState } from "react";
import { ShieldCheck, AlertCircle, ExternalLink } from "lucide-react";
import { CampusSafetyModal } from "./CampusSafetyModal";
import { cn } from "@/lib/utils";

interface CampusSafetyAgreementProps {
  agreed: boolean;
  onChange: (agreed: boolean) => void;
  error?: string;
  className?: string;
}

export function CampusSafetyAgreement({
  agreed,
  onChange,
  error,
  className,
}: CampusSafetyAgreementProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className={cn("space-y-1.5 pt-1", className)}>
      <div className="flex items-start gap-2.5">
        <input
          type="checkbox"
          id="terms-and-safety"
          checked={agreed}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(
            "h-4 w-4 mt-0.5 rounded border-kampmax-border text-kampmax-blue focus:ring-2 focus:ring-kampmax-blue/20 transition-all cursor-pointer",
            error ? "border-kampmax-error" : "border-kampmax-border"
          )}
        />
        <div className="flex-1 text-xs text-kampmax-text-secondary leading-normal">
          <label htmlFor="terms-and-safety" className="cursor-pointer select-none">
            I agree to the{" "}
            <span className="font-semibold text-kampmax-text">Kampmax Terms of Service</span>{" "}
            and uphold the{" "}
          </label>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-semibold text-kampmax-blue hover:text-kampmax-blue-dark inline-flex items-center gap-0.5 hover:underline"
          >
            <ShieldCheck className="h-3 w-3 inline text-emerald-600" />
            Campus Trust & Safety Charter
          </button>
          <span> (safe campus pickups and honest student trading).</span>
        </div>
      </div>

      {error && (
        <p className="text-xs text-kampmax-error flex items-center gap-1 pl-6">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}

      {/* Safety Charter Modal */}
      <CampusSafetyModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onAccept={() => onChange(true)}
      />
    </div>
  );
}
