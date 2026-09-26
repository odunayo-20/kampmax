"use client";

import { useEffect, useState } from "react";
import { Loader2, Send, X } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  ANNOUNCEMENT_PRIORITY_ORDER,
  announcementPriorityLabel,
} from "./campus-community-meta";
import { communityCampusName } from "./campus-community-utils";
import type { CampusOption } from "./PostsSection";
import type {
  AnnouncementInput,
  AnnouncementPriority,
  ManagedAnnouncement,
} from "@/types/admin";

interface AnnouncementFormDialogProps {
  open: boolean;
  /** Null = create mode. */
  announcement: ManagedAnnouncement | null;
  campusOptions: CampusOption[];
  loading: boolean;
  onClose: () => void;
  onSubmit: (input: AnnouncementInput) => void;
}

/**
 * Create / edit dialog for campus announcements. Announcements are posts, so
 * they go live as soon as they're saved; the audience can't be changed after
 * publishing (archive it and publish a new one instead).
 */
export function AnnouncementFormDialog({
  open,
  announcement,
  campusOptions,
  loading,
  onClose,
  onSubmit,
}: AnnouncementFormDialogProps) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<AnnouncementPriority>("info");
  const [allCampuses, setAllCampuses] = useState(true);
  const [selectedCampusIds, setSelectedCampusIds] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    title?: string;
    body?: string;
    campus?: string;
  }>({});

  useEffect(() => {
    if (!open) return;
    setTitle(announcement?.title ?? "");
    setBody(announcement?.body ?? "");
    setPriority(announcement?.priority ?? "info");
    setAllCampuses(announcement ? announcement.campusIds.length === 0 : true);
    setSelectedCampusIds(announcement?.campusIds ?? []);
    setErrors({});
  }, [open, announcement]);

  function toggleCampus(id: string) {
    setSelectedCampusIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  function handleSubmit() {
    const next: typeof errors = {};
    if (!title.trim()) next.title = "Give the announcement a title.";
    if (!body.trim()) next.body = "Write the message students will see.";
    if (!announcement && !allCampuses && selectedCampusIds.length === 0)
      next.campus = "Pick at least one campus or choose all campuses.";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return;
    }
    setErrors({});
    onSubmit({
      title: title.trim(),
      body: body.trim(),
      priority,
      campusIds: allCampuses ? [] : selectedCampusIds,
    });
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={announcement ? "Edit announcement" : "Create announcement"}
    >
      <button
        type="button"
        aria-label="Close"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !loading && onClose()}
        disabled={loading}
      />
      <div className="relative flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-xl">
        <div className="flex items-start justify-between gap-3 border-b border-kampmax-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-kampmax-text">
              {announcement ? "Edit announcement" : "New announcement"}
            </h2>
            <p className="mt-0.5 text-xs text-kampmax-text-secondary">
              {announcement
                ? "Changes show up in campus feeds straight away."
                : "Publishes to campus feeds immediately."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            disabled={loading}
            className="-mr-1 rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
          onSubmit={(e) => e.preventDefault()}
        >
          <Input
            label="Title"
            value={title}
            maxLength={150}
            placeholder="e.g. Mid-semester sale week is live"
            error={errors.title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <div>
            <label
              htmlFor="announcement-body"
              className="mb-1.5 block text-sm font-medium text-kampmax-text"
            >
              Body
            </label>
            <textarea
              id="announcement-body"
              value={body}
              rows={4}
              maxLength={2000}
              placeholder="What should students know?"
              onChange={(e) => setBody(e.target.value)}
              className={cn(
                "w-full rounded-lg border bg-white px-3 py-2.5 text-sm transition-colors focus:outline-none focus:ring-1",
                errors.body
                  ? "border-kampmax-error focus:ring-kampmax-error"
                  : "border-kampmax-border focus:ring-kampmax-blue"
              )}
            />
            {errors.body && (
              <p className="mt-1 text-xs text-kampmax-error">{errors.body}</p>
            )}
          </div>

          <Select
            label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as AnnouncementPriority)}
            hint="How prominently the announcement is flagged in the student app."
          >
            {ANNOUNCEMENT_PRIORITY_ORDER.map((p) => (
              <option key={p} value={p}>
                {announcementPriorityLabel(p)}
              </option>
            ))}
          </Select>

          {/* Audience */}
          {announcement ? (
            <div>
              <p className="mb-1.5 block text-sm font-medium text-kampmax-text">
                Audience
              </p>
              <p className="rounded-lg border border-kampmax-border bg-kampmax-muted/30 px-3 py-2.5 text-sm text-kampmax-text-secondary">
                {announcement.campusIds.length === 0
                  ? "Network-wide"
                  : announcement.campusIds.map(communityCampusName).join(", ")}
              </p>
            </div>
          ) : (
            <fieldset>
              <legend className="mb-1.5 block text-sm font-medium text-kampmax-text">
                Audience
              </legend>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-kampmax-border px-3 py-2.5 text-sm has-[:checked]:border-kampmax-blue/40 has-[:checked]:bg-kampmax-blue/5">
                <input
                  type="checkbox"
                  checked={allCampuses}
                  onChange={(e) => setAllCampuses(e.target.checked)}
                  className="h-4 w-4 rounded accent-kampmax-blue"
                />
                <span className="font-medium text-kampmax-text">
                  Network-wide
                </span>
                <span className="ml-auto text-xs text-kampmax-text-secondary">
                  Not tied to a campus
                </span>
              </label>

              {!allCampuses && (
                <div className="mt-2 grid max-h-36 grid-cols-1 gap-1 overflow-y-auto rounded-lg border border-kampmax-border px-3 py-2 sm:grid-cols-2">
                  {campusOptions.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 py-0.5 text-xs text-kampmax-text"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCampusIds.includes(c.id)}
                        onChange={() => toggleCampus(c.id)}
                        className="h-3.5 w-3.5 rounded accent-kampmax-blue"
                      />
                      <span className="truncate">
                        {c.shortName} - {c.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
              {errors.campus && (
                <p className="mt-1 text-xs text-kampmax-error">
                  {errors.campus}
                </p>
              )}
            </fieldset>
          )}
        </form>

        {/* Actions */}
        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-kampmax-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-3.5 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue/90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {announcement ? "Save changes" : "Publish now"}
          </button>
        </div>
      </div>
    </div>
  );
}
