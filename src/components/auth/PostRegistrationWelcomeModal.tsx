"use client";

import { useState, useRef, useId } from "react";
import {
  Sparkles,
  ShoppingBag,
  Briefcase,
  Calendar,
  Home,
  Camera,
  Check,
  ArrowRight,
  User as UserIcon,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { updateAvatarApi } from "@/services/profile";
import { cn } from "@/lib/utils";

export interface FeedInterestOption {
  id: string;
  title: string;
  icon: typeof ShoppingBag;
  color: string;
  accentBg: string;
  borderActive: string;
}

export const FEED_INTEREST_OPTIONS: FeedInterestOption[] = [
  {
    id: "marketplace",
    title: "Buying & Selling Tech/Books",
    icon: ShoppingBag,
    color: "text-blue-600",
    accentBg: "bg-blue-500/10",
    borderActive: "border-blue-500 bg-blue-50/50 text-blue-950 ring-1 ring-blue-500",
  },
  {
    id: "freelance",
    title: "Offering Freelance Services",
    icon: Briefcase,
    color: "text-amber-600",
    accentBg: "bg-amber-500/10",
    borderActive: "border-amber-500 bg-amber-50/50 text-amber-950 ring-1 ring-amber-500",
  },
  {
    id: "events",
    title: "Campus Events & Deals",
    icon: Calendar,
    color: "text-emerald-600",
    accentBg: "bg-emerald-500/10",
    borderActive: "border-emerald-500 bg-emerald-50/50 text-emerald-950 ring-1 ring-emerald-500",
  },
  {
    id: "roommates",
    title: "Finding Roommates/Hostels",
    icon: Home,
    color: "text-indigo-600",
    accentBg: "bg-indigo-500/10",
    borderActive: "border-indigo-500 bg-indigo-50/50 text-indigo-950 ring-1 ring-indigo-500",
  },
];

export const AVATAR_PRESETS = [
  {
    id: "preset-scholar",
    name: "Scholar",
    bg: "from-blue-600 to-indigo-600",
    emoji: "🎓",
  },
  {
    id: "preset-tech",
    name: "Techie",
    bg: "from-violet-600 to-purple-600",
    emoji: "💻",
  },
  {
    id: "preset-creative",
    name: "Creative",
    bg: "from-amber-500 to-orange-600",
    emoji: "🎨",
  },
  {
    id: "preset-leader",
    name: "Campus Star",
    bg: "from-emerald-500 to-teal-600",
    emoji: "⭐",
  },
  {
    id: "preset-builder",
    name: "Innovator",
    bg: "from-rose-500 to-pink-600",
    emoji: "🚀",
  },
  {
    id: "preset-athlete",
    name: "Sports",
    bg: "from-cyan-500 to-blue-500",
    emoji: "⚽",
  },
];

interface PostRegistrationWelcomeModalProps {
  isOpen: boolean;
  firstName: string;
  onComplete: () => void;
  className?: string;
}

export function PostRegistrationWelcomeModal({
  isOpen,
  firstName,
  onComplete,
  className,
}: PostRegistrationWelcomeModalProps) {
  const [selectedInterests, setSelectedInterests] = useState<string[]>([
    "marketplace",
    "freelance",
  ]);
  const [selectedAvatarPreset, setSelectedAvatarPreset] = useState<string | null>(null);
  const [customAvatarUrl, setCustomAvatarUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputId = useId();

  if (!isOpen) return null;

  function toggleInterest(id: string) {
    setSelectedInterests((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setCustomAvatarUrl(dataUrl);
        setSelectedAvatarPreset(null);
      }
    };
    reader.readAsDataURL(file);
  }

  async function handleFinish() {
    setIsSaving(true);
    try {
      // 1. Save preferences to localStorage for instant personalized feed
      if (
        typeof window !== "undefined" &&
        typeof window.localStorage !== "undefined" &&
        typeof window.localStorage.setItem === "function"
      ) {
        window.localStorage.setItem(
          "kampmax_feed_preferences",
          JSON.stringify(selectedInterests)
        );
        if (customAvatarUrl) {
          window.localStorage.setItem("kampmax_user_avatar", customAvatarUrl);
        } else if (selectedAvatarPreset) {
          window.localStorage.setItem(
            "kampmax_user_avatar_preset",
            selectedAvatarPreset
          );
        }
      }

      // 2. Persist avatar to backend if chosen
      const avatarToPersist = customAvatarUrl || selectedAvatarPreset;
      if (avatarToPersist) {
        try {
          await updateAvatarApi(avatarToPersist);
        } catch {
          // resilient fallback
        }
      }
    } finally {
      setIsSaving(false);
      onComplete();
    }
  }

  const activeAvatarEmoji = selectedAvatarPreset
    ? AVATAR_PRESETS.find((p) => p.id === selectedAvatarPreset)?.emoji
    : null;

  const activeAvatarBg = selectedAvatarPreset
    ? AVATAR_PRESETS.find((p) => p.id === selectedAvatarPreset)?.bg
    : "from-neutral-700 to-neutral-900";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div
        className={cn(
          "relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]",
          className
        )}
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-2 w-full bg-gradient-to-r from-kampmax-blue via-indigo-500 to-emerald-500 shrink-0" />

        <div className="p-6 overflow-y-auto space-y-6 flex-1 no-scrollbar">
          {/* Header */}
          <div className="text-center space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-kampmax-blue/10 text-kampmax-blue text-xs font-bold mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              10-Second Setup
            </div>
            <h2
              id="welcome-modal-title"
              className="text-2xl font-bold text-kampmax-text tracking-tight"
            >
              Welcome to Kampmax, {firstName || "Student"}! 🎉
            </h2>
            <p className="text-xs text-kampmax-text-secondary max-w-sm mx-auto">
              Personalize your homepage feed and setup your campus profile so you only see what matters to you.
            </p>
          </div>

          {/* Section 1: Feed Customizer Pills */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-kampmax-text uppercase tracking-wider">
                What are you most interested in?
              </label>
              <span className="text-[11px] text-kampmax-text-secondary">
                Select 1 or more
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {FEED_INTEREST_OPTIONS.map((item) => {
                const isSelected = selectedInterests.includes(item.id);
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleInterest(item.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer",
                      isSelected
                        ? item.borderActive
                        : "border-kampmax-border bg-neutral-50/50 hover:bg-neutral-50 hover:border-kampmax-border"
                    )}
                  >
                    <div
                      className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                        item.accentBg,
                        item.color
                      )}
                    >
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <span className="text-xs font-semibold flex-1 leading-snug">
                      {item.title}
                    </span>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-kampmax-blue border-kampmax-blue text-white"
                          : "border-kampmax-border bg-white"
                      )}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Direct Avatar Upload / Preset Choice */}
          <div className="space-y-3 pt-2 border-t border-kampmax-border">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-kampmax-text uppercase tracking-wider">
                Choose Profile Avatar
              </label>
              <span className="text-[11px] text-kampmax-text-secondary">
                Upload selfie or pick a preset
              </span>
            </div>

            <div className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50/70 border border-kampmax-border">
              {/* Active Avatar Display */}
              <div className="relative shrink-0">
                {customAvatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={customAvatarUrl}
                    alt="Custom Avatar"
                    className="w-14 h-14 rounded-full object-cover border-2 border-white shadow-md"
                  />
                ) : activeAvatarEmoji ? (
                  <div
                    className={cn(
                      "w-14 h-14 rounded-full flex items-center justify-center text-2xl bg-gradient-to-tr text-white border-2 border-white shadow-md",
                      activeAvatarBg
                    )}
                  >
                    {activeAvatarEmoji}
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-kampmax-blue to-indigo-600 flex items-center justify-center text-white font-bold text-lg border-2 border-white shadow-md">
                    {firstName ? firstName.charAt(0).toUpperCase() : <UserIcon className="h-6 w-6" />}
                  </div>
                )}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center border border-white">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Upload Controls */}
              <div className="flex-1 min-w-0 space-y-1">
                <input
                  ref={fileInputRef}
                  id={avatarInputId}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-kampmax-blue/30 bg-kampmax-blue/5 text-kampmax-blue hover:bg-kampmax-blue/10 text-xs font-semibold transition-colors"
                >
                  <Camera className="h-3.5 w-3.5" />
                  <span>Upload photo or selfie</span>
                </button>
                <p className="text-[11px] text-kampmax-text-secondary truncate">
                  {customAvatarUrl ? "Photo uploaded • Tap presets below to change" : "JPG, PNG or selfie • max 5MB"}
                </p>
              </div>
            </div>

            {/* Avatar Presets Row */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-kampmax-text-secondary">
                Or pick a student persona preset:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                {AVATAR_PRESETS.map((p) => {
                  const isPicked = selectedAvatarPreset === p.id && !customAvatarUrl;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedAvatarPreset(p.id);
                        setCustomAvatarUrl(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all shrink-0 cursor-pointer",
                        isPicked
                          ? "border-kampmax-blue bg-kampmax-blue/10 ring-2 ring-kampmax-blue"
                          : "border-kampmax-border bg-white hover:border-kampmax-border/80"
                      )}
                    >
                      <div
                        className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-lg bg-gradient-to-tr text-white shadow-xs",
                          p.bg
                        )}
                      >
                        {p.emoji}
                      </div>
                      <span className="text-[10px] font-semibold text-kampmax-text truncate max-w-[56px]">
                        {p.name}
                      </span>
                    </button>
                  );
                })}

                {/* Default Initials Option */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAvatarPreset(null);
                    setCustomAvatarUrl(null);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-1.5 rounded-xl border transition-all shrink-0 cursor-pointer",
                    !selectedAvatarPreset && !customAvatarUrl
                      ? "border-kampmax-blue bg-kampmax-blue/10 ring-2 ring-kampmax-blue"
                      : "border-kampmax-border bg-white hover:border-kampmax-border/80"
                  )}
                >
                  <div className="w-10 h-10 rounded-full bg-neutral-200 text-neutral-700 flex items-center justify-center font-bold text-xs shadow-xs">
                    {firstName ? firstName.charAt(0).toUpperCase() : "KM"}
                  </div>
                  <span className="text-[10px] font-semibold text-kampmax-text">
                    Initials
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-neutral-50 border-t border-kampmax-border flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onComplete}
            disabled={isSaving}
            className="text-xs font-semibold text-kampmax-text-secondary hover:text-kampmax-text px-3 py-2 rounded-lg transition-colors"
          >
            Skip for now
          </button>

          <button
            type="button"
            onClick={handleFinish}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-kampmax-blue hover:bg-kampmax-blue-dark text-white text-xs font-bold shadow-sm transition-all"
          >
            <span>{isSaving ? "Saving..." : "Save & Dive In"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
