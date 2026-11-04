"use client";

import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { CV_ACCEPT, CV_LABEL_MAX_CHARS, CV_MAX_BYTES, CV_MAX_COUNT } from "@/config/cv";
import { useUploadCv } from "@/hooks/use-job-applications";
import { formatFileSize, validateCvFile } from "@/lib/cv";
import { getRefusalMessage } from "@/lib/error-messages";
import type { Cv } from "@/services/job-applications";

/**
 * Adds a CV to the library: pick a PDF or Word file, optionally name it, and
 * save. The type and size are checked here for a quick answer; the server
 * checks them again, along with what is actually inside the file.
 */
export function CvUploadForm({
  count,
  onUploaded,
}: {
  /** How many CVs the person already has. */
  count: number;
  onUploaded?: (cv: Cv) => void;
}) {
  const upload = useUploadCv();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  const full = count >= CV_MAX_COUNT;

  if (full) {
    return (
      <p className="rounded-lg bg-neutral-50 px-3 py-2 text-xs text-neutral-600">
        You have {CV_MAX_COUNT} CVs, which is the most you can keep. Delete one to add another.
      </p>
    );
  }

  const choose = (picked: File | null) => {
    setError(null);
    if (picked) {
      const problem = validateCvFile(picked);
      if (problem) {
        setFile(null);
        setError(problem);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }
    setFile(picked);
  };

  const submit = () => {
    if (!file) return;
    setError(null);
    upload.mutate(
      { file, label: label.trim() || undefined },
      {
        onSuccess: (cv) => {
          setFile(null);
          setLabel("");
          if (inputRef.current) inputRef.current.value = "";
          onUploaded?.(cv);
        },
        // A refusal such as "not a real PDF" is written for the person.
        onError: (err) => setError(getRefusalMessage(err)),
      }
    );
  };

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-neutral-300 bg-white p-4">
      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="cv-file">
          Add a CV
        </label>
        <input
          ref={inputRef}
          id="cv-file"
          type="file"
          accept={CV_ACCEPT}
          disabled={upload.isPending}
          onChange={(e) => choose(e.target.files?.[0] ?? null)}
          className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-neutral-800 hover:file:bg-neutral-100"
        />
        <p className="mt-1 text-[11px] text-neutral-400">
          PDF or Word (.docx), up to {formatFileSize(CV_MAX_BYTES)}.
        </p>
      </div>

      {file && (
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-700" htmlFor="cv-label">
            Name (optional)
          </label>
          <Input
            id="cv-label"
            value={label}
            maxLength={CV_LABEL_MAX_CHARS}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={file.name.replace(/\.[^.]+$/, "")}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-error-600">
          {error}
        </p>
      )}

      <Button size="sm" onClick={submit} disabled={!file || upload.isPending}>
        <FileUp className="mr-1.5 h-4 w-4" aria-hidden />
        {upload.isPending ? "Uploading…" : "Save CV"}
      </Button>
    </div>
  );
}
