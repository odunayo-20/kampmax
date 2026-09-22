"use client";

import { Suspense, useState, FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Lock } from "lucide-react";
import { Button } from "@/components/ui";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { useAuth } from "@/lib/auth-context";
import { validatePasswordPolicy } from "@/services/auth";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const { resetPassword } = useAuth();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    const passwordError = validatePasswordPolicy(password);
    if (!password) {
      newErrors.password = "Password is required";
    } else if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
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
      const result = await resetPassword(token, password, confirmPassword);
      if (result.success) {
        setSuccess(true);
      } else {
        setErrors({ general: result.message ?? "Failed to reset password." });
      }
    } catch {
      setErrors({ general: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-kampmax-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-kampmax-success" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">
            Password reset!
          </h1>
          <p className="text-sm text-kampmax-text-secondary mt-2">
            Your password has been updated successfully. You can now sign in
            with your new password.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push("/login")}
        >
          Sign in
        </Button>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">
            Invalid link
          </h1>
          <p className="text-sm text-kampmax-text-secondary mt-2">
            This password reset link is invalid or has expired.
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() => router.push("/forgot-password")}
        >
          Request a new link
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
        <h1 className="text-2xl font-bold text-kampmax-text">
          Reset password
        </h1>
        <p className="text-sm text-kampmax-text-secondary mt-1">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.general && (
          <div className="p-3 bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg">
            <p className="text-sm text-kampmax-error">{errors.general}</p>
          </div>
        )}

        <PasswordInput
          label="New password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="new-password"
        />

        <PasswordInput
          label="Confirm new password"
          placeholder="Re-enter your new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />

        <div className="p-3 bg-kampmax-muted rounded-lg">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 text-kampmax-text-secondary mt-0.5 flex-shrink-0" />
            <p className="text-xs text-kampmax-text-secondary">
              Use at least 8 characters with uppercase, lowercase, a number,
              and a symbol (e.g. !, @, #).
            </p>
          </div>
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
              Resetting password...
            </span>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
