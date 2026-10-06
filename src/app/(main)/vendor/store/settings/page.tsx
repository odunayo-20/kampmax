"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Info, Eye, Banknote, Bell, MessageSquare, Loader2 } from "lucide-react";
import { SettingsToggle, SettingsRow, SettingsGroup } from "@/components/profile/SettingsGroup";
import {
  fetchVendorSettings,
  saveVendorSettings,
  type VendorStoreSettings,
} from "@/services/vendor-settings";
import { getFriendlyErrorMessage } from "@/lib/error-messages";

const SETTINGS_KEY = ["vendor", "settings"] as const;

export default function StoreSettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const query = useQuery({ queryKey: SETTINGS_KEY, queryFn: fetchVendorSettings, retry: false });
  const [draft, setDraft] = useState<VendorStoreSettings | null>(null);
  const [minOrder, setMinOrder] = useState("0");
  const [saved, setSaved] = useState(false);

  // Start editing from what the server has.
  useEffect(() => {
    if (query.data) {
      setDraft(query.data);
      setMinOrder(String(query.data.minOrderAmount));
    }
  }, [query.data]);

  const save = useMutation({
    mutationFn: saveVendorSettings,
    onSuccess: (fresh) => {
      queryClient.setQueryData(SETTINGS_KEY, fresh);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    },
  });

  function update<K extends keyof VendorStoreSettings>(key: K, value: VendorStoreSettings[K]) {
    setDraft((s) => (s ? { ...s, [key]: value } : s));
  }

  const minOrderValue = Number(minOrder);
  const minOrderInvalid = minOrder.trim() === "" || Number.isNaN(minOrderValue) || minOrderValue < 0;

  const header = (
    <div className="flex items-center gap-3">
      <button
        onClick={() => router.back()}
        aria-label="Go back"
        className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center"
      >
        <ArrowLeft className="h-5 w-5 text-kampmax-text" />
      </button>
      <h1 className="text-xl font-bold text-kampmax-text">Store Settings</h1>
    </div>
  );

  if (query.isPending) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {header}
        <div className="flex items-center justify-center gap-2 py-16 text-kampmax-text-secondary">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          <p className="text-sm">Loading your settings…</p>
        </div>
      </div>
    );
  }

  if (query.isError || !draft) {
    return (
      <div className="space-y-4 max-w-2xl mx-auto">
        {header}
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-8 text-center">
          <p className="text-sm text-kampmax-text-secondary">{getFriendlyErrorMessage(query.error)}</p>
          <button
            onClick={() => void query.refetch()}
            className="mt-4 rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {header}

      <SettingsGroup title="Visibility">
        <SettingsRow
          icon={<Eye className="h-5 w-5 text-kampmax-navy" />}
          label="Show my store publicly"
          description="When off, your store and products are hidden from browsing, search and your store page. You can still preview it."
          action={
            <SettingsToggle
              enabled={draft.storefrontVisible}
              onToggle={(v) => update("storefrontVisible", v)}
            />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Orders">
        <SettingsRow
          icon={<Banknote className="h-5 w-5 text-kampmax-success" />}
          label="Minimum order amount"
          description="Checkout won't accept an order from your store below this total (₦). 0 means no minimum."
          action={
            <input
              type="number"
              inputMode="decimal"
              min={0}
              value={minOrder}
              aria-label="Minimum order amount in naira"
              aria-invalid={minOrderInvalid}
              onChange={(e) => {
                setMinOrder(e.target.value);
                if (!Number.isNaN(Number(e.target.value))) update("minOrderAmount", Number(e.target.value));
              }}
              className="w-28 px-2 py-1 rounded-lg border border-kampmax-border text-sm text-right focus:outline-none focus:border-kampmax-blue"
            />
          }
        />
        <div className="px-4 py-3 text-xs text-kampmax-text-secondary">
          To pause new orders, set your store to <strong>Temporarily closed</strong> on{" "}
          <Link href="/vendor/store" className="font-semibold text-kampmax-blue hover:underline">
            Store Management
          </Link>
          .
        </div>
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <SettingsRow
          icon={<Bell className="h-5 w-5 text-kampmax-gold" />}
          label="Store notifications"
          description="New orders, payments, cancellations and store account updates. Alerts about your own purchases aren't affected."
          action={
            <SettingsToggle enabled={draft.notifyOnOrder} onToggle={(v) => update("notifyOnOrder", v)} />
          }
        />
        <SettingsRow
          icon={<MessageSquare className="h-5 w-5 text-kampmax-blue" />}
          label="Message notifications"
          description="New messages from customers"
          action={
            <SettingsToggle enabled={draft.notifyOnMessage} onToggle={(v) => update("notifyOnMessage", v)} />
          }
        />
      </SettingsGroup>

      <div className="bg-kampmax-muted/50 rounded-xl p-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-kampmax-text-secondary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-kampmax-text-secondary leading-relaxed">
          Changes apply as soon as you save. A minimum order doesn&apos;t affect orders that are already placed.
        </p>
      </div>

      {save.isError && (
        <p role="alert" className="text-sm text-kampmax-error">
          {getFriendlyErrorMessage(save.error)}
        </p>
      )}

      <button
        onClick={() => save.mutate({ ...draft, minOrderAmount: minOrderInvalid ? 0 : minOrderValue })}
        disabled={save.isPending || minOrderInvalid}
        className="w-full py-3 rounded-xl bg-kampmax-blue text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {save.isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
          </>
        ) : saved ? (
          <>
            <Check className="h-4 w-4" /> Saved
          </>
        ) : (
          "Save Settings"
        )}
      </button>
    </div>
  );
}
