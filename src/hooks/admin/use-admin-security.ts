"use client";

// ============================================================
// ADMIN SECURITY CENTER HOOKS (Module 51)
// ============================================================
//
// The Security Center is an operational view over the Module 48
// audit-trail service — the prototype's backend-authoritative
// security record. There is deliberately NO separate "security
// events" store: the audit store is the single source of truth and
// this module only re-slices it (severity, security-event subset,
// dates, actors, results). New telemetry domains that do not exist
// (sessions, failed logins, IP/device, risk scores, alerts,
// incidents) are documented in MODULE-51-BACKEND-GAPS.md and are
// never synthesized here.
//
// Keys are neither user- nor campus-scoped: the surface is
// restricted to full operators (SUPER_ADMIN/ADMIN) via nav
// permissions — identical to auditTrail. `gcTime` is kept short so
// sensitive telemetry is not retained in the browser cache, and
// logout already removes `adminKeys.all` (which covers this tree).
// ============================================================

import { useQuery } from "@tanstack/react-query";
import { adminKeys } from "@/lib/query-keys";
import { adminAuditTrailService } from "@/services/admin";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import type { ManagedAuditLogQuery } from "@/types/admin";

const SECURITY_GC_TIME = 60 * 1000;

function useActor() {
  const { admin } = useAdminSession();
  if (!admin) {
    throw new Error("Admin security hooks require an authenticated admin session");
  }
  return admin;
}

/** Platform-wide security posture metrics from the audit store. */
export function useAdminSecurityMetrics() {
  useActor();
  return useQuery({
    queryKey: adminKeys.security.metrics(),
    queryFn: () => adminAuditTrailService.getMetrics(),
    gcTime: SECURITY_GC_TIME,
  });
}

/**
 * Security-relevant events. Pass `securityOnly: true` for the
 * backend-classified security subset (suspensions / deactivations /
 * state resets); without it, returns all privileged admin activity.
 */
export function useAdminSecurityEvents(query?: ManagedAuditLogQuery) {
  useActor();
  return useQuery({
    queryKey: adminKeys.security.events(query ?? {}),
    queryFn: () => adminAuditTrailService.list(query),
    gcTime: SECURITY_GC_TIME,
  });
}