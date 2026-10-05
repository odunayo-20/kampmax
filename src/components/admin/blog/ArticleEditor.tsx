"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, ExternalLink, Loader2, Star } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { ErrorState } from "@/components/admin/ErrorState";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { useAdminSession } from "@/lib/admin/admin-auth-context";
import { canAdminPerform } from "@/lib/admin/permissions";
import { useAdminArticle, useBlogCategories, useBlogMutations } from "@/hooks/admin/use-admin-blog";
import { BlogApiValidationError } from "@/services/admin/blog-management.api";
import { cn } from "@/lib/utils";
import type { AdminArticle } from "@/types/blog";
import { ArticleStatusBadge } from "./ArticleStatusBadge";
import { EMPTY_FORM, formFromArticle, isDirty, publishBlockers, toInput, validateForm, withTitle, type ArticleFormState } from "./article-form";
import { BUTTON_PRIMARY, BUTTON_SECONDARY, FIELD_CLASS, formatDateTime, fromLocalInputValue, toLocalInputValue } from "./blog-meta";
import { ImageField } from "./ImageField";
import { MarkdownEditor } from "./MarkdownEditor";
import { SeoSection } from "./SeoSection";
import { TagPicker } from "./TagPicker";
import { ToastStack, useToasts } from "./useToasts";

function Card({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border border-kampmax-border bg-white", className)}>
      <h2 className="border-b border-kampmax-border px-4 py-2.5 text-sm font-semibold text-kampmax-text">{title}</h2>
      <div className="space-y-4 p-4">{children}</div>
    </section>
  );
}

export function ArticleEditor({ articleId }: { articleId?: string }) {
  const router = useRouter();
  const isNew = !articleId;
  const { admin } = useAdminSession();
  const can = {
    create: admin ? canAdminPerform(admin, "blog", "create") : false,
    update: admin ? canAdminPerform(admin, "blog", "update") : false,
    publish: admin ? canAdminPerform(admin, "blog", "publish") : false,
    delete: admin ? canAdminPerform(admin, "blog", "delete") : false,
    tags: admin ? canAdminPerform(admin, "blog", "manageTags") : false,
  };

  const articleQuery = useAdminArticle(articleId ?? null);
  const categories = useBlogCategories();
  const mutations = useBlogMutations();
  const toasts = useToasts();

  const [form, setForm] = useState<ArticleFormState>(EMPTY_FORM);
  const [baseline, setBaseline] = useState<ArticleFormState>(EMPTY_FORM);
  const [article, setArticle] = useState<AdminArticle | null>(null);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [showErrors, setShowErrors] = useState(false);
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [publishAt, setPublishAt] = useState("");
  const [busy, setBusy] = useState<null | "save" | "publish" | "other">(null);
  const [confirm, setConfirm] = useState<null | "unpublish" | "archive" | "delete">(null);

  // Populate once per loaded article (never clobber in-progress edits on refetch).
  useEffect(() => {
    const data = articleQuery.data;
    if (data && loadedFor !== data.id) {
      const next = formFromArticle(data);
      setForm(next);
      setBaseline(next);
      setArticle(data);
      setLoadedFor(data.id);
      setPublishAt(toLocalInputValue(data.status === "SCHEDULED" ? data.publishedAt : null));
      setMode(data.status === "SCHEDULED" ? "schedule" : "now");
    }
  }, [articleQuery.data, loadedFor]);

  const dirty = isDirty(form, baseline);
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const errors = useMemo(() => validateForm(form), [form]);
  const blockers = useMemo(() => publishBlockers(form), [form]);
  const hasErrors = Object.keys(errors).length > 0;
  const readOnly = isNew ? !can.create : !can.update;
  const status = article?.status;
  const locked = status === "ARCHIVED";

  const patch = useCallback((p: Partial<ArticleFormState>) => setForm((f) => ({ ...f, ...p })), []);

  const reportError = useCallback((error: unknown) => {
    if (error instanceof BlogApiValidationError) {
      setServerErrors(error.messages);
      toasts.error("Some fields need attention.");
    } else {
      setServerErrors([]);
      toasts.error(error instanceof Error ? error.message : "That didn't work. Try again.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const adopt = useCallback((saved: AdminArticle) => {
    const next = formFromArticle(saved);
    setArticle(saved);
    setForm(next);
    setBaseline(next);
    setLoadedFor(saved.id);
  }, []);

  /** Saves edits. Returns the saved article, or null if blocked/failed. */
  const save = useCallback(async (): Promise<AdminArticle | null> => {
    setShowErrors(true);
    if (hasErrors) {
      toasts.error("Fix the highlighted fields first.");
      return null;
    }
    setServerErrors([]);
    try {
      if (isNew) {
        const created = await mutations.create.mutateAsync(toInput(form, { isNew: true }));
        adopt(created);
        router.replace(`/admin/blog/${created.id}`);
        return created;
      }
      if (!article) return null;
      const saved = await mutations.update.mutateAsync({ id: article.id, input: { ...toInput(form, { isNew: false, originalSlug: article.slug }), expectedUpdatedAt: article.updatedAt } });
      adopt(saved);
      return saved;
    } catch (error) {
      reportError(error);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, hasErrors, isNew, article]);

  async function onSaveDraft() {
    setBusy("save");
    const saved = await save();
    setBusy(null);
    if (saved) toasts.success(isNew ? "Draft created." : "Changes saved.");
  }

  async function onPublish() {
    setShowErrors(true);
    if (blockers.length) {
      toasts.error(`Add ${blockers.join(", ")} before publishing.`);
      return;
    }
    const when = mode === "schedule" ? fromLocalInputValue(publishAt) : null;
    if (mode === "schedule" && (!when || new Date(when) <= new Date())) {
      toasts.error("Choose a future date and time to schedule.");
      return;
    }
    setBusy("publish");
    const saved = await save();
    if (saved) {
      try {
        const published = await mutations.publish.mutateAsync({ id: saved.id, publishAt: when ?? undefined });
        adopt(published);
        toasts.success(published.status === "SCHEDULED" ? `Scheduled for ${formatDateTime(published.publishedAt)}.` : "Article published.");
      } catch (error) {
        reportError(error);
      }
    }
    setBusy(null);
  }

  async function lifecycle(kind: "unpublish" | "archive" | "restore" | "feature" | "unfeature" | "delete") {
    if (!article) return;
    setBusy("other");
    try {
      if (kind === "delete") {
        await mutations.remove.mutateAsync(article.id);
        toasts.success("Article deleted.");
        router.replace("/admin/blog");
        return;
      }
      const result =
        kind === "unpublish" ? await mutations.unpublish.mutateAsync(article.id)
        : kind === "archive" ? await mutations.archive.mutateAsync(article.id)
        : kind === "restore" ? await mutations.restore.mutateAsync(article.id)
        : await mutations.feature.mutateAsync({ id: article.id, featured: kind === "feature" });
      // Keep unsaved edits; only the lifecycle fields change.
      setArticle(result);
      setBaseline((b) => ({ ...b, slug: result.slug }));
      toasts.success(kind === "feature" ? "Article is now featured." : kind === "unfeature" ? "Removed from featured." : kind === "unpublish" ? "Moved back to draft." : kind === "archive" ? "Article archived." : "Restored as a draft.");
    } catch (error) {
      reportError(error);
    } finally {
      setBusy(null);
      setConfirm(null);
    }
  }

  if (!isNew && articleQuery.isLoading) return <LoadingSkeleton variant="cards" rows={4} />;
  if (!isNew && articleQuery.isError) {
    return <ErrorState title="Couldn't load this article" message={articleQuery.error instanceof Error ? articleQuery.error.message : undefined} onRetry={() => void articleQuery.refetch()} />;
  }

  const fieldError = (key: keyof typeof errors) => (showErrors || form.title || form.slug ? errors[key] : undefined);
  const disabled = readOnly || locked || busy !== null;
  const activeCategories = categories.data?.filter((c) => c.isActive || c.id === form.categoryId) ?? [];

  return (
    <>
      <Link href="/admin/blog" className="mb-3 inline-flex items-center gap-1 text-sm text-kampmax-text-secondary hover:text-kampmax-text">
        <ArrowLeft aria-hidden className="h-4 w-4" /> All articles
      </Link>
      <AdminPageHeader
        title={isNew ? "New article" : "Edit article"}
        description={isNew ? "Saved as a draft until you publish it." : undefined}
        actions={
          <>
            {status && <ArticleStatusBadge status={status} />}
            {dirty && <span className="text-xs text-warning-700" role="status">Unsaved changes</span>}
            {status === "PUBLISHED" && article && (
              <a href={`/blog/${article.slug}`} target="_blank" rel="noopener noreferrer" className={BUTTON_SECONDARY}>
                <ExternalLink aria-hidden className="h-4 w-4" /> View live
              </a>
            )}
            {!readOnly && !locked && (
              <button type="button" onClick={() => void onSaveDraft()} disabled={busy !== null || (!isNew && !dirty)} className={BUTTON_SECONDARY}>
                {busy === "save" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                {isNew ? "Save draft" : "Save changes"}
              </button>
            )}
          </>
        }
      />

      {readOnly && (
        <p role="status" className="mb-4 rounded-lg border border-kampmax-border bg-kampmax-muted px-3 py-2 text-sm text-kampmax-text-secondary">
          You have read-only access to the blog, so editing is disabled.
        </p>
      )}
      {locked && (
        <p role="status" className="mb-4 rounded-lg border border-warning-100 bg-warning-50 px-3 py-2 text-sm text-warning-700">
          This article is archived. Restore it as a draft to edit it.
        </p>
      )}
      {serverErrors.length > 0 && (
        <div role="alert" className="mb-4 flex gap-2 rounded-lg border border-kampmax-error/30 bg-error-50 p-3 text-sm text-error-700">
          <AlertCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
          <ul className="list-disc pl-4">{serverErrors.map((m) => <li key={m}>{m}</li>)}</ul>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Main column */}
        <div className="space-y-5">
          <Card title="Content">
            <div>
              <label htmlFor="article-title" className="mb-1 block text-xs font-medium text-kampmax-text">Title</label>
              <input id="article-title" value={form.title} disabled={disabled} maxLength={200} onChange={(e) => setForm((f) => withTitle(f, e.target.value, isNew))} placeholder="A clear, specific headline" className={cn(FIELD_CLASS, "text-base font-medium")} aria-invalid={!!fieldError("title")} aria-describedby={fieldError("title") ? "title-error" : undefined} />
              {fieldError("title") && <p id="title-error" role="alert" className="mt-1 text-xs text-kampmax-error">{errors.title}</p>}
            </div>

            <div>
              <label htmlFor="article-slug" className="mb-1 block text-xs font-medium text-kampmax-text">URL slug</label>
              <div className="flex items-center rounded-lg border border-kampmax-border bg-white focus-within:border-kampmax-blue focus-within:ring-1 focus-within:ring-kampmax-blue">
                <span className="select-none pl-3 text-sm text-kampmax-text-muted">/blog/</span>
                <input id="article-slug" value={form.slug} disabled={disabled} maxLength={120} onChange={(e) => patch({ slug: e.target.value.toLowerCase(), slugTouched: true })} placeholder="generated-from-title" className="w-full bg-transparent px-1.5 py-2 text-sm focus:outline-none disabled:text-kampmax-text-muted" aria-invalid={!!errors.slug} />
              </div>
              {errors.slug ? <p role="alert" className="mt-1 text-xs text-kampmax-error">{errors.slug}</p>
                : !isNew && article?.status !== "DRAFT" ? <p className="mt-1 text-xs text-kampmax-text-muted">Changing a live URL is safe: the old link redirects to the new one.</p>
                : null}
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between">
                <label htmlFor="article-excerpt" className="text-xs font-medium text-kampmax-text">Excerpt</label>
                <span className={cn("text-xs tabular-nums", form.excerpt.length > 320 ? "text-kampmax-error" : "text-kampmax-text-muted")}>{form.excerpt.length}/320</span>
              </div>
              <textarea id="article-excerpt" value={form.excerpt} disabled={disabled} rows={2} onChange={(e) => patch({ excerpt: e.target.value })} placeholder="One or two sentences shown on cards and in search results. Generated from the article if left empty." className={cn(FIELD_CLASS, "resize-y")} aria-invalid={!!errors.excerpt} />
              {errors.excerpt && <p role="alert" className="mt-1 text-xs text-kampmax-error">{errors.excerpt}</p>}
            </div>

            <div>
              <p className="mb-1 text-xs font-medium text-kampmax-text">Article body</p>
              <MarkdownEditor value={form.content} onChange={(content) => patch({ content })} disabled={disabled} />
            </div>
          </Card>

          <Card title="SEO & social">
            <SeoSection
              values={{ seoTitle: form.seoTitle, seoDescription: form.seoDescription, canonicalUrl: form.canonicalUrl, ogImage: form.ogImage }}
              errors={errors}
              fallbackTitle={form.title}
              fallbackDescription={form.excerpt}
              slug={form.slug}
              disabled={disabled}
              onChange={(p) => patch(p)}
              onError={toasts.error}
            />
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <Card title="Publishing">
            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-kampmax-text-secondary">Status</dt>
              <dd>{status ? <ArticleStatusBadge status={status} /> : <span className="text-kampmax-text-muted">Not saved yet</span>}</dd>
              <dt className="text-kampmax-text-secondary">Author</dt>
              <dd className="text-kampmax-text">{article?.author.name ?? admin?.name ?? "You"}</dd>
              {article?.publishedAt && (<><dt className="text-kampmax-text-secondary">{status === "SCHEDULED" ? "Goes live" : "Published"}</dt><dd className="text-kampmax-text">{formatDateTime(article.publishedAt)}</dd></>)}
              {article && (<><dt className="text-kampmax-text-secondary">Updated</dt><dd className="text-kampmax-text">{formatDateTime(article.updatedAt)}</dd></>)}
            </dl>

            {can.publish && !locked && status !== "PUBLISHED" && (
              <fieldset className="space-y-2">
                <legend className="sr-only">When to publish</legend>
                <label className="flex items-center gap-2 text-sm text-kampmax-text"><input type="radio" name="when" checked={mode === "now"} onChange={() => setMode("now")} className="accent-kampmax-blue" /> Publish immediately</label>
                <label className="flex items-center gap-2 text-sm text-kampmax-text"><input type="radio" name="when" checked={mode === "schedule"} onChange={() => setMode("schedule")} className="accent-kampmax-blue" /> Schedule for later</label>
                {mode === "schedule" && (
                  <div>
                    <label htmlFor="publish-at" className="sr-only">Publish date and time</label>
                    <input id="publish-at" type="datetime-local" value={publishAt} min={toLocalInputValue(new Date().toISOString())} onChange={(e) => setPublishAt(e.target.value)} className={FIELD_CLASS} />
                  </div>
                )}
              </fieldset>
            )}

            {blockers.length > 0 && !locked && status !== "PUBLISHED" && (
              <p className="text-xs text-kampmax-text-muted">To publish, add {blockers.join(", ")}.</p>
            )}

            <div className="flex flex-wrap gap-2">
              {can.publish && !locked && status !== "PUBLISHED" && (
                <button type="button" onClick={() => void onPublish()} disabled={busy !== null || blockers.length > 0 || hasErrors} className={cn(BUTTON_PRIMARY, "flex-1")}>
                  {busy === "publish" && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                  {mode === "schedule" ? "Schedule" : status === "SCHEDULED" ? "Publish now" : "Publish"}
                </button>
              )}
              {can.publish && (status === "PUBLISHED" || status === "SCHEDULED") && (
                <button type="button" onClick={() => setConfirm("unpublish")} disabled={busy !== null} className={BUTTON_SECONDARY}>Unpublish</button>
              )}
              {can.update && locked && (
                <button type="button" onClick={() => void lifecycle("restore")} disabled={busy !== null} className={BUTTON_PRIMARY}>Restore as draft</button>
              )}
            </div>

            {can.publish && status === "PUBLISHED" && article && (
              <button type="button" onClick={() => void lifecycle(article.isFeatured ? "unfeature" : "feature")} disabled={busy !== null} className={cn(BUTTON_SECONDARY, "w-full")} aria-pressed={article.isFeatured}>
                <Star aria-hidden className={cn("h-4 w-4", article.isFeatured && "fill-kampmax-gold text-kampmax-gold")} />
                {article.isFeatured ? "Featured on blog" : "Feature on blog"}
              </button>
            )}

            {article && (can.delete) && (
              <div className="flex gap-3 border-t border-kampmax-border pt-3 text-sm">
                {!locked && <button type="button" onClick={() => setConfirm("archive")} disabled={busy !== null} className="text-kampmax-text-secondary hover:text-kampmax-text hover:underline">Archive</button>}
                <button type="button" onClick={() => setConfirm("delete")} disabled={busy !== null} className="text-kampmax-error hover:underline">Delete</button>
              </div>
            )}
          </Card>

          <Card title="Organisation">
            <div>
              <label htmlFor="article-category" className="mb-1 block text-xs font-medium text-kampmax-text">Category</label>
              <select id="article-category" value={form.categoryId} disabled={disabled || categories.isLoading} onChange={(e) => patch({ categoryId: e.target.value })} className={FIELD_CLASS}>
                <option value="">Choose a category…</option>
                {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}{c.isActive ? "" : " (archived)"}</option>)}
              </select>
              {categories.isError && <p role="alert" className="mt-1 text-xs text-kampmax-error">Couldn&apos;t load categories.</p>}
            </div>
            <div>
              <p className="mb-1 text-xs font-medium text-kampmax-text">Tags</p>
              <TagPicker selectedIds={form.tagIds} onChange={(tagIds) => patch({ tagIds })} canCreate={can.tags} disabled={disabled} onError={toasts.error} />
            </div>
          </Card>

          <Card title="Cover image">
            <ImageField
              label="Cover image"
              hint="Shown at the top of the article and on cards. 16:9, at least 1200px wide."
              url={form.coverImage}
              disabled={disabled}
              onChange={({ url, mediaId }) => patch({ coverImage: url, coverImageMediaId: mediaId })}
              onError={toasts.error}
            />
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === "unpublish"}
        tone="warning"
        title="Unpublish this article?"
        message="It will disappear from the public blog and return to draft."
        confirmLabel="Unpublish"
        loading={busy === "other"}
        onConfirm={() => void lifecycle("unpublish")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "archive"}
        tone="warning"
        title="Archive this article?"
        message="It will be hidden from the public blog but kept on file. You can restore it later."
        confirmLabel="Archive"
        loading={busy === "other"}
        onConfirm={() => void lifecycle("archive")}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm === "delete"}
        tone="danger"
        title="Delete this article?"
        message="It is removed from the console and the public blog. This cannot be undone from here."
        confirmLabel="Delete article"
        loading={busy === "other"}
        onConfirm={() => void lifecycle("delete")}
        onCancel={() => setConfirm(null)}
      />
      <ToastStack toasts={toasts.toasts} />
    </>
  );
}
