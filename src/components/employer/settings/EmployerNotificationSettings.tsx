"use client";

import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";
import { SettingsSectionHeader } from "./EmployerSettingsShared";

export function EmployerNotificationSettings() {
  return (
    <div className="space-y-5">
      <SettingsSectionHeader
        title="Notifications"
        description="Choose how Kampmax reaches you about activity on your account."
      />
      <NotificationSettingsPanel />
    </div>
  );
}
