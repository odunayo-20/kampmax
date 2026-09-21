"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/lib/auth-context";

/**
 * Returns a safe destination after login. Only allows local, non-external
 * paths (prevents open-redirect). Unknown params fall back to /home.
 */
function safeReturnTo(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/home";
  // Only permit known customer-facing paths (storefronts & the service
  // marketplace are public).
  if (raw.startsWith("/store/")) return raw;
  if (raw.startsWith("/services/")) return raw;
  if (
    [
      "/home",
      "/marketplace",
      "/cart",
      "/orders",
      "/notifications",
      "/services",
      "/support",
    ].some((p) => raw === p || raw.startsWith(`${p}/`))
  ) {
    return raw;
  }
  return "/home";
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = safeReturnTo(searchParams.get("returnTo"));
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const newErrors: typeof errors = {};

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const result = await login(email.trim(), password);
      if (result.success) {
        router.push(returnTo);
      } else {
        setErrors({ general: result.message ?? "Login failed." });
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-kampmax-text">Welcome back</h1>
        <p className="text-sm text-kampmax-text-secondary mt-1">
          Sign in to your Kampmax account
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg">
            <p className="text-sm text-kampmax-error">{errors.general}</p>
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          placeholder="you@school.edu.ng"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />

        <PasswordInput
          label="Password"
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-kampmax-border text-kampmax-blue focus:ring-kampmax-blue"
            />
            <span className="text-sm text-kampmax-text-secondary">Remember me</span>
          </label>
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Signing in...
            </span>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-kampmax-text-secondary">
        Don&apos;t have an account?{" "}
        <Link
          href="/register"
          className="font-medium text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
        >
          Create one
        </Link>
      </p>

      <div className="text-center">
        <p className="text-xs text-kampmax-text-secondary/60 mt-2">
          Demo: use any registered email with password &quot;password123&quot;
        </p>
        <p className="text-xs text-kampmax-text-secondary/60">
          e.g. adebayo@rugipo.edu.ng / password123
        </p>
      </div>
    </div>
  );
}
