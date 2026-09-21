"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/lib/auth-context";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  function validate(): boolean {
    if (!email.trim()) {
      setError("Email is required");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address");
      return false;
    }
    setError("");
    return true;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError("");

    try {
      const result = await forgotPassword(email.trim());
      if (result.success) {
        setSent(true);
      } else {
        setError(result.message ?? "Failed to send password reset.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-kampmax-success/10 flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8 text-kampmax-success" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-kampmax-text">
            Check your email
          </h1>
          <p className="text-sm text-kampmax-text-secondary mt-2">
            We&apos;ve sent a 6-digit verification code to{" "}
            <span className="font-medium text-kampmax-text">{email}</span>
          </p>
        </div>
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={() =>
            router.push(`/verify-otp?email=${encodeURIComponent(email)}`)
          }
        >
          Enter verification code
        </Button>
        <button
          onClick={() => setSent(false)}
          className="w-full text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors"
        >
          Use a different email
        </button>
        <Link
          href="/login"
          className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>
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
          Forgot password?
        </h1>
        <p className="text-sm text-kampmax-text-secondary mt-1">
          Enter your email and we&apos;ll send you a verification code to
          reset your password.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg">
            <p className="text-sm text-kampmax-error">{error}</p>
          </div>
        )}

        <Input
          label="Email address"
          type="email"
          placeholder="you@school.edu.ng"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          error={error}
          leftIcon={<Mail className="h-4 w-4" />}
          autoComplete="email"
        />

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
              Sending code...
            </span>
          ) : (
            "Send verification code"
          )}
        </Button>
      </form>
    </div>
  );
}
