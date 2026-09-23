"use client";

import { useId, useRef, useState } from "react";
import { Paperclip, X } from "lucide-react";
import { Button } from "@/components/ui";
import { uploadFileDirect, type MediaUploadCategory } from "@/services/media";
import { PROPOSAL_ATTACHMENT_ALLOWED, PROPOSAL_ATTACHMENT_MAX_BYTES } from "@/config/opportunity";

export interface PickedAttachment {
  /** Media id returned by the upload — what gets attached to the job/proposal. */
  id: string;
  filename: string;
  sizeBytes: number;
  mimeType: string;
}

/**
 * Uploads each chosen file to the media service immediately and reports the
 * resulting media ids, so a form only ever submits ids the backend knows.
 */
export function AttachmentPicker({
  category,
  value,
  onChange,
  maxFiles = 5,
  disabled,
}: {
  category: Extract<MediaUploadCategory, "jobAttachment" | "proposalAttachment">;
  value: PickedAttachment[];
  onChange: (next: PickedAttachment[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);

    const accepted: File[] = [];
    let problem: string | null = null;
    for (const file of Array.from(files)) {
      if (!PROPOSAL_ATTACHMENT_ALLOWED.includes(file.type as (typeof PROPOSAL_ATTACHMENT_ALLOWED)[number])) {
        problem = `"${file.name}" isn't a supported file type (PDF, DOC/DOCX, PNG, JPG).`;
      } else if (file.size > PROPOSAL_ATTACHMENT_MAX_BYTES) {
        problem = `"${file.name}" is larger than ${PROPOSAL_ATTACHMENT_MAX_BYTES / 1024 / 1024}MB.`;
      } else if (value.length + accepted.length >= maxFiles) {
        problem = `You can attach up to ${maxFiles} files.`;
        break;
      } else {
        accepted.push(file);
      }
    }

    const uploaded: PickedAttachment[] = [];
    if (accepted.length > 0) {
      setUploading(true);
      for (const file of accepted) {
        const { data, error: uploadFailure } = await uploadFileDirect(file, category);
        if (uploadFailure || !data) {
          problem = uploadFailure?.message ?? `Couldn't upload "${file.name}".`;
          continue;
        }
        uploaded.push({
          id: data.id,
          filename: data.filename,
          sizeBytes: data.sizeBytes,
          mimeType: data.mimeType,
        });
      }
      setUploading(false);
    }

    if (uploaded.length > 0) onChange([...value, ...uploaded]);
    setError(problem);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        id={inputId}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,image/png,image/jpeg"
        onChange={(e) => void handleFiles(e.target.files)}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || uploading || value.length >= maxFiles}
      >
        <Paperclip className="mr-1.5 h-4 w-4" aria-hidden />
        {uploading ? "Uploading…" : "Add file"}
      </Button>
      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}
      {value.length > 0 && (
        <ul className="mt-3 space-y-2">
          {value.map((a) => (
            <li
              key={a.id}
              className="flex items-center justify-between rounded-md border border-neutral-200 px-3 py-2 text-sm"
            >
              <span className="truncate text-neutral-700">
                <Paperclip className="mr-1.5 inline h-3.5 w-3.5 text-neutral-400" aria-hidden />
                {a.filename}
                <span className="ml-2 text-xs text-neutral-400">
                  {(a.sizeBytes / 1024 / 1024).toFixed(2)}MB
                </span>
              </span>
              <button
                type="button"
                aria-label={`Remove ${a.filename}`}
                disabled={disabled}
                onClick={() => onChange(value.filter((x) => x.id !== a.id))}
                className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-error-600"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
