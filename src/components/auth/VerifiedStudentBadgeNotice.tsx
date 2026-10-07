"use client";

import { ShieldCheck, GraduationCap, CheckCircle2 } from "lucide-react";
import { CampusEmailDetectionResult } from "@/lib/campus-email";
import { cn } from "@/lib/utils";

interface VerifiedStudentBadgeNoticeProps {
  detection: CampusEmailDetectionResult;
  className?: string;
}

export function VerifiedStudentBadgeNotice({
  detection,
  className,
}: VerifiedStudentBadgeNoticeProps) {
  if (!detection.badgeQueued) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200/90 bg-emerald-50/80 p-3 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
          <GraduationCap className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-emerald-950 flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 inline" />
              Verified Student Badge Queued
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-200/70 text-emerald-900">
              @{detection.domain}
            </span>
          </div>

          <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
            {detection.matchedCampus ? (
              <>
                Official campus email recognized.{" "}
                <span className="font-semibold text-emerald-950">
                  {detection.matchedCampus.name}
                </span>{" "}
                has been auto-selected, and an official{" "}
                <span className="font-semibold text-emerald-950">
                  Verified Student
                </span>{" "}
                badge will be activated on your account.
              </>
            ) : (
              <>
                Official academic email recognized. A{" "}
                <span className="font-semibold text-emerald-950">
                  Verified Student
                </span>{" "}
                badge will be queued for your profile upon email verification.
              </>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1 border-t border-emerald-200/60 text-[11px] text-emerald-800">
        <span className="flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-emerald-600" />
          Higher buyer & seller trust
        </span>
        <span className="flex items-center gap-1">
          Campus peer badge
        </span>
      </div>
    </div>
  );
}
