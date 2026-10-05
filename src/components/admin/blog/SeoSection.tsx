"use client";

import { cn } from "@/lib/utils";
import { FIELD_CLASS } from "./blog-meta";
import { ImageField } from "./ImageField";

export interface SeoValues {
  seoTitle: string;
  seoDescription: string;
  canonicalUrl: string;
  ogImage: string | null;
}

interface SeoSectionProps {
  values: SeoValues;
  errors: Partial<Record<keyof SeoValues, string>>;
  fallbackTitle: string;
  fallbackDescription: string;
  slug: string;
  disabled?: boolean;
  onChange: (patch: Partial<SeoValues>) => void;
  onError: (message: string) => void;
}

const TITLE_MAX = 160;
const DESCRIPTION_MAX = 320;
/** Search engines typically show ~60 / ~155 characters. */
const TITLE_SOFT = 60;
const DESCRIPTION_SOFT = 155;

function Counter({ length, soft, max }: { length: number; soft: number; max: number }) {
  return (
    <span className={cn("text-xs tabular-nums", length > max ? "text-kampmax-error" : length > soft ? "text-warning-700" : "text-kampmax-text-muted")}>
      {length}/{soft} recommended
    </span>
  );
}

export function SeoSection({ values, errors, fallbackTitle, fallbackDescription, slug, disabled, onChange, onError }: SeoSectionProps) {
  const title = values.seoTitle || fallbackTitle || "Article title";
  const description = values.seoDescription || fallbackDescription || "The excerpt is used when no meta description is set.";
  return (
    <div className="space-y-4">
      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="seo-title" className="text-xs font-medium text-kampmax-text">SEO title</label>
          <Counter length={values.seoTitle.length} soft={TITLE_SOFT} max={TITLE_MAX} />
        </div>
        <input id="seo-title" value={values.seoTitle} maxLength={TITLE_MAX} disabled={disabled} onChange={(e) => onChange({ seoTitle: e.target.value })} placeholder="Defaults to the article title" className={FIELD_CLASS} aria-invalid={!!errors.seoTitle} />
        {errors.seoTitle && <p role="alert" className="mt-1 text-xs text-kampmax-error">{errors.seoTitle}</p>}
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between">
          <label htmlFor="seo-description" className="text-xs font-medium text-kampmax-text">Meta description</label>
          <Counter length={values.seoDescription.length} soft={DESCRIPTION_SOFT} max={DESCRIPTION_MAX} />
        </div>
        <textarea id="seo-description" value={values.seoDescription} maxLength={DESCRIPTION_MAX} rows={3} disabled={disabled} onChange={(e) => onChange({ seoDescription: e.target.value })} placeholder="Defaults to the excerpt" className={cn(FIELD_CLASS, "resize-y")} aria-invalid={!!errors.seoDescription} />
        {errors.seoDescription && <p role="alert" className="mt-1 text-xs text-kampmax-error">{errors.seoDescription}</p>}
      </div>

      <div>
        <label htmlFor="seo-canonical" className="mb-1 block text-xs font-medium text-kampmax-text">Canonical URL</label>
        <input id="seo-canonical" type="url" value={values.canonicalUrl} disabled={disabled} onChange={(e) => onChange({ canonicalUrl: e.target.value })} placeholder="Only set if this article was first published elsewhere" className={FIELD_CLASS} aria-invalid={!!errors.canonicalUrl} />
        {errors.canonicalUrl && <p role="alert" className="mt-1 text-xs text-kampmax-error">{errors.canonicalUrl}</p>}
      </div>

      <ImageField
        label="Social share image"
        hint="Shown when the article is shared. Falls back to the cover image. 1200×630 works best."
        url={values.ogImage}
        disabled={disabled}
        onChange={({ url }) => onChange({ ogImage: url })}
        onError={onError}
      />

      <div aria-label="Search result preview" className="rounded-lg border border-kampmax-border bg-kampmax-muted/40 p-3">
        <p className="text-[11px] uppercase tracking-wide text-kampmax-text-muted">Search preview</p>
        <p className="mt-1 truncate text-sm text-kampmax-text-muted">kampmax.com › blog › {slug || "…"}</p>
        <p className="mt-0.5 line-clamp-1 text-base font-medium text-primary-700">{title}</p>
        <p className="mt-0.5 line-clamp-2 text-xs text-kampmax-text-secondary">{description}</p>
      </div>
    </div>
  );
}
