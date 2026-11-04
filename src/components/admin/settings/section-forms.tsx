"use client";

import { useEffect, useState } from "react";
import { Loader2, RotateCcw, Save } from "lucide-react";
import {
  FieldGrid,
  FieldGroup,
  NumberField,
  SelectField,
  TextField,
  ToggleField,
} from "./fields";
import { isValidEmail, isValidPhone } from "@/lib/utils";
import type {
  FinancialSettings,
  GeneralSettings,
  LoyaltySettings,
  MarketplaceSettings,
  NotificationPreferences,
  OrdersSettings,
  OrderCancellationPolicy,
  PayoutSchedule,
  PostingSettings,
  SecuritySettings,
} from "@/types/admin";

// ------------------------------------------------------------
// Shared chrome for every settings section form
// ------------------------------------------------------------

type Errors<T> = Partial<Record<keyof T | string, string>>;

function SectionForm({
  children,
  onSubmit,
  saving,
  errorCount,
  disabled,
}: {
  children: React.ReactNode;
  onSubmit: () => void;
  saving: boolean;
  errorCount: number;
  /** Read-only mode for operators lacking the permission for this section. */
  disabled?: boolean;
}) {
  return (
    <form
      className="space-y-5"
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        if (!disabled) onSubmit();
      }}
    >
      {disabled && (
        <p
          role="note"
          className="rounded-lg border border-kampmax-border bg-kampmax-muted/40 px-3 py-2 text-[11px] leading-snug text-kampmax-text-secondary"
        >
          Read-only for your role - this section stays visible but changes
          require a higher permission tier.
        </p>
      )}

      <fieldset disabled={disabled} className="space-y-5">
        {children}
      </fieldset>

      {errorCount > 0 && (
        <p
          role="alert"
          className="rounded-lg border border-kampmax-error/30 bg-kampmax-error/5 px-3 py-2 text-xs font-medium text-kampmax-error"
        >
          {errorCount} field{errorCount === 1 ? "" : "s"} need attention before
          saving.
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-kampmax-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[11px] leading-snug text-kampmax-text-secondary">
          Mock persistence - values live in memory for this session only.
        </p>
        <button
          type="submit"
          disabled={saving || disabled}
          className="inline-flex h-9 items-center gap-1.5 self-end rounded-md bg-kampmax-blue px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90 disabled:opacity-60 sm:self-auto"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

function ResetButton({
  onReset,
  disabled,
}: {
  onReset: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onReset}
      disabled={disabled}
      title="Reset this section to defaults"
      className="inline-flex h-8 items-center gap-1 rounded-md border border-kampmax-border bg-white px-2.5 text-xs font-medium text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <RotateCcw className="h-3 w-3" aria-hidden />
      Reset defaults
    </button>
  );
}

/** Reports when the local draft diverges from the committed value. */
function useSectionDirty(
  committed: unknown,
  draft: unknown,
  onDirtyChange: ((dirty: boolean) => void) | undefined,
  disabled?: boolean
) {
  useEffect(() => {
    if (disabled) return;
    const dirty = JSON.stringify(committed) !== JSON.stringify(draft);
    onDirtyChange?.(dirty);
  }, [committed, draft, onDirtyChange, disabled]);
}

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function rangeError(
  value: number,
  label: string,
  min: number,
  max: number
): string | undefined {
  if (!Number.isFinite(value)) return `${label} must be a number.`;
  if (value < min || value > max)
    return `${label} must be between ${min.toLocaleString("en-NG")} and ${max.toLocaleString("en-NG")}.`;
  return undefined;
}

// ============================================================
// GENERAL
// ============================================================

export function GeneralSectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: GeneralSettings;
  onSave: (v: GeneralSettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Errors<GeneralSettings>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Errors<GeneralSettings> = {};
    if (!form.platformName.trim()) e.platformName = "Platform name is required.";
    else if (form.platformName.trim().length < 2)
      e.platformName = "Use at least 2 characters.";
    if (form.logoUrl && !/^https?:\/\//i.test(form.logoUrl.trim()))
      e.logoUrl = "Logo must be a http(s) URL.";
    if (!form.supportEmail.trim()) e.supportEmail = "Support email is required.";
    else if (!isValidEmail(form.supportEmail.trim()))
      e.supportEmail = "Enter a valid email address.";
    if (!form.supportPhone.trim())
      e.supportPhone = "Support phone is required.";
    else if (!isValidPhone(form.supportPhone.trim()))
      e.supportPhone = "Enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">General</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <FieldGrid>
        <TextField
          label="Platform name"
          value={form.platformName}
          onChange={(v) => setForm((f) => ({ ...f, platformName: v }))}
          error={errors.platformName}
        />
        <TextField
          label="Logo URL"
          value={form.logoUrl}
          placeholder="https://cdn.kampmax.ng/logo.png"
          onChange={(v) => setForm((f) => ({ ...f, logoUrl: v }))}
          error={errors.logoUrl}
          hint="File upload arrives with real storage - paste a URL for now."
        />
        <TextField
          label="Support email"
          type="email"
          value={form.supportEmail}
          onChange={(v) => setForm((f) => ({ ...f, supportEmail: v }))}
          error={errors.supportEmail}
        />
        <TextField
          label="Support phone"
          type="tel"
          value={form.supportPhone}
          onChange={(v) => setForm((f) => ({ ...f, supportPhone: v }))}
          error={errors.supportPhone}
        />
      </FieldGrid>

      {/* Logo preview */}
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-kampmax-border px-4 py-3">
        {form.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={form.logoUrl}
            alt="Platform logo preview"
            className="h-12 w-12 rounded-lg border border-kampmax-border object-contain"
            onError={(e) => ((e.target as HTMLImageElement).style.opacity = "0.25")}
          />
        ) : (
          <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-kampmax-muted text-sm font-bold text-kampmax-text-secondary">
            {form.platformName.slice(0, 2).toUpperCase() || "?"}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-kampmax-text">Logo preview</p>
          <p className="truncate text-[11px] text-kampmax-text-secondary">
            {form.logoUrl || "No logo URL set - showing initials fallback."}
          </p>
        </div>
      </div>
    </SectionForm>
  );
}

// ============================================================
// MARKETPLACE
// ============================================================

const CANCELLATION_POLICY_OPTIONS: {
  value: OrderCancellationPolicy;
  label: string;
}[] = [
  { value: "anytime_before_delivery", label: "Any time before delivery" },
  { value: "before_dispatch", label: "Only before dispatch" },
  { value: "before_pickup_ready", label: "Only before pickup is ready" },
  { value: "vendor_approval_required", label: "Vendor approval required" },
];

export function MarketplaceSectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: MarketplaceSettings;
  onSave: (v: MarketplaceSettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Errors<MarketplaceSettings>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Errors<MarketplaceSettings> = {};
    const commission = rangeError(num(form.commissionRate), "Commission rate", 0, 30);
    if (commission) e.commissionRate = commission;
    const window = rangeError(
      num(form.cancellation.cancellationWindowHours),
      "Cancellation window",
      1,
      168
    );
    if (window) e.cancellationWindowHours = window;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Marketplace</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <FieldGrid>
        <NumberField
          label="Commission rate"
          value={num(form.commissionRate)}
          suffix="%"
          min={0}
          max={30}
          step={0.5}
          onChange={(v) => setForm((f) => ({ ...f, commissionRate: v }))}
          error={errors.commissionRate}
          hint="Platform cut of every completed order."
        />
      </FieldGrid>

      <FieldGroup title="Approvals" description="Manual review gates before listings and stores go live.">
        <ToggleField
          label="Require product approval"
          hint="New and edited listings wait in review before appearing publicly."
          checked={form.requireProductApproval}
          onChange={(v) => setForm((f) => ({ ...f, requireProductApproval: v }))}
        />
        <ToggleField
          label="Require vendor approval"
          hint="New stores stay pending until an admin verifies their documents."
          checked={form.requireVendorApproval}
          onChange={(v) => setForm((f) => ({ ...f, requireVendorApproval: v }))}
        />
      </FieldGroup>

      <FieldGroup title="Order cancellations" description="When customers may cancel and how requests are handled.">
        <SelectField
          label="Cancellation policy"
          value={form.cancellation.policy}
          options={CANCELLATION_POLICY_OPTIONS}
          onChange={(v) =>
            setForm((f) => ({ ...f, cancellation: { ...f.cancellation, policy: v } }))
          }
        />
        <NumberField
          label="Cancellation window"
          value={num(form.cancellation.cancellationWindowHours)}
          suffix="hours after order placement"
          min={1}
          max={168}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              cancellation: { ...f.cancellation, cancellationWindowHours: v },
            }))
          }
          error={errors.cancellationWindowHours}
        />
        <ToggleField
          label="Auto-approve customer cancellations"
          hint="Skip vendor confirmation while the request falls inside the window."
          checked={form.cancellation.autoApproveCustomerCancellations}
          onChange={(v) =>
            setForm((f) => ({
              ...f,
              cancellation: { ...f.cancellation, autoApproveCustomerCancellations: v },
            }))
          }
        />
      </FieldGroup>
    </SectionForm>
  );
}

// ============================================================
// ORDERS
// ============================================================

export function OrdersSectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: OrdersSettings;
  onSave: (v: OrdersSettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const fee = rangeError(num(form.delivery.deliveryFee), "Delivery fee", 0, 10_000);
    if (fee) e.deliveryFee = fee;
    const threshold = rangeError(
      num(form.delivery.freeDeliveryThreshold),
      "Free delivery threshold",
      0,
      500_000
    );
    if (threshold) e.freeDeliveryThreshold = threshold;
    const hold = rangeError(num(form.pickup.pickupHoldHours), "Pickup hold", 1, 336);
    if (hold) e.pickupHoldHours = hold;
    const accept = rangeError(num(form.timeouts.vendorAcceptMinutes), "Vendor accept timeout", 5, 240);
    if (accept) e.vendorAcceptMinutes = accept;
    const checkout = rangeError(
      num(form.timeouts.customerCheckoutMinutes),
      "Checkout timeout",
      5,
      120
    );
    if (checkout) e.customerCheckoutMinutes = checkout;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Orders</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <FieldGroup title="Delivery" description="Hostel and doorstep delivery behaviour.">
        <ToggleField
          label="Enable hostel delivery"
          hint="Riders drop orders at hostel blocks instead of pickup stations only."
          checked={form.delivery.enableHostelDelivery}
          onChange={(v) => setForm((f) => ({ ...f, delivery: { ...f.delivery, enableHostelDelivery: v } }))}
        />
        <FieldGrid>
          <NumberField
            label="Flat delivery fee"
            value={num(form.delivery.deliveryFee)}
            prefix="₦"
            min={0}
            max={10_000}
            onChange={(v) => setForm((f) => ({ ...f, delivery: { ...f.delivery, deliveryFee: v } }))}
            error={errors.deliveryFee}
          />
          <NumberField
            label="Free delivery threshold"
            value={num(form.delivery.freeDeliveryThreshold)}
            prefix="₦"
            min={0}
            max={500_000}
            step={500}
            onChange={(v) => setForm((f) => ({ ...f, delivery: { ...f.delivery, freeDeliveryThreshold: v } }))}
            error={errors.freeDeliveryThreshold}
            hint="Orders above this total deliver free."
          />
        </FieldGrid>
      </FieldGroup>

      <FieldGroup title="Pickup stations" description="Campus collection points.">
        <ToggleField
          label="Enable pickup stations"
          checked={form.pickup.enablePickupStations}
          onChange={(v) => setForm((f) => ({ ...f, pickup: { ...f.pickup, enablePickupStations: v } }))}
        />
        <NumberField
          label="Pickup hold window"
          value={num(form.pickup.pickupHoldHours)}
          suffix="hours before auto-return"
          min={1}
          max={336}
          onChange={(v) => setForm((f) => ({ ...f, pickup: { ...f.pickup, pickupHoldHours: v } }))}
          error={errors.pickupHoldHours}
        />
      </FieldGroup>

      <FieldGroup title="Timeouts" description="Automatic expiry windows that keep orders moving.">
        <FieldGrid>
          <NumberField
            label="Vendor acceptance timeout"
            value={num(form.timeouts.vendorAcceptMinutes)}
            suffix="minutes to accept"
            min={5}
            max={240}
            onChange={(v) => setForm((f) => ({ ...f, timeouts: { ...f.timeouts, vendorAcceptMinutes: v } }))}
            error={errors.vendorAcceptMinutes}
            hint="Unaccepted orders auto-cancel and refund."
          />
          <NumberField
            label="Customer checkout timeout"
            value={num(form.timeouts.customerCheckoutMinutes)}
            suffix="minutes to pay"
            min={5}
            max={120}
            onChange={(v) => setForm((f) => ({ ...f, timeouts: { ...f.timeouts, customerCheckoutMinutes: v } }))}
            error={errors.customerCheckoutMinutes}
            hint="Carts expire after this window at checkout."
          />
        </FieldGrid>
      </FieldGroup>
    </SectionForm>
  );
}

// ============================================================
// FINANCIAL
// ============================================================

const PAYOUT_SCHEDULE_OPTIONS: { value: PayoutSchedule; label: string }[] = [
  { value: "daily", label: "Daily (9am WAT)" },
  { value: "twice_daily", label: "Twice daily (9am & 3pm WAT)" },
  { value: "weekly", label: "Weekly (Fridays)" },
];

export function FinancialSectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: FinancialSettings;
  onSave: (v: FinancialSettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const fee = rangeError(num(form.platformFeeRate), "Platform fee rate", 0, 30);
    if (fee) e.platformFeeRate = fee;
    const contractFee = rangeError(num(form.freelanceFeeRate), "Freelance fee rate", 0, 30);
    if (contractFee) e.freelanceFeeRate = contractFee;
    const contractMin = rangeError(num(form.freelanceFeeMinimum), "Freelance fee minimum", 0, 10_000);
    if (contractMin) e.freelanceFeeMinimum = contractMin;
    const min = rangeError(
      num(form.withdrawalMinimum),
      "Withdrawal minimum",
      500,
      100_000
    );
    if (min) e.withdrawalMinimum = min;
    const wFee = rangeError(num(form.withdrawalFee), "Withdrawal fee", 0, 5_000);
    if (wFee) e.withdrawalFee = wFee;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Financial</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <FieldGrid>
        <NumberField
          label="Platform fee rate"
          value={num(form.platformFeeRate)}
          suffix="%"
          min={0}
          max={30}
          step={0.5}
          onChange={(v) => setForm((f) => ({ ...f, platformFeeRate: v }))}
          error={errors.platformFeeRate}
        />
        <NumberField
          label="Freelance fee rate"
          value={num(form.freelanceFeeRate)}
          suffix="%"
          min={0}
          max={30}
          step={0.5}
          hint="Taken from the freelancer's payout on contracts made from now on. 0 charges nothing. Contracts already made keep their rate."
          onChange={(v) => setForm((f) => ({ ...f, freelanceFeeRate: v }))}
          error={errors.freelanceFeeRate}
        />
        <NumberField
          label="Freelance fee minimum"
          value={num(form.freelanceFeeMinimum)}
          prefix="₦"
          min={0}
          max={10_000}
          step={10}
          hint="The least charged on a payment once a rate is set (never more than the payment)."
          onChange={(v) => setForm((f) => ({ ...f, freelanceFeeMinimum: v }))}
          error={errors.freelanceFeeMinimum}
        />
        <NumberField
          label="Withdrawal minimum"
          value={num(form.withdrawalMinimum)}
          prefix="₦"
          min={500}
          max={100_000}
          step={500}
          onChange={(v) => setForm((f) => ({ ...f, withdrawalMinimum: v }))}
          error={errors.withdrawalMinimum}
        />
        <NumberField
          label="Withdrawal fee"
          value={num(form.withdrawalFee)}
          prefix="₦"
          min={0}
          max={5_000}
          onChange={(v) => setForm((f) => ({ ...f, withdrawalFee: v }))}
          error={errors.withdrawalFee}
        />
        <SelectField
          label="Payout schedule"
          value={form.payoutSchedule}
          options={PAYOUT_SCHEDULE_OPTIONS}
          onChange={(v) => setForm((f) => ({ ...f, payoutSchedule: v }))}
        />
      </FieldGrid>

      <ToggleField
        label="Require BVN for payouts"
        hint="Vendors must verify a bank verification number before withdrawing."
        checked={form.requireBvnForPayouts}
        onChange={(v) => setForm((f) => ({ ...f, requireBvnForPayouts: v }))}
      />

      <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50/60 px-3 py-2.5 text-[11px] leading-snug text-amber-800">
        Changing fees affects future orders only - existing balances and
        in-flight payouts settle under the rates they were created with.
      </p>
    </SectionForm>
  );
}

// ============================================================
// POSTING FEES
// ============================================================

export function PostingsSectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: PostingSettings;
  onSave: (v: PostingSettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    for (const [key, label] of [
      ["internshipFee", "Internship fee"],
      ["partTimeFee", "Part-time fee"],
      ["fullTimeFee", "Full-time fee"],
      ["contractFee", "Contract fee"],
    ] as const) {
      const err = rangeError(num(form[key]), label, 0, 1_000_000);
      if (err) e[key] = err;
    }
    for (const [key, label] of [
      ["unpaidInternshipDiscountPercent", "Unpaid internship discount"],
      ["renewalDiscountPercent", "Renewal discount"],
    ] as const) {
      const err = rangeError(num(form[key]), label, 0, 100);
      if (err) e[key] = err;
    }
    const free = rangeError(num(form.freeAllowance), "Free postings", 0, 20);
    if (free) e.freeAllowance = free;
    else if (!Number.isInteger(num(form.freeAllowance)))
      e.freeAllowance = "Free postings must be a whole number.";
    const days = rangeError(num(form.liveDays), "Live days", 1, 365);
    if (days) e.liveDays = days;
    else if (!Number.isInteger(num(form.liveDays)))
      e.liveDays = "Live days must be a whole number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Posting fees</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>
      <p className="text-xs text-kampmax-text-secondary">
        What an employer pays to publish a vacancy or internship. Gigs are always free. A fee of 0
        makes that type free to post: nothing is charged and no free posting is used. Employers see
        the price before anything is taken from their wallet.
      </p>

      <FieldGrid>
        <NumberField
          label="Internship fee"
          value={num(form.internshipFee)}
          prefix="₦"
          min={0}
          max={1_000_000}
          step={500}
          onChange={(v) => setForm((f) => ({ ...f, internshipFee: v }))}
          error={errors.internshipFee}
        />
        <NumberField
          label="Part-time fee"
          value={num(form.partTimeFee)}
          prefix="₦"
          min={0}
          max={1_000_000}
          step={500}
          onChange={(v) => setForm((f) => ({ ...f, partTimeFee: v }))}
          error={errors.partTimeFee}
        />
        <NumberField
          label="Full-time fee"
          value={num(form.fullTimeFee)}
          prefix="₦"
          min={0}
          max={1_000_000}
          step={500}
          onChange={(v) => setForm((f) => ({ ...f, fullTimeFee: v }))}
          error={errors.fullTimeFee}
        />
        <NumberField
          label="Contract fee"
          value={num(form.contractFee)}
          prefix="₦"
          min={0}
          max={1_000_000}
          step={500}
          onChange={(v) => setForm((f) => ({ ...f, contractFee: v }))}
          error={errors.contractFee}
        />
        <NumberField
          label="Unpaid internship discount"
          value={num(form.unpaidInternshipDiscountPercent)}
          suffix="% off the internship fee"
          min={0}
          max={100}
          step={5}
          onChange={(v) => setForm((f) => ({ ...f, unpaidInternshipDiscountPercent: v }))}
          error={errors.unpaidInternshipDiscountPercent}
        />
        <NumberField
          label="Renewal discount"
          value={num(form.renewalDiscountPercent)}
          suffix="% off the posting fee"
          min={0}
          max={100}
          step={5}
          onChange={(v) => setForm((f) => ({ ...f, renewalDiscountPercent: v }))}
          error={errors.renewalDiscountPercent}
          hint="Paid to put an expired posting live again."
        />
        <NumberField
          label="Free postings"
          value={num(form.freeAllowance)}
          suffix="per verified employer"
          min={0}
          max={20}
          step={1}
          onChange={(v) => setForm((f) => ({ ...f, freeAllowance: v }))}
          error={errors.freeAllowance}
          hint="Counted across all paid types. Given back if a posting is rejected."
        />
        <NumberField
          label="Live period"
          value={num(form.liveDays)}
          suffix="days"
          min={1}
          max={365}
          step={1}
          onChange={(v) => setForm((f) => ({ ...f, liveDays: v }))}
          error={errors.liveDays}
          hint="Applies to postings published from now on."
        />
      </FieldGrid>
    </SectionForm>
  );
}

// ============================================================
// LOYALTY
// ============================================================

export function LoyaltySectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: LoyaltySettings;
  onSave: (v: LoyaltySettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const earn = rangeError(num(form.pointsPerNaira), "Points earning rate", 0, 10);
    if (earn) e.pointsPerNaira = earn;
    const redeem = rangeError(
      num(form.maxRedemptionPercent),
      "Maximum redemption",
      0,
      100
    );
    if (redeem) e.maxRedemptionPercent = redeem;
    const exp = rangeError(
      num(form.pointsExpirationDays),
      "Points expiration",
      30,
      1095
    );
    if (exp) e.pointsExpirationDays = exp;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Loyalty</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <ToggleField
        label="Enable loyalty programme"
        hint="Students earn Kampmax points on every completed order."
        checked={form.enabled}
        onChange={(v) => setForm((f) => ({ ...f, enabled: v }))}
      />

      <FieldGrid>
        <NumberField
          label="Points earning rate"
          value={num(form.pointsPerNaira)}
          suffix="points per ₦1 spent"
          min={0}
          max={10}
          onChange={(v) => setForm((f) => ({ ...f, pointsPerNaira: v }))}
          error={errors.pointsPerNaira}
        />
        <NumberField
          label="Maximum redemption"
          value={num(form.maxRedemptionPercent)}
          suffix="% of order total"
          min={0}
          max={100}
          step={5}
          onChange={(v) => setForm((f) => ({ ...f, maxRedemptionPercent: v }))}
          error={errors.maxRedemptionPercent}
          hint="Caps how much of an order points can cover."
        />
        <NumberField
          label="Points expiration"
          value={num(form.pointsExpirationDays)}
          suffix="days after earning"
          min={30}
          max={1095}
          step={30}
          onChange={(v) => setForm((f) => ({ ...f, pointsExpirationDays: v }))}
          error={errors.pointsExpirationDays}
        />
      </FieldGrid>

      {!form.enabled && (
        <p className="rounded-lg border border-dashed border-kampmax-border px-3 py-2.5 text-[11px] leading-snug text-kampmax-text-secondary">
          The programme is off - students stop earning new points immediately,
          but existing balances keep their original expiry dates.
        </p>
      )}
    </SectionForm>
  );
}

// ============================================================
// NOTIFICATIONS (admin preferences)
// ============================================================

export function NotificationsSectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: NotificationPreferences;
  onSave: (v: NotificationPreferences) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  async function handleSave() {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  const items: {
    key: keyof NotificationPreferences;
    label: string;
    hint: string;
  }[] = [
    {
      key: "orderAlerts",
      label: "Order alerts",
      hint: "Notify admins when orders fail, stall or are cancelled.",
    },
    {
      key: "paymentFailureAlerts",
      label: "Payment failure alerts",
      hint: "Immediate ping when Paystack reports failed charges.",
    },
    {
      key: "disputeEscalations",
      label: "Dispute escalations",
      hint: "Escalated cases page the senior operations rota.",
    },
    {
      key: "newVendorSignups",
      label: "New vendor signups",
      hint: "Heads-up whenever a store submits verification documents.",
    },
    {
      key: "weeklyDigestEmail",
      label: "Weekly digest email",
      hint: "Monday morning summary of GMV, signups and open queues.",
    },
    {
      key: "securityAlerts",
      label: "Security alerts",
      hint: "Suspicious admin logins and permission changes.",
    },
  ];

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={0} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">
          Notification preferences
        </h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <p className="-mt-2 text-[11px] leading-snug text-kampmax-text-secondary">
        Controls which platform events reach the admin team. Student-facing
        broadcasts are managed separately under Notifications in the sidebar.
      </p>

      <div className="divide-y divide-kampmax-border rounded-lg border border-kampmax-border px-4 py-2">
        {items.map((item) => (
          <ToggleField
            key={item.key}
            label={item.label}
            hint={item.hint}
            checked={form[item.key]}
            onChange={(v) => setForm((f) => ({ ...f, [item.key]: v }))}
          />
        ))}
      </div>
    </SectionForm>
  );
}

// ============================================================
// SECURITY
// ============================================================

export function SecuritySectionForm({
  value,
  onSave,
  onReset,
  disabled,
  onDirtyChange,
}: {
  value: SecuritySettings;
  onSave: (v: SecuritySettings) => Promise<boolean>;
  onReset: () => void;
  disabled?: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [form, setForm] = useState(value);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useSectionDirty(value, form, onDirtyChange, disabled);

  useEffect(() => setForm(value), [value]);

  function validate(): boolean {
    const e: Record<string, string> = {};
    const timeout = rangeError(
      num(form.sessionTimeoutMinutes),
      "Session timeout",
      5,
      1440
    );
    if (timeout) e.sessionTimeoutMinutes = timeout;
    const sessions = rangeError(
      num(form.maxConcurrentSessions),
      "Concurrent sessions",
      1,
      10
    );
    if (sessions) e.maxConcurrentSessions = sessions;
    const pwd = rangeError(
      num(form.passwordMinLength),
      "Password minimum length",
      8,
      32
    );
    if (pwd) e.passwordMinLength = pwd;
    const lockout = rangeError(
      num(form.lockoutAfterFailedAttempts),
      "Failed attempt lockout",
      3,
      10
    );
    if (lockout) e.lockoutAfterFailedAttempts = lockout;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  }

  return (
    <SectionForm onSubmit={() => void handleSave()} saving={saving} errorCount={Object.keys(errors).length} disabled={disabled}>
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-sm font-semibold text-kampmax-text">Security</h2>
        <ResetButton onReset={onReset} disabled={disabled} />
      </div>

      <FieldGroup title="Sessions" description="How long admin sessions stay alive.">
        <FieldGrid>
          <NumberField
            label="Idle session timeout"
            value={num(form.sessionTimeoutMinutes)}
            suffix="minutes"
            min={5}
            max={1440}
            step={5}
            onChange={(v) => setForm((f) => ({ ...f, sessionTimeoutMinutes: v }))}
            error={errors.sessionTimeoutMinutes}
          />
          <NumberField
            label="Max concurrent sessions"
            value={num(form.maxConcurrentSessions)}
            suffix="devices per admin"
            min={1}
            max={10}
            onChange={(v) => setForm((f) => ({ ...f, maxConcurrentSessions: v }))}
            error={errors.maxConcurrentSessions}
          />
        </FieldGrid>
      </FieldGroup>

      <FieldGroup title="Admin security" description="Account hardening for console operators.">
        <ToggleField
          label="Enforce two-factor authentication"
          hint="All admins must enrol 2FA; login is blocked without it."
          checked={form.enforceTwoFactor}
          onChange={(v) => setForm((f) => ({ ...f, enforceTwoFactor: v }))}
        />
        <FieldGrid>
          <NumberField
            label="Password minimum length"
            value={num(form.passwordMinLength)}
            suffix="characters"
            min={8}
            max={32}
            onChange={(v) => setForm((f) => ({ ...f, passwordMinLength: v }))}
            error={errors.passwordMinLength}
          />
          <NumberField
            label="Lockout after failed attempts"
            value={num(form.lockoutAfterFailedAttempts)}
            suffix="attempts, 15-minute lock"
            min={3}
            max={10}
            onChange={(v) => setForm((f) => ({ ...f, lockoutAfterFailedAttempts: v }))}
            error={errors.lockoutAfterFailedAttempts}
          />
        </FieldGrid>
      </FieldGroup>

      {form.enforceTwoFactor && (
        <p className="rounded-lg border border-dashed border-sky-300 bg-sky-50/60 px-3 py-2.5 text-[11px] leading-snug text-kampmax-info">
          Admins without 2FA will be routed through enrolment on next sign-in.
          Existing sessions keep working until they naturally expire.
        </p>
      )}
    </SectionForm>
  );
}
