"use client";

import { useMemo, useState } from "react";
import { Check, KeyRound } from "lucide-react";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import {
  useChangePassword,
} from "@/hooks/use-employer-settings";
import { validatePasswordPolicy } from "@/services/auth";
import { SettingsSectionHeader, SettingsNote } from "./EmployerSettingsShared";
import { cn } from "@/lib/utils";

const PASSWORD_CHECKS = [
  (p: string) => p.length >= 8,
  (p: string) => /[a-z]/.test(p),
  (p: string) => /[A-Z]/.test(p),
  (p: string) => /\d/.test(p),
  (p: string) => /[^A-Za-z0-9]/.test(p),
];

export function EmployerSecuritySettings() {
  const changePassword = useChangePassword();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  const confirmMismatch =
    confirmPassword.length > 0 && confirmPassword !== newPassword;

  const strength = useMemo(() => {
    if (!newPassword) return 0;
    return PASSWORD_CHECKS.filter((check) => check(newPassword)).length;
  }, [newPassword]);

  const policyHint =
    newPassword.length > 0
      ? validatePasswordPolicy(newPassword) ??
        "Looks good — meets all password requirements."
      : undefined;

  const canSubmit =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    strength === PASSWORD_CHECKS.length &&
    !confirmMismatch;

  const header = (
    <SettingsSectionHeader
      title="Security"
      description="Manage your password and account security preferences."
    />
  );

  async function handleSubmit() {
    setFormError(null);
    setFormSuccess(false);
    const result = await changePassword.mutateAsync({
      currentPassword,
      newPassword,
    });
    if (!result.success) {
      setFormError(result.message);
      return;
    }
    setFormSuccess(true);
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  }

  return (
    <div className="space-y-5">
      {header}

      <SettingsGroup
        title="Password"
        description="Your Kampmax sign-in password."
      >
        <div className="space-y-3 p-4">
          {formSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg bg-success-50 px-3 py-2.5 text-sm font-medium text-success-700"
            >
              <Check className="h-4 w-4" aria-hidden />
              Your password has been updated.
            </div>
          )}
          <PasswordInput
            label="Current password"
            id="current-password"
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
          />
          <div>
            <PasswordInput
              label="New password"
              id="new-password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              hint={policyHint}
            />
            <div
              className="mt-2 flex items-center gap-1.5"
              aria-hidden
              aria-label="Password strength"
            >
              {PASSWORD_CHECKS.map((_, index) => (
                <span
                  key={index}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    index < strength
                      ? strength === PASSWORD_CHECKS.length
                        ? "bg-success-500"
                        : strength >= 3
                          ? "bg-kampmax-gold"
                          : "bg-kampmax-error"
                      : "bg-kampmax-border"
                  )}
                />
              ))}
            </div>
          </div>
          <PasswordInput
            label="Confirm new password"
            id="confirm-password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={confirmMismatch ? "Passwords do not match." : undefined}
          />
          {formError && (
            <p role="alert" className="text-sm text-kampmax-error">
              {formError}
            </p>
          )}
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit || changePassword.isPending}
            className={cn(
              "w-full py-2.5 rounded-lg bg-kampmax-blue text-white text-sm font-semibold transition-colors",
              "hover:bg-kampmax-blue/90 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {changePassword.isPending ? "Updating…" : "Update password"}
          </button>
        </div>
      </SettingsGroup>

      <SettingsNote>
        Your password is verified by the backend and never shown here. After you change it, you stay signed in
        on this device. Two-factor sign-in and device management aren&apos;t available yet.
      </SettingsNote>

      <SettingsGroup title="Account keys">
        <SettingsRow
          icon={<KeyRound className="h-5 w-5" />}
          label="Recovery"
          description="If you lose access, use the sign-in page to request a password reset via email verification."
        />
      </SettingsGroup>
    </div>
  );
}