"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, Package, Zap, RotateCcw, Eye, Banknote, Bell, MessageSquare, Loader2 } from "lucide-react";
import { SettingsToggle, SettingsRow, SettingsGroup } from "@/components/profile/SettingsGroup";
import { getStoreSettings, getStoreSettingsLive, updateStoreSettingsLive } from "@/services/vendor";
import { StoreSettings } from "@/types";

export default function StoreSettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [minOrder, setMinOrder] = useState(() => getStoreSettings().minOrderAmount.toString());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getStoreSettingsLive().then((live) => {
      if (!cancelled) {
        setSettings(live);
        setMinOrder(live.minOrderAmount.toString());
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function update(key: keyof StoreSettings, value: boolean | number) {
    setSettings((s) => ({ ...s, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    const updated = await updateStoreSettingsLive({ ...settings, minOrderAmount: Number(minOrder) || 0 });
    setSettings(updated);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-lg bg-kampmax-muted flex items-center justify-center">
          <ArrowLeft className="h-5 w-5 text-kampmax-text" />
        </button>
        <h1 className="text-xl font-bold text-kampmax-text">Store Settings</h1>
      </div>

      <SettingsGroup title="Order Management">
        <SettingsRow
          icon={<Package className="h-5 w-5 text-kampmax-blue" />}
          label="Accept Orders"
          description="Enable or disable incoming orders"
          action={<SettingsToggle enabled={settings.acceptOrders} onToggle={(v) => update("acceptOrders", v)} />}
        />
        <SettingsRow
          icon={<Zap className="h-5 w-5 text-kampmax-gold" />}
          label="Auto-Confirm Orders"
          description="Automatically confirm new orders"
          action={<SettingsToggle enabled={settings.autoConfirm} onToggle={(v) => update("autoConfirm", v)} />}
        />
        <SettingsRow
          icon={<RotateCcw className="h-5 w-5 text-kampmax-info" />}
          label="Allow Pre-Orders"
          description="Let customers order out-of-stock items"
          action={<SettingsToggle enabled={settings.allowPreOrder} onToggle={(v) => update("allowPreOrder", v)} />}
        />
      </SettingsGroup>

      <SettingsGroup title="Display">
        <SettingsRow
          icon={<Eye className="h-5 w-5 text-kampmax-navy" />}
          label="Show Sold Items"
          description="Display previously sold items on your store"
          action={<SettingsToggle enabled={settings.showSoldItems} onToggle={(v) => update("showSoldItems", v)} />}
        />
        <SettingsRow
          icon={<Banknote className="h-5 w-5 text-kampmax-success" />}
          label="Minimum Order Amount"
          description="Minimum order to place an order (₦)"
          action={
            <input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)}
              className="w-24 px-2 py-1 rounded-lg border border-kampmax-border text-sm text-right focus:outline-none focus:border-kampmax-blue" />
          }
        />
      </SettingsGroup>

      <SettingsGroup title="Notifications">
        <SettingsRow
          icon={<Bell className="h-5 w-5 text-kampmax-gold" />}
          label="Order Notifications"
          description="Get notified when a new order comes in"
          action={<SettingsToggle enabled={settings.notifyOnOrder} onToggle={(v) => update("notifyOnOrder", v)} />}
        />
        <SettingsRow
          icon={<MessageSquare className="h-5 w-5 text-kampmax-blue" />}
          label="Message Notifications"
          description="Get notified about new messages"
          action={<SettingsToggle enabled={settings.notifyOnMessage} onToggle={(v) => update("notifyOnMessage", v)} />}
        />
      </SettingsGroup>

      <div className="bg-kampmax-muted/50 rounded-xl p-4 flex items-start gap-2">
        <Info className="h-4 w-4 text-kampmax-text-secondary flex-shrink-0 mt-0.5" />
        <p className="text-xs text-kampmax-text-secondary leading-relaxed">
          Store settings apply immediately. Disabling order acceptance will prevent new orders but existing orders will still be processed.
        </p>
      </div>

      <button onClick={handleSave}
        className="w-full py-3 rounded-xl bg-kampmax-blue text-white text-sm font-semibold flex items-center justify-center gap-2">
        {saved ? <><Check className="h-4 w-4" /> Saved</> : "Save Settings"}
      </button>
    </div>
  );
}
