"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFileDirect } from "@/services/media";
import { PageContainer } from "@/components/layout/PageContainer";
import { CampusSelector } from "@/components/layout/footer/CampusSelector";
import {
  cleanOptions,
  draftProblem,
  LOST_FOUND_FIELD_MAX,
  MAX_PHOTOS,
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  POLL_DAYS,
  POLL_OPTION_MAX,
  POST_MAX,
} from "@/lib/post-compose";
import { useApp } from "@/lib/app-context";
import { useAuth } from "@/lib/auth-context";
import { useCreatePost } from "@/hooks/use-community";
import type { PostKind } from "@/services/posts-api";

interface AttachedImage {
  id: string;
  url: string;
}

const inputClass =
  "w-full rounded-xl border border-kampmax-border bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-kampmax-blue";

export default function CreatePostPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const { user, status } = useAuth();
  const [shown, setShown] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const create = useCreatePost();

  const [kind, setKind] = useState<PostKind>("POST");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [pollDays, setPollDays] = useState(3);
  const [lfStatus, setLfStatus] = useState<"LOST" | "FOUND">("LOST");
  const [lfItem, setLfItem] = useState("");
  const [lfLocation, setLfLocation] = useState("");
  const [lfContact, setLfContact] = useState("");
  const [priority, setPriority] = useState<"INFO" | "WARNING" | "URGENT">("INFO");

  const kinds: { id: PostKind; label: string }[] = [
    { id: "POST", label: "Post" },
    { id: "POLL", label: "Poll" },
    { id: "LOST_FOUND", label: "Lost & found" },
    ...(user?.role === "admin" ? [{ id: "ANNOUNCEMENT" as const, label: "Announcement" }] : []),
  ];

  const trimmed = content.trim();
  const problem = draftProblem(
    { kind, text: content, photoCount: images.length, pollOptions, lostItem: lfItem, lostLocation: lfLocation },
    { hasCampus: !!selectedCampus?.id }
  );
  const busy = create.isPending || uploading;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    const room = MAX_PHOTOS - images.length;
    const added: AttachedImage[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are supported.");
        continue;
      }
      const { data, error } = await uploadFileDirect(file, "post");
      if (error || !data?.url) {
        setUploadError("Couldn't upload that image. Try again.");
        continue;
      }
      added.push({ id: data.id, url: data.url });
    }
    setImages((prev) => [...prev, ...added]);
    setUploading(false);
  }

  function handleSubmit() {
    setShown(true);
    if (problem || busy) return;
    create.mutate(
      {
        kind,
        content: trimmed || undefined,
        campusId: selectedCampus?.id || undefined,
        media: images.map((img, i) => ({ type: "IMAGE" as const, url: img.url, sortOrder: i })),
        poll: kind === "POLL" ? { options: cleanOptions(pollOptions), durationDays: pollDays } : undefined,
        lostFound:
          kind === "LOST_FOUND"
            ? { status: lfStatus, item: lfItem.trim(), location: lfLocation.trim(), contact: lfContact.trim() || undefined }
            : undefined,
        announcement: kind === "ANNOUNCEMENT" ? { priority } : undefined,
      },
      { onSuccess: (post) => router.replace(`/community/${post.id}`) }
    );
  }

  if (status === "unauthenticated") {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <p className="text-sm text-kampmax-text-secondary">Sign in to post to your campus.</p>
          <Link href="/login" className="rounded-xl bg-primary-600 px-4 py-2 text-xs font-semibold text-white hover:bg-primary-700">
            Sign in
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text"
        >
          <ArrowLeft className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={busy}
          className="px-4 py-2 rounded-xl bg-kampmax-blue text-white text-sm font-semibold disabled:opacity-40"
        >
          {create.isPending ? "Posting…" : uploading ? "Uploading photos…" : "Post"}
        </button>
      </div>

      {shown && problem && <p role="alert" className="text-xs text-kampmax-error">{problem}</p>}
      {create.isError && (
        <p role="alert" className="text-xs text-kampmax-error">Couldn&apos;t publish your post. Check your connection and try again.</p>
      )}

      <button type="button" onClick={() => setPickerOpen(true)} aria-label="Change campus" className={cn(inputClass, "text-left")}>
        <span className="block text-[11px] text-kampmax-text-secondary">Campus</span>
        <span className="font-semibold text-kampmax-text">{selectedCampus?.name || "Choose your campus"}</span>
      </button>
      <CampusSelector hideTrigger open={pickerOpen} onOpenChange={setPickerOpen} />

      <div className="flex gap-2 overflow-x-auto">
        {kinds.map((k) => (
          <button
            key={k.id}
            type="button"
            onClick={() => setKind(k.id)}
            className={cn(
              "shrink-0 rounded-xl px-3 py-2 text-xs font-semibold",
              kind === k.id ? "bg-kampmax-navy text-white" : "border border-kampmax-border bg-white text-kampmax-text-secondary"
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      {kind === "LOST_FOUND" && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {(["LOST", "FOUND"] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setLfStatus(s)}
                className={cn(
                  "flex-1 rounded-xl py-2 text-xs font-semibold",
                  lfStatus === s ? "bg-kampmax-gold text-kampmax-navy" : "border border-kampmax-border bg-white text-kampmax-text-secondary"
                )}
              >
                I {s === "LOST" ? "lost" : "found"} something
              </button>
            ))}
          </div>
          <input aria-label="What is it?" className={inputClass} placeholder="What is it? (e.g. black backpack)" maxLength={LOST_FOUND_FIELD_MAX} value={lfItem} onChange={(e) => setLfItem(e.target.value)} />
          <input aria-label="Where?" className={inputClass} placeholder={lfStatus === "LOST" ? "Where you last saw it" : "Where you found it"} maxLength={LOST_FOUND_FIELD_MAX} value={lfLocation} onChange={(e) => setLfLocation(e.target.value)} />
          <input aria-label="How to reach you" className={inputClass} placeholder="How to reach you (optional): phone number or hostel" maxLength={LOST_FOUND_FIELD_MAX} value={lfContact} onChange={(e) => setLfContact(e.target.value)} />
          <p className="text-[11px] text-kampmax-text-secondary">Contact details are shown on the post, so only add what you are happy to share.</p>
        </div>
      )}

      {kind === "ANNOUNCEMENT" && (
        <div className="flex gap-2">
          {(["INFO", "WARNING", "URGENT"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPriority(p)}
              className={cn(
                "flex-1 rounded-xl py-2 text-xs font-semibold capitalize",
                priority === p ? "bg-kampmax-navy text-white" : "border border-kampmax-border bg-white text-kampmax-text-secondary"
              )}
            >
              {p.toLowerCase()}
            </button>
          ))}
        </div>
      )}

      <div>
        <textarea
          value={content}
          maxLength={POST_MAX}
          onChange={(e) => setContent(e.target.value)}
          rows={kind === "POST" ? 8 : 4}
          autoFocus
          placeholder={
            kind === "POLL"
              ? "Ask a question…"
              : kind === "LOST_FOUND"
                ? "More details (optional)"
                : `What's on your mind${selectedCampus?.name ? `, ${selectedCampus.name}` : ""}?`
          }
          className="w-full rounded-xl border border-kampmax-border bg-white px-4 py-3 text-sm focus:outline-none focus:border-kampmax-blue resize-none"
        />
        <p className="text-[10px] text-kampmax-text-secondary text-right mt-1">
          {content.length}/{POST_MAX}
        </p>
      </div>

      {kind === "POLL" && (
        <div className="space-y-2">
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                className={inputClass}
                aria-label={`Answer ${i + 1}`}
                placeholder={`Answer ${i + 1}`}
                maxLength={POLL_OPTION_MAX}
                value={opt}
                onChange={(e) => setPollOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))}
              />
              {pollOptions.length > MIN_POLL_OPTIONS && (
                <button type="button" aria-label={`Remove answer ${i + 1}`} onClick={() => setPollOptions((prev) => prev.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4 text-kampmax-text-secondary" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < MAX_POLL_OPTIONS && (
            <button
              type="button"
              onClick={() => setPollOptions((prev) => [...prev, ""])}
              className="flex items-center gap-1 text-xs font-semibold text-kampmax-blue"
            >
              <Plus className="h-3.5 w-3.5" /> Add an answer
            </button>
          )}
          <label className="flex items-center gap-2 text-xs text-kampmax-text-secondary">
            Poll length
            <select value={pollDays} onChange={(e) => setPollDays(Number(e.target.value))} className="rounded-lg border border-kampmax-border bg-white px-2 py-1">
              {POLL_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d} day{d > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {kind !== "POLL" && kind !== "ANNOUNCEMENT" && (
        <div className="space-y-2">
          {images.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {images.map((img) => (
                <div key={img.id} className="relative rounded-xl overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-32 w-full object-cover bg-kampmax-muted" />
                  <button
                    type="button"
                    aria-label="Remove image"
                    onClick={() => setImages((prev) => prev.filter((i) => i.id !== img.id))}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {images.length < MAX_PHOTOS && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-kampmax-border bg-white px-3 py-2 text-xs font-semibold text-kampmax-text">
              <ImagePlus className="h-4 w-4" />
              {uploading ? "Uploading…" : "Add photos"}
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={uploading}
                className="hidden"
                onChange={(e) => {
                  void handleFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </label>
          )}
          {uploadError && <p className="text-xs text-kampmax-error">{uploadError}</p>}
        </div>
      )}
    </PageContainer>
  );
}
