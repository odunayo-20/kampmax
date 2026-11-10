"use client";

import { useState } from "react";
import { Settings as SettingsIcon } from "lucide-react";
import { cn, formatNaira } from "@/lib/utils";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import {
  useAccommodationPackages,
  useAccommodationSettings,
  useAccommodationTaxonomy,
  useCreateTaxonomy,
  useUpdateAccommodationSettings,
  useUpdatePackage,
  useUpdateTaxonomy,
} from "@/hooks/admin/use-admin-accommodation";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import type {
  AccommodationPackage,
  AccommodationSettings,
  TaxonomyItem,
  TaxonomyKind,
} from "@/types/accommodation";

const inputClass =
  "h-9 w-full rounded-md border border-kampmax-border bg-white px-2.5 text-sm text-kampmax-text disabled:bg-kampmax-muted/50 disabled:text-kampmax-text-secondary";
const buttonClass =
  "inline-flex h-8 items-center rounded-md border border-kampmax-border bg-white px-3 text-xs font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-50";
const primaryClass =
  "inline-flex h-8 items-center rounded-md bg-kampmax-blue px-3 text-xs font-medium text-white transition-colors hover:bg-kampmax-blue/90 disabled:opacity-50";

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title} className="mb-4 rounded-lg border border-kampmax-border bg-white">
      <div className="border-b border-kampmax-border px-4 py-3">
        <h2 className="text-sm font-semibold text-kampmax-text">{title}</h2>
        <p className="mt-0.5 text-xs text-kampmax-text-secondary">{description}</p>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function message(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong. Try again.";
}

function Feedback({ error, saved }: { error: string | null; saved: boolean }) {
  if (error) {
    return (
      <p role="alert" className="text-xs text-red-700">
        {error}
      </p>
    );
  }
  return saved ? (
    <p role="status" className="text-xs text-emerald-700">
      Saved.
    </p>
  ) : null;
}

// ---------- package ----------

function PackageForm({ pkg, canEdit }: { pkg: AccommodationPackage; canEdit: boolean }) {
  const update = useUpdatePackage();
  const [price, setPrice] = useState(String(pkg.price));
  const [days, setDays] = useState(String(pkg.durationDays));
  const [active, setActive] = useState(pkg.isActive);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const priceNumber = Number(price);
  const daysNumber = Number(days);
  const valid =
    price.trim() !== "" &&
    Number.isFinite(priceNumber) &&
    priceNumber >= 0 &&
    Number.isInteger(daysNumber) &&
    daysNumber >= 1 &&
    daysNumber <= 366;
  const changed = priceNumber !== pkg.price || daysNumber !== pkg.durationDays || active !== pkg.isActive;
  const priceChanged = priceNumber !== pkg.price;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({
        id: pkg.id,
        input: { price: priceNumber, durationDays: daysNumber, isActive: active },
      });
      setSaved(true);
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <form onSubmit={save} aria-label={`${pkg.name} package`} className="space-y-3">
      <p className="text-sm text-kampmax-text">
        <span className="font-medium">{pkg.name}</span>
        {pkg.description ? <span className="text-kampmax-text-secondary"> — {pkg.description}</span> : null}
        <span className="block text-xs text-kampmax-text-secondary">
          Now {pkg.price > 0 ? formatNaira(pkg.price) : "free"} for {pkg.durationDays} days.
        </span>
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="package-price" className="mb-1 block text-xs font-medium text-kampmax-text">
            Price (₦)
          </label>
          <input
            id="package-price"
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            value={price}
            disabled={!canEdit}
            onChange={(e) => setPrice(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-kampmax-text-secondary">0 makes listings free.</p>
        </div>
        <div>
          <label htmlFor="package-days" className="mb-1 block text-xs font-medium text-kampmax-text">
            Days in one paid period
          </label>
          <input
            id="package-days"
            type="number"
            inputMode="numeric"
            min={1}
            max={366}
            step={1}
            value={days}
            disabled={!canEdit}
            onChange={(e) => setDays(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-kampmax-text">
        <input
          type="checkbox"
          checked={active}
          disabled={!canEdit}
          onChange={(e) => setActive(e.target.checked)}
        />
        Agents can buy this package
      </label>
      {priceChanged && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          A new price applies to new subscriptions only. Running ones keep the price they were sold at, and renew at
          that price.
        </p>
      )}
      {canEdit && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!valid || !changed || update.isPending} className={primaryClass}>
            {update.isPending ? "Saving…" : "Save package"}
          </button>
          <Feedback error={error} saved={saved && !changed} />
        </div>
      )}
    </form>
  );
}

function PackageSection({ canEdit }: { canEdit: boolean }) {
  const packages = useAccommodationPackages();
  return (
    <Section
      title="Listing package"
      description="What an agent pays to keep a listing on the site, and for how long."
    >
      {packages.isPending ? (
        <LoadingSkeleton variant="table" rows={2} />
      ) : packages.isError ? (
        <ErrorState onRetry={() => void packages.refetch()} />
      ) : packages.data.length === 0 ? (
        <p className="text-sm text-kampmax-text-secondary">There is no package set up.</p>
      ) : (
        packages.data.map((pkg) => (
          // A fresh form whenever the saved values change, so it never shows stale input.
          <PackageForm
            key={`${pkg.id}:${pkg.price}:${pkg.durationDays}:${pkg.isActive}`}
            pkg={pkg}
            canEdit={canEdit}
          />
        ))
      )}
    </Section>
  );
}

// ---------- availability ----------

function AvailabilityForm({ settings, canEdit }: { settings: AccommodationSettings; canEdit: boolean }) {
  const update = useUpdateAccommodationSettings();
  const [interval, setIntervalDays] = useState(String(settings.availabilityIntervalDays));
  const [grace, setGrace] = useState(String(settings.availabilityGraceDays));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const i = Number(interval);
  const g = Number(grace);
  const valid = Number.isInteger(i) && i >= 1 && i <= 90 && Number.isInteger(g) && g >= 1 && g <= 30;
  const changed = i !== settings.availabilityIntervalDays || g !== settings.availabilityGraceDays;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await update.mutateAsync({ availabilityIntervalDays: i, availabilityGraceDays: g });
      setSaved(true);
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <form onSubmit={save} aria-label="Availability checks" className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="availability-interval" className="mb-1 block text-xs font-medium text-kampmax-text">
            Ask agents to confirm every (days)
          </label>
          <input
            id="availability-interval"
            type="number"
            min={1}
            max={90}
            step={1}
            value={interval}
            disabled={!canEdit}
            onChange={(e) => setIntervalDays(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-kampmax-text-secondary">From 1 to 90 days.</p>
        </div>
        <div>
          <label htmlFor="availability-grace" className="mb-1 block text-xs font-medium text-kampmax-text">
            Hide the listing after this many days with no answer
          </label>
          <input
            id="availability-grace"
            type="number"
            min={1}
            max={30}
            step={1}
            value={grace}
            disabled={!canEdit}
            onChange={(e) => setGrace(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-[11px] text-kampmax-text-secondary">From 1 to 30 days.</p>
        </div>
      </div>
      {canEdit && (
        <div className="flex items-center gap-3">
          <button type="submit" disabled={!valid || !changed || update.isPending} className={primaryClass}>
            {update.isPending ? "Saving…" : "Save availability settings"}
          </button>
          <Feedback error={error} saved={saved && !changed} />
        </div>
      )}
    </form>
  );
}

function AvailabilitySection({ canEdit }: { canEdit: boolean }) {
  const settings = useAccommodationSettings();
  return (
    <Section
      title="Availability checks"
      description="Agents are asked to confirm a listing is still available. If they don't answer in time, the listing is hidden until they do."
    >
      {settings.isPending ? (
        <LoadingSkeleton variant="table" rows={2} />
      ) : settings.isError ? (
        <ErrorState onRetry={() => void settings.refetch()} />
      ) : (
        <AvailabilityForm
          key={`${settings.data.availabilityIntervalDays}:${settings.data.availabilityGraceDays}`}
          settings={settings.data}
          canEdit={canEdit}
        />
      )}
    </Section>
  );
}

// ---------- property types and facilities ----------

function TaxonomyRow({ kind, item, canEdit }: { kind: TaxonomyKind; item: TaxonomyItem; canEdit: boolean }) {
  const update = useUpdateTaxonomy(kind);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(item.name);
  const [error, setError] = useState<string | null>(null);

  async function run(input: { name?: string; isActive?: boolean }) {
    setError(null);
    try {
      await update.mutateAsync({ id: item.id, input });
      setRenaming(false);
    } catch (err) {
      setError(message(err));
    }
  }

  const nameValid = name.trim().length >= 2 && name.trim().length <= 80;

  return (
    <li className="py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          {renaming ? (
            <form
              aria-label={`Rename ${item.name}`}
              className="flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (nameValid && name.trim() !== item.name) void run({ name: name.trim() });
                else if (name.trim() === item.name) setRenaming(false);
              }}
            >
              <input
                aria-label={`New name for ${item.name}`}
                value={name}
                maxLength={80}
                onChange={(e) => setName(e.target.value)}
                className={cn(inputClass, "w-56")}
              />
              <button type="submit" disabled={!nameValid || update.isPending} className={primaryClass}>
                Save
              </button>
              <button
                type="button"
                className={buttonClass}
                onClick={() => {
                  setRenaming(false);
                  setName(item.name);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </form>
          ) : (
            <>
              <span className={cn("text-sm font-medium", item.isActive ? "text-kampmax-text" : "text-kampmax-text-secondary")}>
                {item.name}
              </span>
              {!item.isActive && (
                <span className="ml-2 rounded-full bg-kampmax-muted px-2 py-0.5 text-[11px] font-medium text-kampmax-text-secondary">
                  Turned off
                </span>
              )}
              <span className="block text-[11px] text-kampmax-text-secondary">
                {item.slug} · used by {item.usage} {kind === "categories" ? "properties" : "listings"}
              </span>
            </>
          )}
        </div>
        {canEdit && !renaming && (
          <div className="flex gap-2">
            <button
              type="button"
              className={buttonClass}
              disabled={update.isPending}
              aria-label={`Rename ${item.name}`}
              onClick={() => setRenaming(true)}
            >
              Rename
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={update.isPending}
              aria-label={`${item.isActive ? "Turn off" : "Turn on"} ${item.name}`}
              onClick={() => void run({ isActive: !item.isActive })}
            >
              {item.isActive ? "Turn off" : "Turn on"}
            </button>
          </div>
        )}
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </li>
  );
}

function TaxonomySection({
  kind,
  title,
  description,
  noun,
  canEdit,
}: {
  kind: TaxonomyKind;
  title: string;
  description: string;
  noun: string;
  canEdit: boolean;
}) {
  const list = useAccommodationTaxonomy(kind);
  const create = useCreateTaxonomy(kind);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const valid = name.trim().length >= 2 && name.trim().length <= 80;

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setError(null);
    try {
      await create.mutateAsync({ name: name.trim() });
      setName("");
    } catch (err) {
      setError(message(err));
    }
  }

  return (
    <Section title={title} description={description}>
      {list.isPending ? (
        <LoadingSkeleton variant="table" rows={3} />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : (
        <>
          {list.data.length === 0 ? (
            <p className="text-sm text-kampmax-text-secondary">Nothing here yet.</p>
          ) : (
            <ul className="divide-y divide-kampmax-border">
              {list.data.map((item) => (
                <TaxonomyRow key={`${item.id}:${item.name}:${item.isActive}`} kind={kind} item={item} canEdit={canEdit} />
              ))}
            </ul>
          )}
          {canEdit && (
            <form onSubmit={add} aria-label={`Add ${noun}`} className="mt-4 flex flex-wrap items-end gap-2">
              <div>
                <label htmlFor={`add-${kind}`} className="mb-1 block text-xs font-medium text-kampmax-text">
                  New {noun}
                </label>
                <input
                  id={`add-${kind}`}
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  className={cn(inputClass, "w-64")}
                />
              </div>
              <button type="submit" disabled={!valid || create.isPending} className={primaryClass}>
                {create.isPending ? "Adding…" : `Add ${noun}`}
              </button>
              {error && (
                <p role="alert" className="text-xs text-red-700">
                  {error}
                </p>
              )}
            </form>
          )}
          <p className="mt-3 text-[11px] text-kampmax-text-secondary">
            Turning one off hides it from new listings. Listings that already use it keep it. Renaming keeps its
            web address.
          </p>
        </>
      )}
    </Section>
  );
}

export default function AdminAccommodationSettingsPage() {
  const { admin } = useAdminSession();
  const canEdit = admin ? canAdminPerform(admin, "accommodation", "configure") : false;

  return (
    <>
      <AdminPageHeader
        title="Accommodation settings"
        description={
          canEdit
            ? "The package price, how often agents confirm availability, and the property types and facilities agents can choose."
            : "The current accommodation settings. Only a Super Admin can change them."
        }
      />
      {!canEdit && (
        <p className="mb-4 flex items-center gap-2 rounded-md bg-kampmax-muted/60 px-3 py-2 text-xs text-kampmax-text-secondary">
          <SettingsIcon className="h-4 w-4" aria-hidden />
          You can see these settings but not change them.
        </p>
      )}
      <PackageSection canEdit={canEdit} />
      <AvailabilitySection canEdit={canEdit} />
      <TaxonomySection
        kind="categories"
        title="Property types"
        description="What an agent picks when they add a property, like a hostel or a flat."
        noun="property type"
        canEdit={canEdit}
      />
      <TaxonomySection
        kind="amenities"
        title="Facilities"
        description="What an agent can tick on a listing, like security or water."
        noun="facility"
        canEdit={canEdit}
      />
    </>
  );
}
