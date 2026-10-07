"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Key, Info, ChevronRight, Check } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import { useChangePassword } from "@/hooks/use-employer-settings";

export default function SecuritySettingsPage() {
  const router = useRouter();
  const changePassword = useChangePassword();
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function handlePasswordChange() {
    if (!currentPassword || !newPassword || newPassword !== confirmPassword) return;
    setPasswordError(null);
    const result = await changePassword.mutateAsync({
      currentPassword,
      newPassword,
    });
    if (!result.success) {
      setPasswordError(result.message);
      return;
    }
    setPasswordSaved(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowPasswordForm(false);
    setTimeout(() => setPasswordSaved(false), 2000);
  }

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs
        items={[
          { label: "Profile", href: "/profile" },
          { label: "Security Settings" },
        ]}
      />

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">Security Settings</h1>
      </div>

      {/* Password */}
      <SettingsGroup title="Password">
        <SettingsRow
          icon={<Key className="h-5 w-5" />}
          label="Change Password"
          description="Choose a new password for your account"
          action={<ChevronRight className="h-4 w-4 text-kampmax-text-secondary" />}
          onClick={() => setShowPasswordForm(!showPasswordForm)}
        />
        {showPasswordForm && (
          <div className="p-4 space-y-3 bg-kampmax-muted/30">
            <div>
              <label className="block text-xs font-medium text-kampmax-text-secondary mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-kampmax-text-secondary mb-1">
                New Password
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-kampmax-text-secondary mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-kampmax-border text-sm text-kampmax-text focus:outline-none focus:border-kampmax-blue focus:ring-1 focus:ring-kampmax-blue/20"
              />
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-[11px] text-kampmax-error mt-1">Passwords do not match</p>
              )}
              {passwordError && (
                <p role="alert" className="text-[11px] text-kampmax-error mt-1">
                  {passwordError}
                </p>
              )}
            </div>
            <button
              onClick={() => void handlePasswordChange()}
              disabled={!currentPassword || !newPassword || newPassword !== confirmPassword || changePassword.isPending}
              className="w-full py-2.5 rounded-lg bg-kampmax-blue text-white text-sm font-semibold disabled:opacity-40"
            >
              {changePassword.isPending ? "Updating…" : "Update Password"}
            </button>
          </div>
        )}
      </SettingsGroup>

      <div className="bg-kampmax-muted/50 rounded-xl p-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-kampmax-text-secondary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-kampmax-text-secondary leading-relaxed">
          If you suspect unauthorized access, change your password immediately. Two-factor sign-in and device
          management aren&apos;t available yet.
        </p>
      </div>

      {/* Password Saved Toast */}
      {passwordSaved && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-kampmax-navy text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 shadow-lg">
          <Check className="h-4 w-4" />
          Password updated
        </div>
      )}
    </PageContainer>
  );
}
