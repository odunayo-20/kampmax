"use client";

import { Suspense, useState, FormEvent, useRef, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const OTP_LENGTH = 6;

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const purpose = searchParams.get("purpose") || "reset";

  const { verifyOtp, resendOtp } = useAuth();

  const [code, setCode] = useState<string[]>(new Array(OTP_LENGTH).fill(""));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    if (resendTimer <= 0) return;
    const timer = setTimeout(() => setResendTimer((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendTimer]);

  const handleChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newCode = [...code];
      newCode[index] = value.slice(-1);
      setCode(newCode);
      setError("");

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }

      if (newCode.every((d) => d !== "")) {
        handleSubmit(newCode.join(""));
      }
    },
    [code]
  );

  const handleKeyDown = useCallback(
    (index: number, key: string) => {
      if (key === "Backspace" && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [code]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
      if (!pasted) return;

      const newCode = [...code];
      for (let i = 0; i < pasted.length; i++) {
        newCode[i] = pasted[i];
      }
      setCode(newCode);

      const nextEmpty = newCode.findIndex((d) => d === "");
      const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();

      if (newCode.every((d) => d !== "")) {
        handleSubmit(newCode.join(""));
      }
    },
    [code]
  );

  async function handleSubmit(otpCode?: string) {
    const codeToVerify = otpCode || code.join("");
    if (codeToVerify.length !== OTP_LENGTH) {
      setError("Please enter the complete 6-digit code.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await verifyOtp(email, codeToVerify);
      if (result.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/reset-password?token=${result.token}`);
        }, 1500);
      } else {
        setError(result.message ?? "Verification failed.");
        setCode(new Array(OTP_LENGTH).fill(""));
        inputRefs.current[0]?.focus();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    try {
      await resendOtp(email);
      setResendTimer(30);
      setCode(new Array(OTP_LENGTH).fill(""));
      inputRefs.current[0]?.focus();
    } catch {
      // silent
    } finally {
      setResending(false);
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
            Code verified!
          </h1>
          <p className="text-sm text-kampmax-text-secondary mt-2">
            Redirecting to reset password...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/forgot-password"
          className="inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <h1 className="text-2xl font-bold text-kampmax-text">
          Enter verification code
        </h1>
        <p className="text-sm text-kampmax-text-secondary mt-1">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-kampmax-text">{email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 bg-kampmax-error/10 border border-kampmax-error/20 rounded-lg">
          <p className="text-sm text-kampmax-error">{error}</p>
        </div>
      )}

      <div className="flex justify-center gap-3">
        {code.map((digit, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e.key)}
            onPaste={i === 0 ? handlePaste : undefined}
            disabled={loading}
            className={cn(
              "w-12 h-14 text-center text-xl font-bold rounded-lg border transition-colors",
              "focus:outline-none focus:ring-1",
              digit
                ? "border-kampmax-blue bg-kampmax-blue/10 text-kampmax-text"
                : "border-kampmax-border bg-white text-kampmax-text",
              error && "border-kampmax-error"
            )}
          />
        ))}
      </div>

      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => handleSubmit()}
        disabled={loading || code.some((d) => d === "")}
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Verifying...
          </span>
        ) : (
          "Verify code"
        )}
      </Button>

      <div className="text-center">
        {resendTimer > 0 ? (
          <p className="text-sm text-kampmax-text-secondary">
            Resend code in{" "}
            <span className="font-medium text-kampmax-text">{resendTimer}s</span>
          </p>
        ) : (
          <button
            onClick={handleResend}
            disabled={resending}
            className="text-sm font-medium text-kampmax-blue hover:text-kampmax-blue-dark transition-colors"
          >
            {resending ? "Sending..." : "Resend code"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 border-2 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  );
}
