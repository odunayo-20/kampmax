"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Store as StoreIcon,
  Image as ImageIcon,
  Mail,
  Phone,
  MapPin,
  Clock,
  Truck,
  RotateCcw,
  Loader2,
  Check,
  Upload,
  Trash2,
  Eye,
  Palette,
  MessageSquare,
} from "lucide-react";
import { cn, isValidEmail, isValidPhone } from "@/lib/utils";
import { getCampuses } from "@/services/campus";
import { getCategories } from "@/services/categories";
import {
  fetchMyStoreApi,
  getStore,
  updateStore,
  updateStoreApi,
  uploadBranding,
  removeBranding,
} from "@/services/vendor-dashboard";
import { getVendorAccess } from "@/services/vendor-dashboard";
import {
  STORE_STATUS,
  type VendorStore,
  type StoreStatus,
  type StoreDayMode,
  type StoreHoursDay,
} from "@/types/vendor-dashboard";

export default function StoreManagementPage() {
  const router = useRouter();
  const campuses = getCampuses();
  const categories = getCategories();
  const storeSlug = getVendorAccess().storeSlug;
  const [store, setStore] = useState<VendorStore | null>(() => getStore());

  useEffect(() => {
    let cancelled = false;
    fetchMyStoreApi().then((live) => {
      if (!cancelled && live) {
        setStore(live);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!store) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-kampmax-text-secondary">
          You don't have permission to manage a store.
        </p>
      </div>
    );
  }

  function save(patch: Partial<VendorStore>): boolean {
    updateStoreApi(patch).then((res) => {
      if (res.ok && res.store) {
        setStore(res.store);
      }
    });
    const res = updateStore(patch);
    if (res.ok && res.store) {
      setStore(res.store);
      return true;
    }
    return false;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-kampmax-text">Store Management</h1>
          <p className="mt-0.5 text-sm text-kampmax-text-secondary">
            Manage how your store appears and operates on Kampmax.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/store/${storeSlug ?? "adebayo-gadgets"}`)}
          className="inline-flex items-center gap-1.5 rounded-md border border-kampmax-border bg-white px-3 py-2 text-sm font-medium text-kampmax-text hover:bg-neutral-50"
        >
          <Eye className="h-4 w-4" aria-hidden /> Preview
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Manage columns */}
        <div className="space-y-5">
          <StoreStatusSection store={store} onChange={(s) => { const ok = save({ status: s }); if (!ok) setStore(getStore()); }} />

          <SectionCard id="identity" title="Store identity" icon={<StoreIcon className="h-4 w-4" aria-hidden />}>
            <IdentityEditor store={store} categories={categories} onSave={(patch) => save(patch)} />
          </SectionCard>

          <SectionCard id="branding" title="Branding" icon={<ImageIcon className="h-4 w-4" aria-hidden />}>
            <BrandingEditor store={store} onSave={(patch) => save(patch)} />
          </SectionCard>

          <SectionCard id="contact" title="Contact" icon={<Mail className="h-4 w-4" aria-hidden />}>
            <ContactEditor store={store} onSave={(patch) => save(patch)} />
          </SectionCard>

          <SectionCard id="location" title="Location & Coverage" icon={<MapPin className="h-4 w-4" aria-hidden />}>
            <LocationEditor store={store} campuses={campuses} onSave={(patch) => save(patch)} />
          </SectionCard>

          <SectionCard id="hours" title="Business hours" icon={<Clock className="h-4 w-4" aria-hidden />}>
            <HoursEditor store={store} onSave={(patch) => save(patch)} />
          </SectionCard>

          <SectionCard id="delivery" title="Delivery & pickup" icon={<Truck className="h-4 w-4" aria-hidden />}>
            <DeliveryEditor store={store} campuses={campuses} onSave={(patch) => save(patch)} />
          </SectionCard>

          <SectionCard id="policies" title="Store policies" icon={<RotateCcw className="h-4 w-4" aria-hidden />}>
            <PoliciesEditor store={store} onSave={(patch) => save(patch)} />
          </SectionCard>
        </div>

        {/* Preview column */}
        <StorePreview store={store} campusName={campuses.find((c) => c.id === store.location.primaryCampusId)?.name} />
      </div>
    </div>
  );
}

/* ── Shared bits ─────────────────────────────────────────── */

function SectionCard({
  id,
  title,
  icon,
  children,
}: {
  id?: string;
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-xl border border-kampmax-border bg-white p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-kampmax-text">
        {icon} {title}
      </h2>
      {children}
    </section>
  );
}

function SectionSave({ onSave }: { onSave: (patch: Record<string, unknown>) => boolean }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function handle() {
    setSaving(true);
    setTimeout(() => {
      const ok = onSave({});
      setSaving(false);
      if (ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    }, 400);
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={saving}
      className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700 disabled:opacity-50"
    >
      {saving ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Saving…
        </>
      ) : saved ? (
        <>
          <Check className="h-4 w-4" aria-hidden /> Saved
        </>
      ) : (
        "Save changes"
      )}
    </button>
  );
}

function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-1 block text-xs font-medium text-kampmax-text-secondary">{label}</label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-kampmax-text-muted">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm text-kampmax-text focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500";

/* ── Store status ────────────────────────────────────────── */

const STATUS_OPTIONS: { value: StoreStatus; label: string; desc: string }[] = [
  { value: STORE_STATUS.OPEN, label: "Open", desc: "Customers can browse and order." },
  { value: STORE_STATUS.TEMPORARILY_CLOSED, label: "Temporarily closed", desc: "Browsing stays on, new orders are paused." },
  { value: STORE_STATUS.UNAVAILABLE, label: "Unavailable", desc: "Set by the platform — you can't change this." },
];

function StoreStatusSection({
  store,
  onChange,
}: {
  store: VendorStore;
  onChange: (s: StoreStatus) => void;
}) {
  const current = store.platformSuspended ? STORE_STATUS.UNAVAILABLE : store.status;
  return (
    <SectionCard title="Store status" icon={<StoreIcon className="h-4 w-4" aria-hidden />}>
      <p className="mb-3 text-xs text-kampmax-text-secondary">
        Status changes are validated by the backend. The platform can override this (e.g. a suspension).
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {STATUS_OPTIONS.map((opt) => {
          const disabled = opt.value === STORE_STATUS.UNAVAILABLE || store.platformSuspended;
          const active = current === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={cn(
                "rounded-lg border p-3 text-left transition-colors",
                active ? "border-primary-600 bg-primary-50" : "border-kampmax-border bg-white hover:bg-neutral-50",
                disabled && "cursor-not-allowed opacity-50"
              )}
            >
              <p className={cn("text-sm font-semibold", active ? "text-primary-700" : "text-kampmax-text")}>
                {opt.label}
              </p>
              <p className="mt-0.5 text-[11px] text-kampmax-text-secondary">{opt.desc}</p>
            </button>
          );
        })}
      </div>
      {store.platformSuspended && (
        <p className="mt-3 rounded-lg bg-error-50 px-3 py-2 text-xs text-error-700">
          Your store is currently suspended by the platform. Manage operations through support.
        </p>
      )}
    </SectionCard>
  );
}

/* ── Identity ────────────────────────────────────────────── */

function IdentityEditor({
  store,
  categories,
  onSave,
}: {
  store: VendorStore;
  categories: { id: string; name: string }[];
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [name, setName] = useState(store.identity.storeName);
  const [tagline, setTagline] = useState(store.identity.tagline);
  const [description, setDescription] = useState(store.identity.description);
  const [categoryId, setCategoryId] = useState(store.identity.categoryId);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Store name" hint={name.trim().length < 2 ? "At least 2 characters." : undefined}>
          <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Category">
          <select className={inputCls} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Tagline">
        <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="Short one-liner about your store" />
      </Field>
      <Field label="Description">
        <textarea
          className={cn(inputCls, "resize-none")}
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </Field>
      {error && <p className="text-xs text-error-600">{error}</p>}
      <SectionSave
        onSave={() => {
          if (name.trim().length < 2) {
            setError("Please provide a store name (at least 2 characters).");
            return false;
          }
          setError("");
          return onSave({
            identity: {
              storeName: name.trim(),
              tagline: tagline.trim(),
              description: description.trim(),
              categoryId,
            },
          });
        }}
      />
    </div>
  );
}

/* ── Branding ────────────────────────────────────────────── */

function BrandingEditor({
  store,
  onSave,
}: {
  store: VendorStore;
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [color, setColor] = useState(store.branding.logoPreviewColor ?? "#1769E0");
  const [busy, setBusy] = useState<"logoRef" | "coverRef" | null>(null);
  const [error, setError] = useState("");

  function handleUpload(field: "logoRef" | "coverRef", file?: File) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError("File must be 8MB or smaller.");
      return;
    }
    setError("");
    setBusy(field);
    setTimeout(() => {
      const res = uploadBranding(field, file.name, file.size, file.type, color);
      if (res.ok && res.branding.logoPreviewColor) setColor(res.branding.logoPreviewColor);
      onSave({ branding: res.branding });
      setBusy(null);
    }, 400);
  }

  function handleRemove(field: "logoRef" | "coverRef") {
    const branding = removeBranding(field);
    onSave({ branding });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <BrandSlot
          label="Logo"
          busy={busy === "logoRef"}
          hasImage={Boolean(store.branding.logoRef)}
          previewColor={store.branding.logoPreviewColor ?? color}
          placeholder="Upload logo"
          onSelect={(f) => handleUpload("logoRef", f)}
          onRemove={() => handleRemove("logoRef")}
        />
        <BrandSlot
          label="Cover image"
          busy={busy === "coverRef"}
          hasImage={Boolean(store.branding.coverRef)}
          previewColor={store.branding.logoPreviewColor ?? color}
          placeholder="Upload cover"
          onSelect={(f) => handleUpload("coverRef", f)}
          onRemove={() => handleRemove("coverRef")}
        />
      </div>
      <Field label="Preview colour" hint="Used as a readable placeholder until your brand media load.">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-kampmax-text-muted" aria-hidden />
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); onSave({ branding: { ...store.branding, logoPreviewColor: e.target.value } }); }} className="h-9 w-12 cursor-pointer rounded border border-kampmax-border bg-white p-1" />
          <span className="text-xs text-kampmax-text-muted">{color}</span>
        </div>
      </Field>
      {error && <p className="text-xs text-error-600">{error}</p>}
      <p className="text-[11px] text-kampmax-text-muted">
        Uploads use private, authenticated refs — they are never served from a public URL. Client-side checks are just a first UX line; the backend re-validates every file.
      </p>
    </div>
  );
}

function BrandSlot({
  label,
  busy,
  hasImage,
  previewColor,
  placeholder,
  onSelect,
  onRemove,
}: {
  label: string;
  busy: boolean;
  hasImage: boolean;
  previewColor: string;
  placeholder: string;
  onSelect: (f?: File) => void;
  onRemove: () => void;
}) {
  const [hover, setHover] = useState(false);
  return (
    <div>
      <p className="mb-1 block text-xs font-medium text-kampmax-text-secondary">{label}</p>
      <label
        className={cn(
          "relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-dashed border-kampmax-border-strong transition-colors",
          "cursor-pointer hover:border-primary-500"
        )}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <span
          className="absolute inset-0 opacity-20"
          style={{ backgroundColor: previewColor }}
          aria-hidden
        />
        <span className="relative flex flex-col items-center gap-1 text-kampmax-text-secondary">
          {busy ? (
            <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-hidden />
          ) : (
            <>
              <Upload className="h-5 w-5" aria-hidden />
              <span className="text-xs">{hasImage ? "Replace" : placeholder}</span>
            </>
          )}
        </span>
        <input type="file" accept="image/*" className="sr-only" onChange={(e) => onSelect(e.target.files?.[0])} />
        {hover && hasImage && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onRemove();
            }}
            aria-label={`Remove ${label.toLowerCase()}`}
            className="absolute top-1.5 right-1.5 z-10 rounded-md bg-white p-1 text-error-600 shadow hover:bg-error-50"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </label>
    </div>
  );
}

/* ── Contact ─────────────────────────────────────────────── */

function ContactEditor({
  store,
  onSave,
}: {
  store: VendorStore;
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [email, setEmail] = useState(store.contact.businessEmail);
  const [phone, setPhone] = useState(store.contact.businessPhone);
  const [messaging, setMessaging] = useState(store.contact.messagingAvailable);
  const [error, setError] = useState("");

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business email">
          <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Business phone">
          <input className={inputCls} type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
      </div>
      <label className="flex items-center justify-between rounded-lg border border-kampmax-border p-3">
        <span className="flex items-center gap-2 text-sm text-kampmax-text">
          <MessageSquare className="h-4 w-4 text-kampmax-text-muted" aria-hidden /> In-app messaging
        </span>
        <Toggle checked={messaging} onChange={setMessaging} label="In-app messaging" />
      </label>
      {error && <p className="text-xs text-error-600">{error}</p>}
      <SectionSave
        onSave={() => {
          if (!isValidEmail(email.trim())) {
            setError("Please provide a valid business email.");
            return false;
          }
          if (!isValidPhone(phone.trim())) {
            setError("Please provide a valid phone number.");
            return false;
          }
          setError("");
          return onSave({
            contact: { businessEmail: email.trim(), businessPhone: phone.trim(), messagingAvailable: messaging },
          });
        }}
      />
    </div>
  );
}

/* ── Location ────────────────────────────────────────────── */

function LocationEditor({
  store,
  campuses,
  onSave,
}: {
  store: VendorStore;
  campuses: { id: string; name: string }[];
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [primary, setPrimary] = useState(store.location.primaryCampusId);
  const [supported, setSupported] = useState<string[]>(store.location.supportedCampusIds);
  const [pickup, setPickup] = useState(store.location.pickupLocation);
  const [area, setArea] = useState(store.location.deliveryArea);

  function toggleCampus(id: string) {
    setSupported((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-3">
      <Field label="Primary campus">
        <select className={inputCls} value={primary} onChange={(e) => setPrimary(e.target.value)}>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Supported campuses" hint="Campuses you can serve from this store.">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {campuses.map((c) => (
            <CampusCheck key={c.id} name={c.name} checked={supported.includes(c.id)} onToggle={() => toggleCampus(c.id)} />
          ))}
        </div>
      </Field>

      <Field label="Pickup location">
        <input className={inputCls} value={pickup} onChange={(e) => setPickup(e.target.value)} />
      </Field>
      <Field label="Delivery area">
        <input className={inputCls} value={area} onChange={(e) => setArea(e.target.value)} />
      </Field>

      <SectionSave
        onSave={() =>
          onSave({
            location: {
              primaryCampusId: primary,
              supportedCampusIds: supported,
              pickupLocation: pickup.trim(),
              deliveryArea: area.trim(),
            },
          })
        }
      />
    </div>
  );
}

function CampusCheck({ name, checked, onToggle }: { name: string; checked: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onToggle}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-medium",
        checked ? "border-primary-600 bg-primary-50 text-primary-700" : "border-kampmax-border text-kampmax-text-secondary hover:bg-neutral-50"
      )}
    >
      <span className={cn("flex h-4 w-4 items-center justify-center rounded border", checked ? "border-primary-600 bg-primary-600" : "border-kampmax-border-strong bg-white")}>
        {checked && <Check className="h-3 w-3 text-white" aria-hidden />}
      </span>
      <span className="truncate">{name}</span>
    </button>
  );
}

/* ── Hours ───────────────────────────────────────────────── */

const DAY_OPTIONS: { value: StoreDayMode; label: string }[] = [
  { value: "closed", label: "Closed" },
  { value: "open_24", label: "Open 24h" },
  { value: "custom", label: "Custom hours" },
];

function HoursEditor({
  store,
  onSave,
}: {
  store: VendorStore;
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [hours, setHours] = useState<StoreHoursDay[]>(store.hours);

  function updateDay(dayIndex: number, patch: Partial<StoreHoursDay>) {
    setHours((prev) => prev.map((d) => (d.dayIndex === dayIndex ? { ...d, ...patch } : d)));
  }

  return (
    <div className="space-y-2">
      {hours
        .slice()
        .sort((a, b) => a.dayIndex - b.dayIndex)
        .map((d) => (
          <div key={d.dayIndex} className="grid grid-cols-[90px_1fr] items-center gap-2 rounded-lg border border-kampmax-border px-3 py-2 sm:grid-cols-[90px_140px_110px_110px]">
            <span className="text-xs font-semibold text-kampmax-text">{d.label}</span>
            <select
              className={cn(inputCls, "h-9 py-1")}
              value={d.mode}
              onChange={(e) => updateDay(d.dayIndex, { mode: e.target.value as StoreDayMode })}
            >
              {DAY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            <input
              className={cn(inputCls, "h-9 py-1")}
              type="time"
              value={d.openTime}
              disabled={d.mode !== "custom"}
              onChange={(e) => updateDay(d.dayIndex, { openTime: e.target.value })}
              aria-label={`${d.label} open time`}
            />
            <input
              className={cn(inputCls, "h-9 py-1")}
              type="time"
              value={d.closeTime}
              disabled={d.mode !== "custom"}
              onChange={(e) => updateDay(d.dayIndex, { closeTime: e.target.value })}
              aria-label={`${d.label} close time`}
            />
          </div>
        ))}
      <SectionSave onSave={() => onSave({ hours })} />
    </div>
  );
}

/* ── Delivery & pickup ───────────────────────────────────── */

function DeliveryEditor({
  store,
  campuses,
  onSave,
}: {
  store: VendorStore;
  campuses: { id: string; name: string }[];
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [delivery, setDelivery] = useState(store.delivery);
  const [supported, setSupported] = useState<string[]>(store.delivery.supportedCampusIds);
  const [fee, setFee] = useState(store.delivery.deliveryFee?.toString() ?? "0");

  function patch(p: Partial<typeof delivery>) {
    setDelivery((prev) => ({ ...prev, ...p }));
  }

  function toggleCampus(id: string) {
    setSupported((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-lg border border-kampmax-border p-3">
          <span className="text-sm text-kampmax-text">Delivery available</span>
          <Toggle checked={delivery.deliveryAvailable} onChange={(v) => patch({ deliveryAvailable: v })} label="Delivery available" />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-kampmax-border p-3">
          <span className="text-sm text-kampmax-text">Pickup available</span>
          <Toggle checked={delivery.pickupAvailable} onChange={(v) => patch({ pickupAvailable: v })} label="Pickup available" />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Prep time (minutes)">
          <input
            className={inputCls}
            type="number"
            min={0}
            value={delivery.prepTimeMinutes}
            onChange={(e) => patch({ prepTimeMinutes: Math.max(0, Number(e.target.value) || 0) })}
          />
        </Field>
        <Field label="Delivery fee (₦)">
          <input className={inputCls} type="number" min={0} value={fee} onChange={(e) => setFee(e.target.value)} />
        </Field>
      </div>

      <Field label="Delivery coverage" hint="Campuses you can deliver to.">
        <div className="grid gap-1.5 sm:grid-cols-2">
          {campuses.map((c) => (
            <CampusCheck key={c.id} name={c.name} checked={supported.includes(c.id)} onToggle={() => toggleCampus(c.id)} />
          ))}
        </div>
      </Field>

      <SectionSave
        onSave={() =>
          onSave({
            delivery: { ...delivery, supportedCampusIds: supported, deliveryFee: Math.max(0, Number(fee) || 0) },
          })
        }
      />
    </div>
  );
}

/* ── Policies ────────────────────────────────────────────── */

function PoliciesEditor({
  store,
  onSave,
}: {
  store: VendorStore;
  onSave: (patch: Partial<VendorStore>) => boolean;
}) {
  const [returnPolicy, setReturnPolicy] = useState(store.policies.returnPolicy);
  const [cancellationPolicy, setCancellationPolicy] = useState(store.policies.cancellationPolicy);
  const [deliveryPolicy, setDeliveryPolicy] = useState(store.policies.deliveryPolicy);
  const [pickupPolicy, setPickupPolicy] = useState(store.policies.pickupPolicy);

  return (
    <div className="space-y-3">
      <Field label="Return policy" hint="Customers see this at checkout.">
        <textarea className={cn(inputCls, "resize-none")} rows={2} value={returnPolicy} onChange={(e) => setReturnPolicy(e.target.value)} />
      </Field>
      <Field label="Cancellation policy">
        <textarea className={cn(inputCls, "resize-none")} rows={2} value={cancellationPolicy} onChange={(e) => setCancellationPolicy(e.target.value)} />
      </Field>
      <Field label="Delivery policy">
        <textarea className={cn(inputCls, "resize-none")} rows={2} value={deliveryPolicy} onChange={(e) => setDeliveryPolicy(e.target.value)} />
      </Field>
      <Field label="Pickup policy">
        <textarea className={cn(inputCls, "resize-none")} rows={2} value={pickupPolicy} onChange={(e) => setPickupPolicy(e.target.value)} />
      </Field>
      <SectionSave
        onSave={() =>
          onSave({
            policies: {
              returnPolicy: returnPolicy.trim(),
              cancellationPolicy: cancellationPolicy.trim(),
              deliveryPolicy: deliveryPolicy.trim(),
              pickupPolicy: pickupPolicy.trim(),
            },
          })
        }
      />
    </div>
  );
}

/* ── Preview ─────────────────────────────────────────────── */

function StorePreview({ store, campusName }: { store: VendorStore; campusName?: string }) {
  const primary = campusName ?? store.location.primaryCampusId;
  const openDays = store.hours.filter((d) => d.mode !== "closed").length;
  return (
    <aside className="h-fit lg:sticky lg:top-20">
      <SectionCard title="Store preview" icon={<Eye className="h-4 w-4" aria-hidden />}>
        <div className="overflow-hidden rounded-xl border border-kampmax-border">
          <div
            className="h-20"
            style={{ backgroundColor: store.branding.logoPreviewColor ?? "#1769E0" }}
            aria-hidden
          />
          <div className="-mt-5 px-4 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-kampmax-gold text-base font-bold text-kampmax-navy ring-4 ring-white">
              {store.identity.storeName.charAt(0).toUpperCase()}
            </div>
            <h3 className="mt-2 text-sm font-bold text-kampmax-text">{store.identity.storeName}</h3>
            <p className="text-xs text-kampmax-text-secondary">{store.identity.tagline}</p>
            <StatusPill status={store.status} />
          </div>
        </div>

        <dl className="mt-3 space-y-2 text-xs">
          <PreviewRow icon={MapPin} text={store.location.pickupLocation || "No pickup location set"} />
          <PreviewRow icon={Clock} text={openDays === 0 ? "Closed all week" : `Open ${openDays} day${openDays === 1 ? "" : "s"} a week`} />
          <PreviewRow icon={Truck} text={store.delivery.deliveryAvailable ? `Delivery available · from ${primary}` : "Delivery not offered"} />
          <PreviewRow icon={Mail} text={store.contact.businessEmail} />
          <PreviewRow icon={Phone} text={store.contact.businessPhone} />
        </dl>
      </SectionCard>
    </aside>
  );
}

function StatusPill({ status }: { status: StoreStatus }) {
  const map: Record<StoreStatus, { label: string; cls: string }> = {
    [STORE_STATUS.OPEN]: { label: "Open", cls: "bg-success-50 text-success-700 ring-success-200" },
    [STORE_STATUS.TEMPORARILY_CLOSED]: { label: "Temporarily closed", cls: "bg-warning-50 text-warning-700 ring-warning-200" },
    [STORE_STATUS.UNAVAILABLE]: { label: "Unavailable", cls: "bg-error-50 text-error-700 ring-error-200" },
  };
  const m = map[status];
  return (
    <span className={cn("mt-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1", m.cls)}>
      {m.label}
    </span>
  );
}

function PreviewRow({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-kampmax-text-muted" aria-hidden />
      <span className="text-kampmax-text-secondary">{text}</span>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-5 w-9 rounded-full transition-colors",
        checked ? "bg-primary-600" : "bg-neutral-300"
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all",
          checked ? "left-[18px]" : "left-0.5"
        )}
      />
    </button>
  );
}