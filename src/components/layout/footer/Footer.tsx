"use client";

import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { Logo } from "@/components/ui/Logo";

export function Footer() {
  return (
    <footer className="bg-white border-t border-neutral-200/90 mt-8">
      <PageContainer className="py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Logo size="xs" href="/home" />
            <span className="text-neutral-300">•</span>
            <p className="text-xs text-neutral-500">
              © 2026 Kampmax Inc. · Nigeria · ₦ NGN
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs font-medium text-neutral-500">
            <Link href="/support" className="hover:text-primary-600 transition-colors">
              Help & Support
            </Link>
            <Link href="/terms" className="hover:text-primary-600 transition-colors">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-primary-600 transition-colors">
              Privacy Policy
            </Link>
          </div>

          <p className="text-xs text-neutral-400">
            One platform. Endless campus opportunities.
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}