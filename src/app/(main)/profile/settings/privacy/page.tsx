"use client";

import { Bell, LocateFixed, MapPin, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { SettingsPageShell } from "@/components/settings/SettingsPageShell";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";
import { PRIVACY_BLOCKS } from "@/lib/account-safety";

/** Who sees what, in plain words, and the settings that change it. */
export default function PrivacyPage() {
  const router = useRouter();
  const go = (href: string) => () => router.push(href);

  return (
    <SettingsPageShell title="Privacy and data" trail={[{ label: "Settings", href: "/profile/settings" }]}>
      {PRIVACY_BLOCKS.map((block) => (
        <section key={block.title} className="space-y-2 rounded-xl border border-kampmax-border bg-white p-4">
          <h2 className="text-sm font-bold text-kampmax-text">{block.title}</h2>
          <ul className="space-y-1.5">
            {block.lines.map((line) => (
              <li key={line} className="flex items-start gap-2.5 text-sm text-kampmax-text-secondary">
                <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-kampmax-blue" aria-hidden />
                {line}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <SettingsGroup title="What you can change">
        <SettingsRow icon={<LocateFixed className="h-5 w-5" />} label="My Location" description="Set it, or remove it" onClick={go("/profile/location")} />
        <SettingsRow icon={<MapPin className="h-5 w-5" />} label="Saved Addresses" description="Delete the ones you no longer use" onClick={go("/profile/addresses")} />
        <SettingsRow icon={<Bell className="h-5 w-5" />} label="Notification Settings" description="Choose which alerts you get" onClick={go("/profile/settings/notifications")} />
        <SettingsRow icon={<Trash2 className="h-5 w-5" />} label="Close my account" description="Remove your access for good" danger onClick={go("/profile/settings/close-account")} />
      </SettingsGroup>
    </SettingsPageShell>
  );
}
