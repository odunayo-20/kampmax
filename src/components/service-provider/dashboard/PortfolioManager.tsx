"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Plus, Trash2 } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import {
  MAX_PORTFOLIO_ITEMS,
  addMyPortfolioItem,
  fetchMyPortfolio,
  removeMyPortfolioItem,
  updateMyPortfolioItem,
} from "@/services/service-provider-media";
import type { ProviderPortfolioItem, UploadedProviderImage } from "@/services/service-provider-media";

/** Photos of finished work, shown on the provider's public profile. */
export function PortfolioManager() {
  const [items, setItems] = useState<ProviderPortfolioItem[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newPhoto, setNewPhoto] = useState<UploadedProviderImage | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, busy, error: uploadError } = useProviderImageUpload();

  const load = useCallback(() => {
    setLoadError(null);
    fetchMyPortfolio()
      .then(setItems)
      .catch((e: unknown) => setLoadError(getFriendlyErrorMessage(e)));
  }, []);

  useEffect(load, [load]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError(null);
    const uploaded = await upload(file, "portfolio");
    if (uploaded) setNewPhoto(uploaded);
  }

  const full = (items?.length ?? 0) >= MAX_PORTFOLIO_ITEMS;

  return (
    <section className="rounded-xl border border-kampmax-border bg-white p-6" aria-labelledby="portfolio-heading">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="portfolio-heading" className="text-base font-bold text-kampmax-text">
            Portfolio {items && <span className="text-sm font-medium text-kampmax-text-secondary">({items.length}/{MAX_PORTFOLIO_ITEMS})</span>}
          </h2>
          <p className="mt-1 text-sm text-kampmax-text-secondary">
            Photos of your best work. Customers see these on your public profile.
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => fileInput.current?.click()}
          disabled={!items || full || busy || newPhoto !== null}
          className="self-start sm:self-auto"
        >
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : <Plus className="mr-2 h-4 w-4" aria-hidden />}
          {full ? "Limit reached" : busy ? "Uploading…" : "Add a photo"}
        </Button>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a portfolio photo"
        onChange={(e) => {
          void choose(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {(uploadError || error) && (
        <p role="alert" className="mb-3 text-sm text-kampmax-error">
          {uploadError ?? error}
        </p>
      )}

      {newPhoto && (
        <NewItemForm
          photo={newPhoto}
          onCancel={() => setNewPhoto(null)}
          onAdded={(item) => {
            setItems((prev) => [...(prev ?? []), item]);
            setNewPhoto(null);
          }}
        />
      )}

      {loadError ? (
        <p role="alert" className="text-sm text-kampmax-text-secondary">
          {loadError}{" "}
          <button type="button" onClick={load} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </p>
      ) : !items ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-label="Loading portfolio" />
        </div>
      ) : items.length === 0 && !newPhoto ? (
        <div className="rounded-xl border-2 border-dashed border-neutral-300 p-10 text-center">
          <Camera className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden />
          <p className="text-sm font-medium text-kampmax-text">No portfolio photos yet</p>
          <p className="mt-1 text-sm text-kampmax-text-secondary">Add photos of your work to build trust with customers.</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <PortfolioCard
              key={item.id}
              item={item}
              onSaved={(next) => setItems((prev) => (prev ?? []).map((i) => (i.id === next.id ? next : i)))}
              onRemoved={(id) => setItems((prev) => (prev ?? []).filter((i) => i.id !== id))}
              onError={setError}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function NewItemForm({
  photo,
  onCancel,
  onAdded,
}: {
  photo: UploadedProviderImage;
  onCancel: () => void;
  onAdded: (item: ProviderPortfolioItem) => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    if (!title.trim()) {
      setError("Give this photo a title.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await addMyPortfolioItem({ mediaId: photo.mediaId, title, description });
    setSaving(false);
    if (res.ok) onAdded(res.item);
    else setError(res.error);
  }

  return (
    <div className="mb-4 flex flex-col gap-4 rounded-xl border border-primary-200 bg-primary-50/40 p-4 sm:flex-row">
      <img src={photo.url} alt="New portfolio photo" className="h-32 w-full rounded-lg object-cover sm:w-44" />
      <div className="flex-1 space-y-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (e.g., Box braids, 4 hours)" maxLength={150} aria-label="Title" />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the work (optional)"
          rows={2}
          maxLength={1000}
          aria-label="Description"
          className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        {error && (
          <p role="alert" className="text-xs text-kampmax-error">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={() => void save()} disabled={saving}>
            {saving ? "Saving…" : "Add to portfolio"}
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

function PortfolioCard({
  item,
  onSaved,
  onRemoved,
  onError,
}: {
  item: ProviderPortfolioItem;
  onSaved: (item: ProviderPortfolioItem) => void;
  onRemoved: (id: string) => void;
  onError: (message: string | null) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [description, setDescription] = useState(item.description);
  const [busy, setBusy] = useState(false);
  const changed = title.trim() !== item.title || description.trim() !== item.description;

  async function save() {
    if (!title.trim()) {
      onError("A portfolio photo needs a title.");
      return;
    }
    setBusy(true);
    onError(null);
    const res = await updateMyPortfolioItem(item.id, { title, description });
    setBusy(false);
    if (res.ok) onSaved(res.item);
    else onError(res.error);
  }

  async function remove() {
    setBusy(true);
    onError(null);
    const res = await removeMyPortfolioItem(item.id);
    setBusy(false);
    if (res.ok) onRemoved(item.id);
    else onError(res.error ?? "We couldn't remove that photo.");
  }

  return (
    <li className="flex flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white">
      <img src={item.image} alt={item.title} className="aspect-[4/3] w-full object-cover" />
      <div className="flex-1 space-y-3 p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={150} aria-label={`Title for ${item.title}`} />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={1000}
          aria-label={`Description for ${item.title}`}
          className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20"
        />
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={() => void save()} disabled={busy || !changed}>
            Save changes
          </Button>
          <button
            type="button"
            onClick={() => void remove()}
            disabled={busy}
            aria-label={`Remove ${item.title}`}
            className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}
