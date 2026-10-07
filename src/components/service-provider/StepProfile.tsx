"use client";

import { useState, useEffect } from "react";
import { Image, Camera, X, Loader2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import type { ServiceProviderOnboardingDraft } from "@/types/service-provider";

interface StepProfileProps {
  draft: ServiceProviderOnboardingDraft | null;
  onUpdate: (data: Partial<ServiceProviderOnboardingDraft>) => void;
}

export function StepProfile({ draft, onUpdate }: StepProfileProps) {
  const { upload, busy, error: uploadError } = useProviderImageUpload();
  const [uploading, setUploading] = useState<"logo" | "coverImage" | null>(null);
  const logoPreview = draft?.profile?.logo || null;
  const coverPreview = draft?.profile?.coverImage || null;

  // Backfill provider display name from the profile for previously saved drafts.
  useEffect(() => {
    if (!draft) return;
    const profileName = draft.profile?.displayName?.trim() ?? "";
    const providerName = draft.provider?.displayName?.trim() ?? "";
    if (profileName && !providerName) {
      onUpdate({ provider: { ...draft.provider, displayName: profileName } });
    }
  }, []);

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: "logo" | "coverImage"
  ) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(field);
    const uploaded = await upload(file, field);
    setUploading(null);
    if (!uploaded) return;
    onUpdate({
      profile:
        field === "logo"
          ? { ...draft?.profile, logo: uploaded.url, logoMediaId: uploaded.mediaId }
          : { ...draft?.profile, coverImage: uploaded.url, coverImageMediaId: uploaded.mediaId },
    });
  };

  const removeImage = (field: "logo" | "coverImage") => {
    onUpdate({
      profile:
        field === "logo"
          ? { ...draft?.profile, logo: null, logoMediaId: null }
          : { ...draft?.profile, coverImage: null, coverImageMediaId: null },
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Your Profile</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          This is what customers will see. Make it professional and inviting.
        </p>
      </div>

      {/* Profile Images */}
      {uploadError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {uploadError}
        </p>
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-kampmax-text mb-3">
            Profile Photo / Logo
          </label>
          <div className="relative">
            <div
              className={cn(
                "aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
                logoPreview ? "border-transparent" : "border-neutral-300"
              )}
            >
              {logoPreview ? (
                <>
                  <img
                    src={logoPreview}
                    alt="Profile preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage("logo")}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Remove profile image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <Camera className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm text-kampmax-text-secondary">Add a photo or logo</p>
                  <p className="text-xs text-neutral-400">Square aspect ratio recommended</p>
                </div>
              )}
              {uploading === "logo" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70" role="status" aria-label="Uploading">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleFileUpload(e, "logo")}
                disabled={busy}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload profile image"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-kampmax-text mb-3">
            Cover Image (Optional)
          </label>
          <div className="relative">
            <div
              className={cn(
                "aspect-video rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
                coverPreview ? "border-transparent" : "border-neutral-300"
              )}
            >
              {coverPreview ? (
                <>
                  <img
                    src={coverPreview}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage("coverImage")}
                    className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                    aria-label="Remove cover image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <Image className="h-10 w-10 text-neutral-300" />
                  <p className="text-sm text-kampmax-text-secondary">Add a cover image</p>
                  <p className="text-xs text-neutral-400">16:9 aspect ratio recommended</p>
                </div>
              )}
              {uploading === "coverImage" && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/70" role="status" aria-label="Uploading">
                  <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => void handleFileUpload(e, "coverImage")}
                disabled={busy}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="Upload cover image"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Display Name */}
      <div>
        <label htmlFor="displayName" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Display Name <span className="text-kampmax-error">*</span>
        </label>
        <Input
          id="displayName"
          value={draft?.profile?.displayName ?? ""}
          onChange={(e) => {
            const name = e.target.value;
            onUpdate({
              profile: { ...draft?.profile, displayName: name },
              provider: { ...draft?.provider, displayName: name },
            });
          }}
          placeholder="e.g., Adebayo Tech Services"
          maxLength={80}
          required
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          This is the name customers will see. 2-80 characters.
        </p>
      </div>

      {/* Tagline */}
      <div>
        <label htmlFor="tagline" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Tagline
        </label>
        <Input
          id="tagline"
          value={draft?.profile?.tagline ?? ""}
          onChange={(e) => onUpdate({ profile: { ...draft?.profile, tagline: e.target.value } })}
          placeholder="e.g., Your campus tech expert"
          maxLength={100}
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          A short, catchy description. Shown under your name. Max 100 characters.
        </p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Bio
        </label>
        <textarea
          id="bio"
          value={draft?.provider?.bio ?? ""}
          onChange={(e) => onUpdate({ provider: { ...draft?.provider, bio: e.target.value } })}
          placeholder="Tell customers about yourself, your experience, and what makes your service special..."
          rows={4}
          className="w-full h-28 px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 resize-y"
          maxLength={500}
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Your professional background, years of experience, and what makes you unique. Max 500 characters.
        </p>
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Service Description
        </label>
        <textarea
          id="description"
          value={draft?.profile?.description ?? ""}
          onChange={(e) => onUpdate({ profile: { ...draft?.profile, description: e.target.value } })}
          placeholder="Describe your services, who you serve, and what makes your service different..."
          rows={5}
          className="w-full h-32 px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 resize-y"
          maxLength={1000}
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Detailed description shown on your public profile. What services do you offer? Who are your ideal customers? Max 1000 characters.
        </p>
      </div>
    </div>
  );
}