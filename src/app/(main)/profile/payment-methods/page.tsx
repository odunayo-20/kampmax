"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { SettingsGroup, SettingsRow } from "@/components/profile/SettingsGroup";

// Kampmax does not store cards. Card payments go through Paystack at checkout,
// and the wallet is the stored balance, so there is nothing here to add or remove.
export default function PaymentMethodsPage() {
  const router = useRouter();

  return (
    <PageContainer className="space-y-4">
      <Breadcrumbs items={[{ label: "Profile", href: "/profile" }, { label: "Payments" }]} />

      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          aria-label="Back"
          className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
        >
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-lg font-bold text-kampmax-text">Payments</h1>
      </div>

      <SettingsGroup title="How you pay">
        <SettingsRow
          icon={<Wallet className="h-5 w-5" />}
          label="Kampmax Wallet"
          description="Pay from your balance, top up, or withdraw to a bank account"
          onClick={() => router.push("/profile/wallet")}
        />
        <SettingsRow
          icon={<CreditCard className="h-5 w-5" />}
          label="Card or bank transfer"
          description="Entered securely with Paystack each time you pay"
        />
      </SettingsGroup>

      <div className="bg-kampmax-muted/50 rounded-xl p-4 flex items-start gap-2">
        <ShieldCheck className="h-4 w-4 text-kampmax-text-secondary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-kampmax-text-secondary leading-relaxed">
          Kampmax never sees or saves your card details, so there are no saved cards to manage.
        </p>
      </div>
    </PageContainer>
  );
}
