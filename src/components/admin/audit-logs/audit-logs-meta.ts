import {
  Ban,
  BadgeCheck,
  Building2,
  Coins,
  FileClock,
  Landmark,
  LogIn,
  Megaphone,
  Package,
  Pencil,
  RotateCcw,
  Tag,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { BadgeVariant } from "@/components/admin/StatusBadge";
import type {
  ManagedAuditLogEntry,
  ManagedAuditLogResult,
  ManagedAuditLogSeverity,
  ManagedAuditLogSortField,
} from "@/types/admin";

// ------------------------------------------------------------
// ACTIONS — open, real vocabulary (dot-separated backend strings).
// Known actions get a friendly label/icon; anything else is formatted
// generically rather than falling back to a fixed list.
// ------------------------------------------------------------

const KNOWN_ACTION_LABELS: Record<string, string> = {
  "auth.login.succeeded": "Signed in",
  "auth.login.failed": "Failed sign-in attempt",
  "wallet.adjustment": "Adjusted wallet",
  "wallet.freeze": "Froze wallet",
  "wallet.unfreeze": "Unfroze wallet",
  "wallet.adjust": "Adjusted wallet",
  "payout.resolve": "Resolved payout",
  "withdrawal.resolve": "Resolved withdrawal",
  "notification.broadcast": "Sent broadcast notification",
  "order.status.change": "Changed order status",
  "order.status.update": "Updated order status",
  "vendor.verification.update": "Updated vendor verification",
  "campus.create": "Created campus",
  "campus.update": "Updated campus",
  "job.publish": "Published job",
  "job.pause": "Paused job",
  "job.close": "Closed job",
  "taxonomy.category.create": "Created category",
};

export function auditActionLabel(action: string): string {
  const known = KNOWN_ACTION_LABELS[action];
  if (known) return known;
  return action
    .split(/[._]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function actionIconFor(action: string): LucideIcon {
  if (action.startsWith("auth.login")) return LogIn;
  if (action.includes("suspend") || action.includes("deactivat") || action.includes("freeze")) return Ban;
  if (action.includes("wallet")) return Wallet;
  if (action.includes("payout") || action.includes("withdrawal")) return Coins;
  if (action.includes("notification")) return Megaphone;
  if (action.includes("vendor") || action.includes("verification")) return BadgeCheck;
  if (action.includes("campus")) return Landmark;
  if (action.includes("category") || action.includes("taxonomy")) return Tag;
  if (action.includes("order")) return Package;
  if (action.includes("state.reset") || action.includes("restore")) return RotateCcw;
  if (action.includes("employer") || action.includes("freelancer")) return Users;
  if (action.includes("update") || action.includes("change")) return Pencil;
  return FileClock;
}

export function auditActionIcon(action: string): LucideIcon {
  return actionIconFor(action);
}

// ------------------------------------------------------------
// SEVERITY / SECURITY / RESULT — computed server-side; this file only formats them
// ------------------------------------------------------------

const SEVERITY_VARIANT: Record<ManagedAuditLogSeverity, BadgeVariant> = {
  critical: "error",
  high: "warning",
  medium: "info",
  low: "blue",
};

export function auditSeverityVariant(severity: ManagedAuditLogSeverity): BadgeVariant {
  return SEVERITY_VARIANT[severity] ?? "blue";
}

export function auditSeverityLabel(severity: ManagedAuditLogSeverity): string {
  return severity.charAt(0).toUpperCase() + severity.slice(1);
}

export function auditActionVariant(entry: ManagedAuditLogEntry): BadgeVariant {
  return auditSeverityVariant(entry.severity);
}

export const AUDIT_SEVERITY_ORDER: ManagedAuditLogSeverity[] = ["critical", "high", "medium", "low"];

export const AUDIT_RESULT_ORDER: ManagedAuditLogResult[] = ["success", "failed", "denied"];

export const AUDIT_RESULT_LABELS: Record<ManagedAuditLogResult, string> = {
  success: "Success",
  failed: "Failed",
  denied: "Denied",
};

export function auditResultLabel(result: ManagedAuditLogResult): string {
  return AUDIT_RESULT_LABELS[result] ?? result;
}

export function auditResultVariant(result: ManagedAuditLogResult): BadgeVariant {
  switch (result) {
    case "success":
      return "success";
    case "failed":
      return "warning";
    case "denied":
      return "error";
  }
}

export const AUDIT_SORT_OPTIONS: { value: ManagedAuditLogSortField; label: string }[] = [
  { value: "at", label: "Date" },
  { value: "severity", label: "Severity" },
  { value: "action", label: "Action" },
  { value: "actor", label: "Actor" },
  { value: "resource", label: "Resource" },
];

// ------------------------------------------------------------
// RESOURCE — open string; format for display only
// ------------------------------------------------------------

export function auditResourceLabel(resourceType: string): string {
  return resourceType
    .split(/[._]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function auditResourceIcon(resourceType: string): LucideIcon {
  if (resourceType.includes("vendor")) return Building2;
  if (resourceType.includes("wallet")) return Wallet;
  if (resourceType.includes("user")) return Users;
  return Tag;
}

// ------------------------------------------------------------
// HUMAN-READABLE SUMMARY — built only from real, allowlisted-shape fields
// ------------------------------------------------------------

const STATUS_WORDS: Record<string, string> = {
  active: "active",
  suspended: "suspended",
  pending_verification: "pending verification",
  deactivated: "deactivated",
  rejected: "rejected",
  approved: "approved",
  verified: "verified",
  frozen: "frozen",
};

function statusWord(v: unknown): string | null {
  if (typeof v !== "string" || !v.trim()) return null;
  const key = v.toLowerCase();
  return STATUS_WORDS[key] ?? v;
}

/** One-line summary built only from the action label, resource ref and a status-change pair when both previous/new values carry a `status` field. Never dumps a raw JSON blob. */
export function auditEventSummary(entry: ManagedAuditLogEntry): string {
  const action = auditActionLabel(entry.action);
  const target = `${auditResourceLabel(entry.resource.type)} ${entry.resource.id}`;
  let out = `${action} — ${target}`;

  const prevStatus = statusWord((entry.previousValue as { status?: unknown } | null)?.status);
  const nextStatus = statusWord((entry.newValue as { status?: unknown } | null)?.status);
  if (prevStatus && nextStatus) {
    out += ` · ${prevStatus} → ${nextStatus}`;
  }

  const reason =
    (entry.newValue as { reason?: unknown } | null)?.reason ??
    (entry.metadata as { reason?: unknown } | null)?.reason;
  if (typeof reason === "string" && reason.trim()) {
    out += ` · ${reason.length > 120 ? `${reason.slice(0, 117)}…` : reason}`;
  }

  return out;
}

