"use client";

import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { NotificationSettingsPanel } from "@/components/settings/NotificationSettingsPanel";

export default function NotificationSettingsPage() {
  return (
    <SettingsPageShell title="Notification Settings">
      <NotificationSettingsPanel />
    </SettingsPageShell>
  );
}
