"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Monitor, Smartphone, Tablet } from "lucide-react";
import { ArticleContent } from "@/components/blog/ArticleContent";
import { ArticleMeta } from "@/components/blog/ArticleMeta";
import { BlogImage } from "@/components/blog/BlogImage";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";
import { blogAdminApi } from "@/services/admin/blog-management.api";

interface ArticlePreviewProps {
  title: string;
  excerpt: string;
  /** Editor HTML. It is sanitized by the server, exactly as when publishing. */
  content: string;
  coverImage: string | null;
  categoryName: string | null;
  tagNames: string[];
  authorName: string;
  publishedAt: string | null;
}

const DEVICES = [
  { id: "phone", label: "Phone", width: 390, Icon: Smartphone },
  { id: "tablet", label: "Tablet", width: 768, Icon: Tablet },
  { id: "desktop", label: "Desktop", width: 1024, Icon: Monitor },
] as const;

/**
 * Approximates the published article. The body goes through the backend's
 * sanitizer and then the same `ArticleContent` renderer and `.blog-prose`
 * styles the public site uses, so there is one rendering path, not two.
 */
export function ArticlePreview(props: ArticlePreviewProps) {
  const [device, setDevice] = useState<(typeof DEVICES)[number]["id"]>("desktop");
  const debounced = useDebounce(props.content, 400);
  const width = DEVICES.find((d) => d.id === device)?.width ?? 1024;

  const preview = useQuery({
    queryKey: ["admin", "blog", "preview", debounced],
    queryFn: () => blogAdminApi.preview(debounced),
    enabled: debounced.trim().length > 0,
    staleTime: 60_000,
  });

  const meta = { author: { id: "", name: props.authorName, avatar: null }, publishedAt: props.publishedAt ?? new Date().toISOString(), readingTimeMinutes: preview.data?.readingTimeMinutes ?? 0 };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-kampmax-text-secondary">
          This is how readers will see the article. Narrower widths approximate phones and tablets.
        </p>
        <div role="group" aria-label="Preview width" className="inline-flex rounded-md border border-kampmax-border bg-white p-0.5">
          {DEVICES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={device === id}
              onClick={() => setDevice(id)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded px-2.5 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-kampmax-blue",
                device === id ? "bg-kampmax-navy text-white" : "text-kampmax-text-secondary hover:bg-kampmax-muted"
              )}
            >
              <Icon aria-hidden className="h-3.5 w-3.5" /> {label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-kampmax-border bg-kampmax-muted/40 p-3 sm:p-5">
        <article className="mx-auto bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-8" style={{ maxWidth: width }} aria-label="Article preview">
          {props.categoryName && <p className="text-sm font-medium text-kampmax-blue">{props.categoryName}</p>}
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-kampmax-navy sm:text-4xl">
            {props.title || <span className="text-kampmax-text-muted">Untitled article</span>}
          </h1>
          {props.excerpt && <p className="mt-3 text-lg leading-relaxed text-kampmax-text-secondary">{props.excerpt}</p>}
          <ArticleMeta article={meta} withAvatar className="mt-4" />

          {props.coverImage && (
            <div className="relative mt-6 aspect-[16/9] overflow-hidden rounded-xl bg-kampmax-muted">
              <BlogImage src={props.coverImage} alt={props.title} sizes="768px" />
            </div>
          )}

          <div className="mt-8">
            {!debounced.trim() ? (
              <p className="text-sm text-kampmax-text-muted">Nothing to preview yet. Write something in the Write tab.</p>
            ) : preview.isLoading || debounced !== props.content ? (
              <p role="status" className="text-sm text-kampmax-text-muted">Preparing preview…</p>
            ) : preview.isError ? (
              <p role="alert" className="text-sm text-kampmax-error">
                {preview.error instanceof Error ? preview.error.message : "The preview couldn't be prepared."}
              </p>
            ) : (
              <ArticleContent html={preview.data?.html ?? ""} />
            )}
          </div>

          {props.tagNames.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
              {props.tagNames.map((name) => (
                <li key={name} className="rounded-md bg-kampmax-muted px-3 py-1 text-sm text-kampmax-text-secondary">
                  #{name}
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </div>
  );
}
