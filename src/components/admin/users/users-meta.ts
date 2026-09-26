import type { BadgeVariant } from "@/components/admin/StatusBadge";
import {
  ManagedUser,
  ManagedUserStatus,
  UserActivityKind,
} from "@/types/admin";

// ------------------------------------------------------------
// LABELS
// ------------------------------------------------------------

export const USER_ROLE_LABELS: Record<ManagedUser["role"], string> = {
  customer: "Customer",
  vendor: "Vendor",
  moderator: "Moderator",
  support: "Support",
  campus_admin: "Campus Admin",
  admin: "Admin",
  super_admin: "Super Admin",
};

export const USER_STATUS_LABELS: Record<ManagedUserStatus, string> = {
  active: "Active",
  suspended: "Suspended",
  pending_verification: "Pending verification",
  deactivated: "Deactivated",
};

export const USER_ACTIVITY_LABELS: Record<UserActivityKind, string> = {
  order: "Orders",
  auth: "Sign-ins",
  wallet: "Wallet",
  listing: "Listings",
  moderation: "Moderation",
  profile: "Account",
  admin: "Admin actions",
};

export function roleLabel(role: ManagedUser["role"]): string {
  return USER_ROLE_LABELS[role] ?? role;
}

export function statusLabel(status: ManagedUserStatus): string {
  return USER_STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

// ------------------------------------------------------------
// BADGE VARIANTS
// ------------------------------------------------------------

export function userStatusBadgeVariant(status: ManagedUserStatus): BadgeVariant {
  switch (status) {
    case "active":
      return "success";
    case "suspended":
      return "warning";
    case "pending_verification":
      return "info";
    case "deactivated":
      return "neutral";
  }
}

/** Pill styling per platform role (kept distinct from status colors). */
export const ROLE_PILL_STYLES: Record<ManagedUser["role"], string> = {
  customer: "bg-kampmax-muted text-kampmax-text-secondary",
  vendor: "bg-kampmax-gold/15 text-kampmax-gold-dark",
  moderator: "bg-violet-100 text-violet-600",
  support: "bg-kampmax-success/10 text-kampmax-success",
  campus_admin: "bg-kampmax-info/10 text-kampmax-info",
  admin: "bg-kampmax-blue/10 text-kampmax-blue",
  super_admin: "bg-kampmax-navy text-white",
};

// ------------------------------------------------------------
// AVATARS
// ------------------------------------------------------------

const AVATAR_TINTS = [
  "bg-kampmax-blue/15 text-kampmax-blue",
  "bg-kampmax-gold/20 text-kampmax-gold-dark",
  "bg-kampmax-success/10 text-kampmax-success",
  "bg-kampmax-info/10 text-kampmax-info",
  "bg-rose-100 text-rose-600",
  "bg-violet-100 text-violet-600",
];

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function avatarTint(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TINTS[hash % AVATAR_TINTS.length];
}

// ------------------------------------------------------------
// ACTION AVAILABILITY (mirrors future API-side policy)
// ------------------------------------------------------------

export interface UserActionAvailability {
  canSuspend: boolean;
  canActivate: boolean;
  canDeactivate: boolean;
  canResetState: boolean;
}

export function getActionAvailability(user: Pick<ManagedUser, "status" | "reportsCount" | "disputeCount">): UserActionAvailability {
  const { status } = user;
  return {
    canSuspend: status === "active" || status === "pending_verification",
    canActivate: status !== "active",
    canDeactivate: status === "active" || status === "suspended" || status === "pending_verification",
    canResetState:
      status !== "active" || user.reportsCount > 0 || user.disputeCount > 0,
  };
}
