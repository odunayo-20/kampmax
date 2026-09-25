"use client";

// ============================================================
// ADMIN LOGIN (Module 34)
//
// Operator sign-in. Credentials are resolved by the admin auth service
// (backend surrogate) - success issues a session token that the admin
// layout guard and every later admin call rely on. The demo credentials
// box is a developer convenience and is clearly labeled. `/admin/login`
// is exempt from the console chrome because the shell guard routes this
// page standalone.
// ============================================================

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { adminAuthService } from "@/services/admin";

function safeReturnTo(value: string | null): string {
  if (!value) return "/admin";
  if (!value.startsWith("/admin")) return "/admin";
  if (value === "/admin/login") return "/admin";
  return value;
}

export function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAdminSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showDemo, setShowDemo] = useState(true);
  const demoAccounts = adminAuthService.getDemoCredentials();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setError(result.message);
        return;
      }
      const returnTo = safeReturnTo(searchParams.get("returnTo"));
      router.push(returnTo);
      router.refresh();
    } catch {
      setError("Unable to reach the auth service. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-kampmax-bg">
      {/* Brand panel */}
      <div className="hidden w-1/2 flex-col justify-between bg-kampmax-navy p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-kampmax-gold text-sm font-black text-kampmax-navy">
            K
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold text-white">Kampmax</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              Operations Console
            </p>
          </div>
        </div>
        <div>
          <p className="max-w-md text-xl font-semibold leading-snug text-white">
            One operations surface for people, commerce and moderation.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-400">
            The admin console is restricted to authenticated platform
            operators. Role permissions are enforced server-side; this page is
            the entry point for that session.
          </p>
        </div>
        <p className="text-[11px] text-slate-500">
          Kampmax operations console
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-10 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex flex-col items-start gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-kampmax-gold text-sm font-black text-kampmax-navy">
              K
            </div>
            <p className="text-lg font-bold text-kampmax-text">Kampmax Admin</p>
          </div>

          <div className="mb-6">
            <h1 className="text-xl font-bold tracking-tight text-kampmax-text">
              Operator sign in
            </h1>
            <p className="mt-1 text-sm text-kampmax-text-secondary">
              Sign in with your platform operator account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="admin-email" required>
                Work email
              </Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-kampmax-text-secondary" />
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  placeholder="you@kampmax.ng"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="admin-password" required>
                Password
              </Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-kampmax-text-secondary" />
                <PasswordInput
                  id="admin-password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            {error && (
              <p
                role="alert"
                className="rounded-md border border-kampmax-error/20 bg-kampmax-error/5 px-3 py-2 text-xs font-medium text-kampmax-error"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-kampmax-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-kampmax-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          {/* Demo credentials: only when the auth service provides any (not with live auth) */}
          {demoAccounts.length === 0 ? (
            <p className="mt-6 text-center text-[11px]">
              <Link href="/" className="font-medium text-kampmax-blue hover:underline">
                Back to storefront
              </Link>
            </p>
          ) : (
          <div className="mt-6 rounded-lg border border-dashed border-kampmax-border bg-white p-4">
            <button
              type="button"
              onClick={() => setShowDemo((s) => !s)}
              className="flex w-full items-center justify-between text-left"
              aria-expanded={showDemo}
            >
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-kampmax-text">
                <ShieldCheck className="h-3.5 w-3.5 text-kampmax-blue" />
                Demo operator accounts
              </span>
              <span className="text-xs text-kampmax-text-secondary">
                {showDemo ? "hide" : "show"}
              </span>
            </button>
            {showDemo && (
              <ul className="mt-3 space-y-2">
                {demoAccounts.map((c) => (
                  <li key={c.email}>
                    <button
                      type="button"
                      onClick={() => {
                        setEmail(c.email);
                        setPassword(c.password);
                        setError(null);
                      }}
                      className="w-full rounded-md border border-kampmax-border px-3 py-2 text-left transition-colors hover:border-kampmax-blue/40 hover:bg-kampmax-muted/40"
                    >
                      <span className="block truncate text-xs font-medium text-kampmax-text">
                        {c.email}
                      </span>
                      <span className="block text-[11px] text-kampmax-text-secondary">
                        {c.roleLabel}
                      </span>
                    </button>
                  </li>
                ))}
                <li className="pt-1">
                  <Link
                    href="/"
                    className="text-[11px] font-medium text-kampmax-blue hover:underline"
                  >
                    Back to storefront
                  </Link>
                </li>
              </ul>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}