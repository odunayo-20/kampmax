"use client";

import { useState } from "react";
import { Download, FileText, Lock, Pencil } from "lucide-react";
import { Button, Input } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/home/Skeleton";
import { CV_LABEL_MAX_CHARS, CV_MAX_COUNT } from "@/config/cv";
import { useCvs, useDeleteCv, useRenameCv } from "@/hooks/use-job-applications";
import { formatFileSize } from "@/lib/cv";
import { getFriendlyErrorMessage, getRefusalMessage } from "@/lib/error-messages";
import { formatDate } from "@/lib/utils";
import { downloadCv, getCvLink, type Cv } from "@/services/job-applications";
import { CvUploadForm } from "./CvUploadForm";

/** What deleting a CV does, depending on whether any application still holds it. */
export function deleteCvBody(cv: Pick<Cv, "label" | "applicationCount">): string {
  const base = `"${cv.label}" will be removed from your CVs.`;
  if (cv.applicationCount === 0) return `${base} The file is deleted.`;
  const n = cv.applicationCount;
  return `${base} ${n === 1 ? "An application you sent still uses" : `${n} applications you sent still use`} this file, so ${
    n === 1 ? "that employer keeps" : "those employers keep"
  } seeing it until their posting ends. You can't use it for new applications.`;
}

function CvRow({ cv }: { cv: Cv }) {
  const rename = useRenameCv();
  const remove = useDeleteCv();
  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(cv.label);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);

  const save = () => {
    const next = label.trim();
    if (!next || next === cv.label) {
      setEditing(false);
      setLabel(cv.label);
      return;
    }
    setError(null);
    rename.mutate(
      { id: cv.id, label: next },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setError(getRefusalMessage(err)),
      }
    );
  };

  const open = async () => {
    setError(null);
    setOpening(true);
    const result = await downloadCv(() => getCvLink(cv.id));
    setOpening(false);
    if (result.error) setError(getFriendlyErrorMessage(result.error));
  };

  return (
    <li className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
            <FileText className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <Input
                  aria-label="CV name"
                  value={label}
                  maxLength={CV_LABEL_MAX_CHARS}
                  onChange={(e) => setLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save();
                    if (e.key === "Escape") {
                      setEditing(false);
                      setLabel(cv.label);
                    }
                  }}
                  autoFocus
                />
                <Button size="sm" onClick={save} disabled={rename.isPending}>
                  Save
                </Button>
              </div>
            ) : (
              <p className="truncate text-sm font-semibold text-neutral-900">{cv.label}</p>
            )}
            <p className="mt-0.5 text-xs text-neutral-500">
              {cv.filename} · {formatFileSize(cv.sizeBytes)} · added {formatDate(cv.createdAt)}
            </p>
            {cv.applicationCount > 0 && (
              <p className="mt-0.5 text-xs text-neutral-500">
                Used in {cv.applicationCount} {cv.applicationCount === 1 ? "application" : "applications"}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={() => void open()} disabled={opening}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden />
            {opening ? "Opening…" : "Download"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditing(true)}
            disabled={editing}
            aria-label={`Rename ${cv.label}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setConfirmDelete(true)}
            disabled={remove.isPending}
          >
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-2 text-xs text-error-600">
          {error}
        </p>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this CV?"
        body={deleteCvBody(cv)}
        confirmLabel="Delete CV"
        destructive
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(cv.id, {
            onSuccess: () => setConfirmDelete(false),
            onError: (err) => {
              setConfirmDelete(false);
              setError(getFriendlyErrorMessage(err));
            },
          })
        }
        onCancel={() => setConfirmDelete(false)}
      />
    </li>
  );
}

/**
 * The student's CV library. A few named CVs are kept once and chosen from when
 * applying, so nothing has to be uploaded again for each application.
 */
export function CvLibrary() {
  const query = useCvs();
  const cvs = query.data ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">My CVs</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Keep up to {CV_MAX_COUNT} CVs here. When you apply for an internship or vacancy you pick one, so you
          never upload the same file twice.
        </p>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-neutral-50 px-3 py-2.5 text-xs text-neutral-600">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Your CVs are private. An employer you apply to can open one, only through a link that stops working
        after a few minutes. Kampmax staff can open one to review a report or keep the platform safe, and each
        time is logged.
      </p>

      {query.isPending ? (
        <div className="space-y-3" role="status" aria-label="Loading your CVs">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : query.isError ? (
        <div className="rounded-xl border border-error-100 bg-error-50 p-4 text-sm text-error-700">
          {getFriendlyErrorMessage(query.error)}{" "}
          <button className="font-semibold underline" onClick={() => void query.refetch()}>
            Try again
          </button>
        </div>
      ) : (
        <>
          {cvs.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 bg-white p-6 text-center text-sm text-neutral-500">
              You haven&apos;t added a CV yet.
            </p>
          ) : (
            <ul className="space-y-3">
              {cvs.map((cv) => (
                <CvRow key={cv.id} cv={cv} />
              ))}
            </ul>
          )}
          <CvUploadForm count={cvs.length} />
        </>
      )}
    </div>
  );
}
