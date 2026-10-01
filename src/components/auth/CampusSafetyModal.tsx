"use client";

import { useEffect } from "react";
import {
  ShieldCheck,
  MapPin,
  AlertTriangle,
  Lock,
  Users,
  X,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui";

interface CampusSafetyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export function CampusSafetyModal({
  isOpen,
  onClose,
  onAccept,
}: CampusSafetyModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="safety-modal-title"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-kampmax-border bg-neutral-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="safety-modal-title"
                className="text-base font-bold text-kampmax-text"
              >
                Campus Trust & Safety Charter
              </h2>
              <p className="text-xs text-kampmax-text-secondary">
                Standards for trading and freelancing on Kampmax
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close safety charter"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-kampmax-text-secondary hover:text-kampmax-text hover:bg-neutral-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-sm text-kampmax-text no-scrollbar">
          <div className="rounded-xl border border-kampmax-blue/20 bg-kampmax-blue/5 p-3.5">
            <p className="text-xs text-kampmax-blue font-medium leading-relaxed">
              Kampmax is built exclusively for university and polytechnic communities.
              By joining, you commit to upholding campus safety, honesty, and student integrity.
            </p>
          </div>

          <div className="space-y-3.5">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-kampmax-navy/10 flex items-center justify-center text-kampmax-navy shrink-0 mt-0.5">
                <MapPin className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-kampmax-text text-sm">
                  1. Designated Public Pickup Zones
                </h4>
                <p className="text-xs text-kampmax-text-secondary mt-0.5 leading-relaxed">
                  Always inspect physical items in daylight at high-traffic campus locations
                  (e.g., Student Union Building, Faculty Foyers, University Library square,
                  or campus eateries). Never meet in secluded off-campus spots.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0 mt-0.5">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-kampmax-text text-sm">
                  2. Zero Tolerance for Fraud & Contraband
                </h4>
                <p className="text-xs text-kampmax-text-secondary mt-0.5 leading-relaxed">
                  Selling stolen property, academic dishonesty materials (e.g. exam leaks),
                  prohibited items, or impersonating students results in immediate account
                  ban and escalation to campus security authorities.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-kampmax-text text-sm">
                  3. In-App Escrow Protection
                </h4>
                <p className="text-xs text-kampmax-text-secondary mt-0.5 leading-relaxed">
                  Funds for delivered orders or freelance contracts are safeguarded
                  in escrow until the buyer confirms satisfactory inspection. Never make
                  direct external wire transfers outside Kampmax.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0 mt-0.5">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <h4 className="font-semibold text-kampmax-text text-sm">
                  4. Peer Respect & Code of Conduct
                </h4>
                <p className="text-xs text-kampmax-text-secondary mt-0.5 leading-relaxed">
                  Treat fellow students and vendors with courtesy and fairness. Harassment,
                  hate speech, or spamming the campus feed is strictly prohibited.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-kampmax-border bg-neutral-50 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {onAccept && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                onAccept();
                onClose();
              }}
              className="flex items-center gap-1.5"
            >
              <CheckCircle className="h-4 w-4" />
              I Agree & Understand
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
