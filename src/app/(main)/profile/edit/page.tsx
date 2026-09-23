"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Check } from "lucide-react";
import { Avatar } from "@/components/atoms/Avatar";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SettingsGroup } from "@/components/profile/SettingsGroup";
import { useAuth } from "@/lib/auth-context";
import { fetchMyProfile, updateMyProfile } from "@/services/profile";
import type { PrivateUserProfile } from "@/services/profile";

const LEVELS = ["ND1", "ND2", "HND1", "HND2", "Year 1", "Year 2", "Year 3", "Year 4", "Year 5"];

export default function EditProfilePage() {
  const router = useRouter();
  const { user: authUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [level, setLevel] = useState("");

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyProfile().then(({ data, error }) => {
      if (cancelled) return;
      if (!data) {
        setLoadError(error?.message || "We couldn't load your profile. Please try again.");
        setLoading(false);
        return;
      }
      applyProfile(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  function applyProfile(data: PrivateUserProfile) {
    setFirstName(data.firstName ?? "");
    setLastName(data.lastName ?? "");
    setEmail(data.email ?? "");
    setPhone(data.phone ?? "");
    setBio(data.bio ?? "");
    setDepartment(data.department ?? "");
    setLevel(data.level ?? "");
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);
    const { data, error } = await updateMyProfile({
      firstName: firstName.trim() || undefined,
      lastName: lastName.trim() || undefined,
      bio: bio.trim() || undefined,
      department: department.trim() || undefined,
      level: level.trim() || undefined,
    });
    setSaving(false);

    if (!data) {
      setSaveError(error?.message || "We couldn't save your changes. Please try again.");
      return;
    }
    applyProfile(data);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || authUser?.name || "";

  if (loading) {
    return (
      <PageContainer className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-kampmax-blue/20 border-t-kampmax-blue" />
      </PageContainer>
    );
  }

  if (loadError) {
    return (
      <PageContainer className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-kampmax-error">{loadError}</p>
        <button onClick={() => router.refresh()} className="text-sm font-medium text-kampmax-blue hover:underline">
          Try again
        </button>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile" },
          { label: "Edit Profile" },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">Edit Profile</h1>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-kampmax-border p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <Avatar name={displayName} size="lg" className="h-20 w-20 text-2xl" />
            <button className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-kampmax-blue text-white flex items-center justify-center ring-2 ring-white">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <p className="text-xs text-kampmax-text-secondary">
            Tap to change profile photo
          </p>
        </div>
      </div>

      {/* Personal Information */}
      <SettingsGroup title="Personal Information">
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                First Name
              </label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
                Last Name
              </label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                maxLength={100}
                className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border bg-neutral-50 text-sm text-kampmax-text-secondary cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-kampmax-text-secondary">
              Contact support to change your email address.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              disabled
              className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border bg-neutral-50 text-sm text-kampmax-text-secondary cursor-not-allowed"
            />
            <p className="mt-1 text-[11px] text-kampmax-text-secondary">
              Phone number changes require verification and aren't available here yet.
            </p>
          </div>
          <div>
            <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text resize-none focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
              placeholder="Tell people about yourself..."
            />
            <p className="text-[11px] text-kampmax-text-secondary text-right mt-1">
              {bio.length}/500
            </p>
          </div>
        </div>
      </SettingsGroup>

      {/* Academic Information */}
      <SettingsGroup title="Academic Information">
        <div className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
              Department
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              maxLength={100}
              placeholder="e.g. Computer Science"
              className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-kampmax-text-secondary mb-1.5">
              Level
            </label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text bg-white focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
            >
              <option value="">Select level</option>
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
          </div>
        </div>
      </SettingsGroup>

      {saveError && (
        <p className="text-sm text-kampmax-error" role="alert">{saveError}</p>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving || saved}
        className="w-full py-3 rounded-xl bg-kampmax-blue text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-kampmax-blue/90 active:bg-kampmax-blue/80 transition-colors disabled:opacity-60"
      >
        {saving ? (
          <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
        ) : saved ? (
          <>
            <Check className="h-4 w-4" />
            Saved
          </>
        ) : (
          "Save Changes"
        )}
      </button>
    </PageContainer>
  );
}
