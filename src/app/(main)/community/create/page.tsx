"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ImagePlus, X } from "lucide-react";
import { uploadFileDirect } from "@/services/media";
import { PageContainer } from "@/components/layout/PageContainer";
import { useApp } from "@/lib/app-context";
import { useCreatePost } from "@/hooks/use-community";

const MAX_LENGTH = 5000;
const MAX_IMAGES = 4;

interface AttachedImage {
  id: string;
  url: string;
}

export default function CreatePostPage() {
  const router = useRouter();
  const { selectedCampus } = useApp();
  const create = useCreatePost();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<AttachedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const trimmed = content.trim();
  const canPost = (trimmed.length > 0 || images.length > 0) && !create.isPending && !uploading;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadError(null);
    setUploading(true);
    const room = MAX_IMAGES - images.length;
    const added: AttachedImage[] = [];
    for (const file of Array.from(files).slice(0, room)) {
      if (!file.type.startsWith("image/")) {
        setUploadError("Only image files are supported.");
        continue;
      }
      const { data, error } = await uploadFileDirect(file, "post");
      if (error || !data?.url) {
        setUploadError(error?.message || "Couldn't upload that image. Try again.");
        continue;
      }
      added.push({ id: data.id, url: data.url });
    }
    setImages((prev) => [...prev, ...added]);
    setUploading(false);
  }

  function handleSubmit() {
    if (!canPost) return;
    create.mutate(
      {
        content: trimmed || undefined,
        campusId: selectedCampus?.id || undefined,
        media: images.map((img, i) => ({ type: "IMAGE" as const, url: img.url, sortOrder: i })),
      },
      { onSuccess: (post) => router.replace(`/community/${post.id}`) }
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
          disabled={!canPost}
          className="px-4 py-2 rounded-xl bg-kampmax-blue text-white text-sm font-semibold disabled:opacity-40"
        >
          {create.isPending ? "Posting…" : "Post"}
        </button>
      </div>

      <div>
        <textarea
          value={content}
          maxLength={MAX_LENGTH}
          onChange={(e) => setContent(e.target.value)}
          rows={8}
          autoFocus
          placeholder={`What's on your mind${selectedCampus?.name ? `, ${selectedCampus.name}` : ""}?`}
          className="w-full rounded-xl border border-kampmax-border bg-white px-4 py-3 text-sm focus:outline-none focus:border-kampmax-blue resize-none"
        />
        <p className="text-[10px] text-kampmax-text-secondary text-right mt-1">
          {content.length}/{MAX_LENGTH}
        </p>
      </div>

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
        {images.length < MAX_IMAGES && (
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

      {create.isError && <p className="text-xs text-kampmax-error">Couldn&apos;t publish your post. Try again.</p>}
    </PageContainer>
  );
}
