"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  LogOut,
  PauseCircle,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useDeactivateAccount } from "@/hooks/use-employer-settings";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  SettingsSectionHeader,
  SettingsNote,
} from "./EmployerSettingsShared";

type ConfirmAction = "logout" | "deactivate" | null;

export function EmployerDangerZoneSettings() {
  const { logout } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const deactivateMutate = useDeactivateAccount();

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [deactivated, setDeactivated] = useState(false);

  async function finishSession() {
    await logout();
    queryClient.clear();
  }

  async function handleConfirmLogout() {
    setConfirmAction(null);
    setActionError(null);
    setIsLoggingOut(true);
    await finishSession();
    router.push("/login");
  }

  async function handleConfirmDeactivate() {
    setConfirmAction(null);
    setActionError(null);
    try {
      const result = await deactivateMutate.mutateAsync();
      if (!result.success) {
        setActionError(result.message);
        return;
      }
      await finishSession();
      setDeactivated(true);
      router.push("/login");
    } catch (err) {
      setActionError(getFriendlyErrorMessage(err));
    }
  }

  if (deactivated) {
    return (
      <div className="space-y-5">
        <SettingsSectionHeader
          title="Danger Zone"
          description="Account deactivated"
        />
        <div className="rounded-xl border border-kampmax-border bg-white p-8 text-center">
          <ShieldCheck
            className="mx-auto h-10 w-10 text-kampmax-text-secondary"
            aria-hidden
          />
          <h2 className="mt-3 text-base font-bold text-kampmax-text">
            Your account has been deactivated.
          </h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-kampmax-text-secondary">
            You've been signed out and your employer profile is paused. Contact Kampmax support at support@kampmax.com to reactivate.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Danger Zone"
        description="Account-ending actions. These are permanent or require support to undo."
      />

      <SettingsGroup
        title="Session"
        description="End the current sign-in."
      >
        <SettingsRow
          icon={<LogOut className="h-5 w-5" />}
          label="Log out of this device"
          description="You'll need to sign in again to reach your employer dashboard"
          onClick={() => {
            setActionError(null);
            setConfirmAction("logout");
          }}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Deactivate account"
        description="Pause your account and employer profile."
      >
        <SettingsRow
          icon={<PauseCircle className="h-5 w-5" />}
          label="Deactivate account"
          description="You'll be signed out and your profile paused. Reactivation requires Kampmax support."
          danger
          onClick={() => {
            setActionError(null);
            setConfirmAction("deactivate");
          }}
        />
      </SettingsGroup>

      <SettingsGroup
        title="Delete account"
        description="Permanently remove your account."
      >
        <SettingsRow
          icon={<Trash2 className="h-5 w-5" />}
          label="Close my account"
          description="Checks anything still open, then asks for your password. This can't be undone."
          danger
          onClick={() => router.push("/profile/settings/close-account")}
        />
      </SettingsGroup>

      {actionError && (
        <p role="alert" className="text-sm font-medium text-kampmax-error">
          {actionError}
        </p>
      )}

      <SettingsNote>
        These actions are intentional. Deactivating or deleting is confirmed
        with Kampmax&apos;s backend before anything changes on your account —
        there is no client-only toggle that fakes these actions.
      </SettingsNote>

      <ConfirmDialog
        open={confirmAction === "logout"}
        title="Log out of this device?"
        body="You'll need to sign in again to reach your employer dashboard."
        confirmLabel="Log out"
        pending={isLoggingOut}
        onConfirm={() => void handleConfirmLogout()}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmDialog
        open={confirmAction === "deactivate"}
        title="Deactivate your account?"
        body="Your employer profile will be paused and you'll be signed out. Reactivation requires contacting Kampmax support. Consider how this affects your open jobs and contracts before continuing."
        confirmLabel="Deactivate account"
        destructive
        pending={deactivateMutate.isPending}
        onConfirm={() => void handleConfirmDeactivate()}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}