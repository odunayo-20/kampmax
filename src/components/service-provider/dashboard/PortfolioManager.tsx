"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2, Plus } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useProviderImageUpload } from "@/hooks/useProviderImageUpload";
import {
  PORTFOLIO_DESCRIPTION_MAX,
  PORTFOLIO_FULL,
  PORTFOLIO_MAX,
  PORTFOLIO_TITLE_MAX,
  portfolioProblems,
  portfolioSummary,
} from "@/lib/provider-portfolio";
import {
  addMyPortfolioItem,
  fetchMyPortfolio,
  removeMyPortfolioItem,
  updateMyPortfolioItem,
} from "@/services/service-provider-media";
import type { ProviderPortfolioItem, UploadedProviderImage } from "@/services/service-provider-media";

const PORTFOLIO_KEY = ["service-provider", "portfolio"];

type Panel = { item: ProviderPortfolioItem | null } | null;

/** A write that failed (the services already give a plain message) becomes an error the screen can show. */
async function must(call: Promise<{ ok: boolean; error?: string }>): Promise<void> {
  const res = await call;
  if (!res.ok) throw new Error(res.error || "We couldn't save that.");
}

/** Photos of finished work, shown on the provider's public profile. One piece is opened at a time, as in the app. */
export function PortfolioManager({ verified }: { verified: boolean }) {
  const queryClient = useQueryClient();
  const q = useQuery({ queryKey: PORTFOLIO_KEY, queryFn: fetchMyPortfolio, retry: false });
  const [panel, setPanel] = useState<Panel>(null);

  const items = q.data ?? [];
  const full = items.length >= PORTFOLIO_MAX;
  const done = () => {
    setPanel(null);
    return queryClient.invalidateQueries({ queryKey: PORTFOLIO_KEY });
  };

  return (
    <section className="space-y-4 rounded-xl border border-kampmax-border bg-white p-6" aria-label="Portfolio pieces">
      {q.isPending ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary-600" aria-label="Loading portfolio" />
        </div>
      ) : q.isError ? (
        <p role="alert" className="text-sm text-kampmax-text-secondary">
          We couldn&apos;t load your portfolio.{" "}
          <button type="button" onClick={() => void q.refetch()} className="font-semibold text-primary-600 hover:underline">
            Try again
          </button>
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-kampmax-text-secondary">{items.length > 0 ? portfolioSummary(items.length, verified) : ""}</p>
            {full ? (
              <p className="text-sm text-kampmax-text-secondary">{PORTFOLIO_FULL}</p>
            ) : (
              <Button onClick={() => setPanel({ item: null })} disabled={panel !== null} className="self-start sm:self-auto">
                <Plus className="mr-2 h-4 w-4" aria-hidden />
                Add work
              </Button>
            )}
          </div>

          {panel && <PortfolioPanel key={panel.item?.id ?? "new"} item={panel.item} onClose={() => setPanel(null)} onDone={done} />}

          {items.length === 0 && !panel ? (
            <div className="rounded-xl border-2 border-dashed border-neutral-300 p-10 text-center">
              <Camera className="mx-auto mb-3 h-10 w-10 text-neutral-300" aria-hidden />
              <p className="text-sm font-medium text-kampmax-text">Show what you can do</p>
              <p className="mt-1 text-sm text-kampmax-text-secondary">Add pictures of past jobs. Customers look at these before they book.</p>
              <Button className="mt-4" onClick={() => setPanel({ item: null })}>
                Add your first piece
              </Button>
            </div>
          ) : (
            <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-label={`${item.title}. Edit`}
                    onClick={() => setPanel({ item })}
                    className="block w-full text-left"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={item.image} alt="" className="aspect-square w-full rounded-xl bg-neutral-100 object-cover" />
                    <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-kampmax-text">{item.title}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}

/** Add a piece, or change or remove one: the picture, a title and what was done. */
function PortfolioPanel({
  item,
  onClose,
  onDone,
}: {
  item: ProviderPortfolioItem | null;
  onClose: () => void;
  onDone: () => Promise<unknown> | void;
}) {
  const [title, setTitle] = useState(item?.title ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [photo, setPhoto] = useState<UploadedProviderImage | null>(item ? { mediaId: item.mediaId, url: item.image } : null);
  const [errors, setErrors] = useState<{ title?: string; picture?: string }>({});
  const [confirmRemove, setConfirmRemove] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const { upload, busy: uploading, error: uploadError } = useProviderImageUpload();

  const save = useMutation({
    mutationFn: () =>
      must(
        item
          ? // The picture is only re-sent when it changed.
            updateMyPortfolioItem(item.id, {
              ...(photo && photo.mediaId !== item.mediaId ? { mediaId: photo.mediaId } : {}),
              title,
              description,
            })
          : addMyPortfolioItem({ mediaId: photo!.mediaId, title, description })
      ),
    onSuccess: onDone,
  });
  const remove = useMutation({
    mutationFn: () => must(removeMyPortfolioItem(item!.id)),
    onSuccess: onDone,
  });

  async function choose(file: File | undefined) {
    if (!file) return;
    const uploaded = await upload(file, "portfolio");
    if (uploaded) {
      setPhoto(uploaded);
      setErrors((e) => ({ ...e, picture: undefined }));
    }
  }

  function submit() {
    const found = portfolioProblems({ title, hasPicture: !!photo });
    setErrors(found);
    if (Object.keys(found).length === 0) save.mutate();
  }

  const failure = save.error ?? remove.error;

  return (
    <div className="space-y-4 rounded-xl border border-primary-200 bg-primary-50/40 p-4">
      <h2 className="text-base font-bold text-kampmax-text">{item ? "Edit work" : "Add work"}</h2>
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="sm:w-52">
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photo.url} alt="" className="aspect-square w-full rounded-lg object-cover" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 text-neutral-300">
              <Camera className="h-8 w-8" aria-hidden />
            </div>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            aria-label="Choose a photo of the work"
            onChange={(e) => {
              void choose(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <Button variant="outline" size="sm" className="mt-2 w-full" disabled={uploading} onClick={() => fileInput.current?.click()}>
            {uploading ? "Uploading picture…" : photo ? "Change photo" : "Choose a photo"}
          </Button>
          {(errors.picture || uploadError) && (
            <p role="alert" className="mt-1 text-xs text-error-600">
              {errors.picture ?? uploadError}
            </p>
          )}
        </div>

        <div className="flex-1 space-y-3">
          <Input
            label="Title"
            value={title}
            maxLength={PORTFOLIO_TITLE_MAX}
            error={errors.title}
            placeholder="Kitchen deep clean"
            onChange={(e) => {
              setTitle(e.target.value);
              setErrors((x) => ({ ...x, title: undefined }));
            }}
          />
          <div>
            <label htmlFor="portfolio-description" className="mb-1.5 block text-sm font-medium text-kampmax-text">
              What was done? (optional)
            </label>
            <textarea
              id="portfolio-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={PORTFOLIO_DESCRIPTION_MAX}
              className="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600/20"
            />
          </div>
          {failure && (
            <p role="alert" className="text-sm text-error-600">
              {failure.message}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={submit} disabled={save.isPending || uploading || remove.isPending}>
              {save.isPending ? "Saving…" : item ? "Save changes" : "Add to portfolio"}
            </Button>
            {item && (
              <Button size="sm" variant="outline" onClick={() => setConfirmRemove(true)} disabled={save.isPending || remove.isPending}>
                Remove this work
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={onClose} disabled={save.isPending || remove.isPending}>
              Cancel
            </Button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmRemove}
        title="Remove this work?"
        body={`"${item?.title ?? ""}" will no longer show on your profile.`}
        confirmLabel="Remove"
        cancelLabel="Keep it"
        destructive
        pending={remove.isPending}
        onConfirm={() => remove.mutate(undefined, { onSettled: () => setConfirmRemove(false) })}
        onCancel={() => setConfirmRemove(false)}
      />
    </div>
  );
}
