"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ChevronDown,
  User,
  Store,
  Briefcase,
  Wrench,
  Building2,
  Check,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { getVendorDashboardAccessApi } from "@/services/vendor-dashboard";
import { getServiceProviderDashboardAccessApi } from "@/services/service-provider-dashboard";
import { getFreelancerDashboardAccessApi } from "@/services/freelancer-dashboard";
import { getEmployerDashboardAccessApi } from "@/services/employer";

interface ProfileEntry {
  id: "vendor" | "freelancer" | "service" | "employer";
  label: string;
  icon: typeof User;
  active: boolean;
  activeHref: string;
  onboardHref: string;
  onboardLabel: string;
  sub?: string;
  /** Live backend check: does this account already hold this profile? */
  check: () => Promise<{ kind?: string } | null>;
}

/** Access kinds are "no_<vertical>" when the backend has no such profile. */
const hasProfile = (a: { kind?: string } | null | undefined) =>
  !!a?.kind && !String(a.kind).startsWith("no_");

/**
 * Cross-vertical profile switcher shown in every activated dashboard's
 * topbar. Reads the SAME backend-authoritative access checks each
 * dashboard's own route guard uses (getXDashboardAccessApi) — a profile
 * only ever appears as "active" here if the corresponding backend record
 * actually exists, never based on which dashboard the user happens to be
 * viewing.
 */
export function ProfileSwitcher({ onClosed }: { onClosed?: () => void }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { status } = useAuth();
  const [profiles, setProfiles] = useState<ProfileEntry[] | null>(null);
  const [checking, setChecking] = useState<ProfileEntry["id"] | null>(null);
  const [switchError, setSwitchError] = useState<string | null>(null);

  // Re-check the backend on click so a stale list never sends the user to
  // the wrong place: existing profile -> dashboard, none -> onboarding.
  const handleSwitch = async (p: ProfileEntry) => {
    if (checking) return;
    setChecking(p.id);
    setSwitchError(null);
    try {
      const exists = hasProfile(await p.check());
      setProfiles((prev) => prev && prev.map((x) => (x.id === p.id ? { ...x, active: exists } : x)));
      setOpen(false);
      onClosed?.();
      router.push(exists ? p.activeHref : p.onboardHref);
    } catch {
      setSwitchError(`Couldn't check your ${p.label} profile. Please try again.`);
    } finally {
      setChecking(null);
    }
  };

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    Promise.allSettled([
      getVendorDashboardAccessApi(),
      getFreelancerDashboardAccessApi(),
      getServiceProviderDashboardAccessApi(),
      getEmployerDashboardAccessApi(),
    ]).then(([vendor, freelancer, service, employer]) => {
      if (cancelled) return;
      const ok = <T,>(r: PromiseSettledResult<T>) => (r.status === "fulfilled" ? r.value : null);
      const v = ok(vendor) as Awaited<ReturnType<typeof getVendorDashboardAccessApi>> | null;
      const f = ok(freelancer) as Awaited<ReturnType<typeof getFreelancerDashboardAccessApi>> | null;
      const s = ok(service) as Awaited<ReturnType<typeof getServiceProviderDashboardAccessApi>> | null;
      const e = ok(employer) as Awaited<ReturnType<typeof getEmployerDashboardAccessApi>> | null;

      setProfiles([
        {
          id: "vendor",
          label: "Vendor",
          icon: Store,
          active: hasProfile(v),
          activeHref: "/vendor",
          onboardHref: "/onboarding/vendor",
          onboardLabel: "Become a Vendor",
          check: getVendorDashboardAccessApi,
          sub: v?.storeName,
        },
        {
          id: "freelancer",
          label: "Freelancer",
          icon: Briefcase,
          active: hasProfile(f),
          activeHref: "/freelancer/dashboard",
          onboardHref: "/onboarding/freelancer",
          onboardLabel: "Become a Freelancer",
          check: getFreelancerDashboardAccessApi,
        },
        {
          id: "service",
          label: "Service Provider",
          icon: Wrench,
          active: hasProfile(s),
          activeHref: "/service-provider",
          onboardHref: "/onboarding/service-provider",
          onboardLabel: "Offer Services",
          check: getServiceProviderDashboardAccessApi,
          sub: s?.displayName,
        },
        {
          id: "employer",
          label: "Employer",
          icon: Building2,
          active: hasProfile(e),
          activeHref: "/employer/dashboard",
          onboardHref: "/onboarding/employer",
          onboardLabel: "Become an Employer",
          check: getEmployerDashboardAccessApi,
        },
      ]);
    });

    return () => { cancelled = true; };
  }, [status]);

  const currentLabel =
    profiles?.find((p) => p.active && pathname.startsWith(p.activeHref.split("/dashboard")[0]))?.label
    ?? "Customer";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
      >
        <User className="h-4 w-4" aria-hidden />
        <span className="hidden sm:inline">{currentLabel}</span>
        <ChevronDown className="h-4 w-4" aria-hidden />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-kampmax-border bg-white p-2 shadow-xl"
          >
            <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Switch Profile
            </p>

            {profiles === null ? (
              <div className="flex items-center justify-center py-6">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600" />
              </div>
            ) : (
              <div className="space-y-0.5">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    onClosed?.();
                    router.push("/home");
                  }}
                  className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
                >
                  <User className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
                  <span className="flex-1 text-left">Customer</span>
                  {currentLabel === "Customer" && <Check className="h-4 w-4 text-success-600" aria-hidden />}
                </button>

                {profiles.map((p) => {
                  const Icon = p.icon;
                  const isCurrent = currentLabel === p.label;
                  const busy = checking === p.id;

                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="menuitem"
                      disabled={checking !== null}
                      onClick={() => void handleSwitch(p)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm hover:bg-neutral-50 disabled:opacity-60",
                        p.active ? "text-neutral-700" : "text-neutral-500"
                      )}
                    >
                      <Icon
                        className={cn("h-4 w-4 shrink-0", p.active ? "text-neutral-400" : "text-neutral-300")}
                        aria-hidden
                      />
                      <span className="flex-1 text-left truncate">
                        {p.active ? p.sub || p.label : p.onboardLabel}
                      </span>
                      {busy ? (
                        <div className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-primary-600/30 border-t-primary-600" />
                      ) : (
                        isCurrent && <Check className="h-4 w-4 text-success-600 shrink-0" aria-hidden />
                      )}
                    </button>
                  );
                })}
                {switchError && (
                  <p role="alert" className="px-3 py-1.5 text-xs text-red-600">
                    {switchError}
                  </p>
                )}
              </div>
            )}

            <div className="mt-2 border-t border-kampmax-border" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClosed?.();
                router.push("/profile");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <User className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              Account Settings
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onClosed?.();
                router.push("/home");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
            >
              <LogOut className="h-4 w-4 shrink-0 text-neutral-400" aria-hidden />
              Return to Customer Account
            </button>
          </div>
        </>
      )}
    </div>
  );
}
