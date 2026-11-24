"use client";

import { useRouter } from "next/navigation";
import { Bell, CreditCard, HelpCircle, LocateFixed, Lock, LogOut, MapPin, MonitorSmartphone, Pencil, ShieldCheck } from "lucide-react";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import { DeviceLockRow } from "@/components/settings/DeviceLockRow";
import { useAuth } from "@/lib/auth-context";

export default function SettingsPage() {
  const router = useRouter();
  const { logout } = useAuth();
  const go = (href: string) => () => router.push(href);

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <SettingsPageShell title="Settings">
      <SettingsGroup title="Account">
        <SettingsRow icon={<Pencil className="h-5 w-5" />} label="Edit Profile" description="Name, photo, bio, campus info" onClick={go("/profile/edit")} />
        <SettingsRow icon={<MapPin className="h-5 w-5" />} label="Saved Addresses" description="Where you get things delivered" onClick={go("/profile/addresses")} />
        <SettingsRow icon={<LocateFixed className="h-5 w-5" />} label="My Location" description="Used to show what is near you" onClick={go("/profile/location")} />
        <SettingsRow icon={<ShieldCheck className="h-5 w-5" />} label="Privacy and data" description="Who sees what, and what you can change" onClick={go("/profile/settings/privacy")} />
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <SettingsRow icon={<Bell className="h-5 w-5" />} label="Notification Preferences" description="Manage push, email, and in-app alerts" onClick={go("/profile/settings/notifications")} />
      </SettingsGroup>

      <SettingsGroup title="Security & Payments">
        <SettingsRow icon={<Lock className="h-5 w-5" />} label="Change Password" description="Use a strong password you do not use elsewhere" onClick={go("/profile/settings/security")} />
        <SettingsRow icon={<MonitorSmartphone className="h-5 w-5" />} label="Where you're signed in" description="See your devices and sign any of them out" onClick={go("/profile/settings/sessions")} />
        <SettingsRow icon={<CreditCard className="h-5 w-5" />} label="Payment Methods" description="How you pay on Kampmax" onClick={go("/profile/payment-methods")} />
        <DeviceLockRow />
      </SettingsGroup>

      <SettingsGroup title="Support">
        <SettingsRow icon={<HelpCircle className="h-5 w-5" />} label="Help & Support" description="Questions, the support desk and disputes" onClick={go("/profile/help")} />
      </SettingsGroup>

      <SettingsGroup>
        <SettingsRow icon={<LogOut className="h-5 w-5" />} label="Log Out" description="Sign out of your account" onClick={handleLogout} danger />
      </SettingsGroup>

      <button onClick={go("/profile/settings/close-account")} className="mx-auto block min-h-11 text-sm text-kampmax-text-secondary underline">
        Close my account
      </button>
    </SettingsPageShell>
  );
}
