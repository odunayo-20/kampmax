"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";

export default function RootPage() {
  const router = useRouter();
  const { status } = useAuth();
  const { hasCompletedOnboarding } = useApp();

  useEffect(() => {
    if (status === "loading") return;

    if (status === "authenticated" || hasCompletedOnboarding) {
      router.replace("/home");
    } else {
      router.replace("/onboarding");
    }
  }, [status, hasCompletedOnboarding, router]);

  // Show nothing while determining auth state
  return (
    <div className="min-h-screen flex items-center justify-center bg-kampmax-bg">
      <div className="h-8 w-8 border-3 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
    </div>
  );
}
