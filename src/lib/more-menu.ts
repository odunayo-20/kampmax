/**
 * What the More page lists for this visitor, matching the app. Guests get discovery and help only.
 * The "earn" rows follow what the account holds: a held profile opens its dashboard, a missing one
 * offers setup, and one that is still loading or couldn't be checked shows nothing ("Your Profiles"
 * covers it).
 */

import { MORE_MENU_SECTIONS, type NavSectionConfig } from "@/config/navigation";
import { PROFILE_DEFINITIONS, type ProfileId, type ProfileState } from "@/hooks/use-my-profiles";

/** The setup row in the menu for each profile, and what it becomes once the profile is held. */
const EARN_ROWS: Record<string, { profile: ProfileId; heldLabel: string }> = {
  "become-vendor": { profile: "vendor", heldLabel: "Store dashboard" },
  "become-provider": { profile: "service", heldLabel: "Service provider dashboard" },
  "become-freelancer": { profile: "freelancer", heldLabel: "Freelancer workspace" },
  "hire-talent": { profile: "employer", heldLabel: "Hiring dashboard" },
  "accommodation-agent": { profile: "agent", heldLabel: "Agent page" },
};

export function menuSections(
  signedIn: boolean,
  profiles: Partial<Record<ProfileId, ProfileState>> | undefined
): NavSectionConfig[] {
  if (!signedIn) {
    return MORE_MENU_SECTIONS.flatMap((section) => {
      if (section.id === "discover") return [section];
      if (section.id !== "account") return [];
      return [{ ...section, title: "HELP", items: section.items.filter((i) => i.id === "support") }];
    });
  }
  return MORE_MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.flatMap((item) => {
      const row = EARN_ROWS[item.id];
      if (!row) return [item];
      const state = profiles?.[row.profile];
      if (state?.status === "none") return [item];
      if (state?.status !== "active") return [];
      const held = PROFILE_DEFINITIONS.find((p) => p.id === row.profile)!;
      return [{ ...item, label: row.heldLabel, href: held.activeHref, description: state.sub ?? held.description, badge: "Active" }];
    }),
  }));
}
