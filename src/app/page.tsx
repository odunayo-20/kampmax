"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { LogoIcon } from "@/components/ui/Logo";

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

  // Show branded loading screen while determining auth state
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-kampmax-bg">
      <LogoIcon size={48} className="animate-pulse" />
      <div className="h-4 w-4 border-2 border-kampmax-blue/20 border-t-kampmax-blue rounded-full animate-spin" />
    </div>
  );
}
