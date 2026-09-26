"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Trash2, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadFileDirect } from "@/services/media";
import type { CampusCreateInput, CampusStatus, ManagedCampus } from "@/types/admin";
import { Input } from "@/components/ui/Input";
import { CampusAvatar } from "./CampusBadges";

interface CampusFormDialogProps {
  open: boolean;
  /** Null = create mode; set = edit mode. */
  campus: ManagedCampus | null;
  states: string[];
  saving?: boolean;
  onClose: () => void;
  onSave: (input: CampusCreateInput) => Promise<void>;
}

type FormState = Required<{ [K in keyof CampusCreateInput]: string }> & {
  status: CampusStatus;
};

const EMPTY_FORM: FormState = {
  institution: "",
  name: "",
  state: "",
  city: "",
  address: "",
  description: "",
  logo: "",
  status: "active",
};

interface FormErrors {
  institution?: string;
  name?: string;
  state?: string;
  city?: string;
}

/** Mirrors the backend's `campus` media category limit. */
const MAX_LOGO_BYTES = 10 * 1024 * 1024;

export function CampusFormDialog({
  open,
  campus,
  states,
  saving = false,
  onClose,
  onSave,
}: CampusFormDialogProps) {
  const isEdit = campus !== null;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setUploading(false);
    setLogoError(null);
    if (campus) {
      setForm({
        institution: campus.institution,
        name: campus.name,
        state: campus.state,
        city: campus.city,
        address: campus.address,
        description: campus.description,
        logo: campus.logo ?? "",
        status: campus.status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setTouched(false);
  }, [open, campus]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, saving, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const dirty = useMemo(() => {
    if (!campus) return true;
    return (
      form.institution !== campus.institution ||
      form.name !== campus.name ||
      form.state !== campus.state ||
      form.city !== campus.city ||
      form.address !== campus.address ||
      form.description !== campus.description ||
      form.logo !== (campus.logo ?? "") ||
      form.status !== campus.status
    );
  }, [campus, form]);

  if (!open || (!campus && isEdit)) return null;

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (form.institution.trim().length < 3)
      next.institution = "Enter the institution's full name.";
    if (form.name.trim().length < 3)
      next.name = "Give the campus a descriptive name.";
    if (form.state.trim().length < 2) next.state = "Enter the state.";
    if (form.city.trim().length < 2) next.city = "Enter the city or town.";
    return next;
  }

  async function handleLogoPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setLogoError("Choose an image file (PNG, JPG, WebP…).");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError("That image is too large. The limit is 10 MB.");
      return;
    }
    setLogoError(null);
    setUploading(true);
    const { data, error } = await uploadFileDirect(file, "campus");
    setUploading(false);
    if (error || !data?.url) {
      setLogoError(error?.message || "Couldn't upload the logo. Try again.");
      return;
    }
    set("logo", data.url);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (uploading) return;
    setTouched(true);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    await onSave({
      institution: form.institution.trim(),
      name: form.name.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      address: form.address.trim(),
      description: form.description.trim(),
      logo: form.logo.trim() || null,
      status: form.status,
    });
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="campus-form-title"
    >
      <button
        type="button"
        aria-label="Close dialog"
        tabIndex={-1}
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => !saving && onClose()}
      />

      <form
        noValidate
        onSubmit={handleSubmit}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-kampmax-border bg-white shadow-xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-kampmax-border px-5 py-4">
          <div className="flex items-center gap-3">
            <CampusAvatar
              campus={{
                id: campus?.id ?? "new",
                shortName: derivePreviewShortName(form.name),
                logo: form.logo || null,
              }}
              size="lg"
            />
            <div>
              <h2 id="campus-form-title" className="text-sm font-semibold text-kampmax-text">
                {isEdit ? "Edit campus" : "Add campus"}
              </h2>
              <p className="text-xs text-kampmax-text-secondary">
                {isEdit
                  ? `${campus!.shortName} · ${campus!.id}`
                  : "Onboard a new campus to the Kampmax network"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            disabled={saving}
            className="rounded-md p-1 text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted hover:text-kampmax-text disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="grid grid-cols-1 gap-3 overflow-y-auto px-5 py-4 sm:grid-cols-2">
          <Input
            label="Institution name"
            value={form.institution}
            onChange={(e) => set("institution", e.target.value)}
            error={touched ? errors.institution : undefined}
            placeholder="e.g. University of Lagos"
            autoComplete="off"
          />
          <Input
            label="Campus name"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            error={touched ? errors.name : undefined}
            placeholder="e.g. UNILAG Main Campus"
            autoComplete="off"
          />
          <Input
            label="State"
            value={form.state}
            onChange={(e) => set("state", e.target.value)}
            error={touched ? errors.state : undefined}
            list="campus-states"
            placeholder="e.g. Lagos"
            autoComplete="off"
          />
          <datalist id="campus-states">
            {states.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <Input
            label="City / town"
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            error={touched ? errors.city : undefined}
            placeholder="e.g. Akoka"
            autoComplete="off"
          />

          <div className="sm:col-span-2">
            <Input
              label="Address"
              hint="Street address used for deliveries and pickup stations."
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="e.g. 1 University Road, Akoka"
              autoComplete="off"
            />
          </div>

          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              placeholder="Short internal note about this campus's operations…"
              className="w-full rounded-lg border border-kampmax-border bg-white px-3 py-2.5 text-sm text-kampmax-text placeholder:text-kampmax-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-kampmax-blue focus:border-kampmax-blue resize-none"
            />
          </label>

          <div>
            <span className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Logo <span className="font-normal text-kampmax-text-secondary">(optional)</span>
            </span>
            <input
              ref={fileInput}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoPick}
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading || saving}
                className="inline-flex h-11 items-center gap-1.5 rounded-lg border border-kampmax-border bg-white px-3 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {uploading ? "Uploading…" : form.logo ? "Replace image" : "Upload image"}
              </button>
              {form.logo && !uploading && (
                <button
                  type="button"
                  onClick={() => {
                    set("logo", "");
                    setLogoError(null);
                  }}
                  disabled={saving}
                  aria-label="Remove logo"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-kampmax-border bg-white text-kampmax-text-secondary transition-colors hover:bg-kampmax-muted/60 hover:text-kampmax-text disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            <p
              className={cn(
                "mt-1 text-xs",
                logoError ? "text-red-600" : "text-kampmax-text-secondary"
              )}
            >
              {logoError ?? "PNG, JPG or WebP, up to 10 MB. Without one, the campus shows its initials."}
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-kampmax-text">
              Status
            </span>
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value as CampusStatus)}
              className="h-11 w-full rounded-lg border border-kampmax-border bg-white px-3 text-sm text-kampmax-text focus:outline-none focus:ring-1 focus:ring-kampmax-blue"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            {!isEdit && form.status === "active" && (
              <p className="mt-1 text-xs text-kampmax-text-secondary">
                New campuses open for trading immediately.
              </p>
            )}
          </label>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-kampmax-border bg-kampmax-bg/60 px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-9 items-center rounded-md border border-kampmax-border bg-white px-3.5 text-sm font-medium text-kampmax-text transition-colors hover:bg-kampmax-muted/60 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={
              saving || uploading || (touched && !dirty && Object.keys(errors).length === 0)
            }
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md bg-kampmax-blue px-4 text-sm font-medium text-white transition-colors hover:bg-kampmax-blue-dark",
              "disabled:cursor-not-allowed disabled:opacity-60"
            )}
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            {saving ? (
              isEdit ? "Saving…" : "Creating…"
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Create campus"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

function derivePreviewShortName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "NEW";
  if (words.length === 1) return words[0].slice(0, 4).toUpperCase();
  return words
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase())
    .join("");
}
