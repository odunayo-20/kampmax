"use client";

import { useState } from "react";
import { Camera, X } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { FreelancerOnboardingDraft } from "@/types/freelancer";

interface Props {
  draft: FreelancerOnboardingDraft | null;
  onUpdate: (data: Partial<FreelancerOnboardingDraft>) => void;
}

export function StepProfile({ draft, onUpdate }: Props) {
  const [photoPreview, setPhotoPreview] = useState<string | null>(draft?.profile?.photoUrl ?? null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { alert("Please select an image file"); return; }
    if (file.size > 5 * 1024 * 1024) { alert("Image must be less than 5MB"); return; }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setPhotoPreview(dataUrl);
      onUpdate({ profile: { ...draft?.profile, photoUrl: dataUrl } });
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setPhotoPreview(null);
    onUpdate({ profile: { ...draft?.profile, photoUrl: null } });
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-kampmax-text">Your Profile</h2>
        <p className="mt-1 text-sm text-kampmax-text-secondary">
          This is what clients will see. Make it professional and inviting.
        </p>
      </div>

      {/* Photo */}
      <p role="note" className="rounded-lg border border-warning-200 bg-warning-50 p-3 text-sm text-warning-800">
        Your photo is not saved with your application yet, so you can skip it. It shows only while you are on this page.
      </p>
      <div>
        <label className="block text-sm font-medium text-kampmax-text mb-3">Profile Photo</label>
        <div className="relative w-32">
          <div className={cn(
            "aspect-square rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden",
            photoPreview ? "border-transparent" : "border-neutral-300"
          )}>
            {photoPreview ? (
              <>
                <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={removePhoto}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                  aria-label="Remove photo"
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 text-center p-3">
                <Camera className="h-8 w-8 text-neutral-300" />
                <p className="text-xs text-kampmax-text-secondary">Add a photo</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload profile photo"
            />
          </div>
        </div>
      </div>

      {/* Professional headline */}
      <div>
        <label htmlFor="headline" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Professional Headline <span className="text-red-500">*</span>
        </label>
        <Input
          id="headline"
          value={draft?.profile.headline ?? ""}
          onChange={(e) => onUpdate({ profile: { ...draft?.profile, headline: e.target.value } })}
          placeholder="e.g., Full-Stack Developer | React & Node.js"
          maxLength={100}
          required
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          A short title describing what you do. Shown on your card. Max 100 characters.
        </p>
      </div>

      {/* Bio */}
      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-kampmax-text mb-1.5">
          Bio <span className="text-red-500">*</span>
        </label>
        <textarea
          id="bio"
          value={draft?.profile.bio ?? ""}
          onChange={(e) => onUpdate({ profile: { ...draft?.profile, bio: e.target.value } })}
          placeholder="Tell clients about your experience, what makes you unique, and the kind of work you love doing..."
          rows={4}
          className="w-full h-28 px-3 py-2 text-sm bg-white border border-neutral-200 rounded-lg placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-primary-600/20 focus:border-primary-600 resize-y"
          maxLength={500}
        />
        <p className="mt-1 text-xs text-kampmax-text-secondary">
          Your professional background and what makes you stand out. Max 500 characters.
        </p>
      </div>

      {/* Location */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="block text-sm font-medium text-kampmax-text mb-1.5">City / Campus</label>
          <Input
            id="city"
            value={draft?.profile.city ?? ""}
            onChange={(e) => onUpdate({ profile: { ...draft?.profile, city: e.target.value } })}
            placeholder="e.g., Lagos, UNILAG campus"
            maxLength={60}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-kampmax-text mb-1.5">Remote Available</label>
          <Button
            type="button"
            variant={draft?.profile.remoteAvailable ? "primary" : "outline"}
            className="w-full justify-start"
            onClick={() => onUpdate({ profile: { ...draft?.profile, remoteAvailable: !draft?.profile.remoteAvailable } })}
          >
            {draft?.profile.remoteAvailable ? "Yes — I work remotely" : "No — on-site only"}
          </Button>
        </div>
      </div>
    </div>
  );
}
