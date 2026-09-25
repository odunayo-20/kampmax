"use client";

import { useState } from "react";
import Link from "next/link";
import { Flag, MessageSquare, Pencil, ShieldCheck, Star, Trash2, X, Check } from "lucide-react";
import {
  useDeleteReviewReply,
  useReplyToReview,
  useReportReview,
  useUpdateReviewReply,
} from "@/hooks/use-vendor-reviews";
import { timeAgo } from "@/lib/utils";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewImageGallery } from "@/components/reviews/ReviewImageGallery";
import { ReportReviewModal } from "@/components/reviews/ReportReviewModal";
import { Button } from "@/components/ui";
import type { Review } from "@/types";
import type { VendorReviewPermissions, VendorReviewReportInput } from "@/types/vendor-reviews";

interface VendorReviewListItemProps {
  review: Review;
  productTitle?: string;
  permissions: VendorReviewPermissions;
  onChanged: () => void;
}

export function VendorReviewListItem({ review, productTitle, permissions, onChanged }: VendorReviewListItemProps) {
  const authorName = review.authorName;
  const replyMutation = useReplyToReview();
  const updateMutation = useUpdateReviewReply();
  const deleteMutation = useDeleteReviewReply();
  const reportMutation = useReportReview();
  const busy =
    replyMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reportMutation.isPending;
  const [respondOpen, setRespondOpen] = useState(false);
  const [respondText, setRespondText] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [editText, setEditText] = useState(review.vendorResponse?.text ?? "");
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isReported = Boolean(review.reportedBy && review.reportedBy.length > 0);
  const canRespond = permissions["reviews.respond"];

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      setRespondOpen(false);
      setEditOpen(false);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const submitResponse = () => run(() => replyMutation.mutateAsync({ id: review.id, text: respondText }));
  const submitEdit = () => run(() => updateMutation.mutateAsync({ id: review.id, text: editText }));
  const submitDelete = () => run(() => deleteMutation.mutateAsync(review.id));
  const submitReport = (input: VendorReviewReportInput) =>
    run(() => reportMutation.mutateAsync({ id: review.id, reason: input.reason, details: input.details }));

  return (
    <div className="rounded-xl border border-kampmax-border bg-white p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kampmax-blue/10 text-xs font-bold text-kampmax-blue">
            {authorName ? authorName.charAt(0) : "?"}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-kampmax-text">{authorName || "Anonymous"}</span>
              {review.verifiedPurchase && (
                <span className="inline-flex items-center gap-0.5 rounded bg-kampmax-blue/5 px-1.5 py-0.5 text-[10px] font-medium text-kampmax-blue">
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                  Verified
                </span>
              )}
            </div>
            <div className="mt-0.5 flex items-center gap-2">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-[10px] text-kampmax-text-secondary">{timeAgo(review.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1">
          {review.target === "vendor" ? (
            <span className="rounded-full bg-kampmax-info/10 px-2 py-0.5 text-[10px] font-medium text-kampmax-info">
              Store review
            </span>
          ) : (
            <span className="rounded-full bg-kampmax-success/10 px-2 py-0.5 text-[10px] font-medium text-kampmax-success">
              Product review
            </span>
          )}
          {isReported && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-kampmax-error">
              <Flag className="h-3 w-3" aria-hidden />
              Reported
            </span>
          )}
        </div>
      </div>

      {/* Product context */}
      {review.target === "product" && review.productId && (
        <p className="mt-2.5 text-xs text-kampmax-text-secondary">
          About{" "}
          <Link
            href={`/vendor/products/${review.productId}`}
            className="font-medium text-kampmax-blue hover:underline"
          >
            {productTitle ?? review.productTitle ?? "a product"}
          </Link>
        </p>
      )}

      {review.title && <p className="mt-1.5 text-sm font-semibold text-kampmax-text">{review.title}</p>}
      <p className="mt-1 text-sm leading-relaxed text-kampmax-text-secondary">{review.comment}</p>

      {review.images && review.images.length > 0 && <ReviewImageGallery images={review.images} />}

      {/* Vendor response */}
      {review.vendorResponse && (
        <div className="mt-3 rounded-lg border border-kampmax-blue/10 bg-kampmax-blue/5 p-3">
          {editOpen ? (
            <div className="space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                maxLength={500}
                className="w-full resize-none rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none"
                aria-label="Edit your response"
              />
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={submitEdit} disabled={busy || !editText.trim()}>
                  <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
                  Save
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-kampmax-blue">Your reply</span>
                  <span className="text-[10px] text-kampmax-text-secondary">{timeAgo(review.vendorResponse.createdAt)}</span>
                </p>
                {canRespond && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditText(review.vendorResponse!.text);
                        setEditOpen(true);
                      }}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-kampmax-text-secondary hover:bg-kampmax-muted"
                    >
                      <Pencil className="h-3 w-3" aria-hidden />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={submitDelete}
                      className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] font-medium text-kampmax-error hover:bg-kampmax-muted"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden />
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs leading-relaxed text-kampmax-text-secondary">{review.vendorResponse.text}</p>
            </>
          )}
        </div>
      )}

      {/* Actions + errors */}
      {error && (
        <p className="mt-2 rounded-lg bg-kampmax-error/10 px-3 py-2 text-xs font-medium text-kampmax-error" role="alert">
          {error}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-kampmax-text-secondary">
          <Star className="h-3.5 w-3.5 fill-kampmax-gold text-kampmax-gold" aria-hidden />
          {review.helpfulCount} helpful
        </span>

        {canRespond && !review.vendorResponse && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setError(null);
              setRespondOpen((v) => !v);
            }}
          >
            <MessageSquare className="mr-1 h-3.5 w-3.5" aria-hidden />
            Reply
          </Button>
        )}

        {permissions["reviews.report"] && !isReported && (
          <Button variant="ghost" size="sm" onClick={() => setReportOpen(true)} className="text-kampmax-error hover:text-kampmax-error">
            <Flag className="mr-1 h-3.5 w-3.5" aria-hidden />
            Report
          </Button>
        )}
      </div>

      {respondOpen && (
        <div className="mt-3 space-y-2">
          <textarea
            value={respondText}
            onChange={(e) => setRespondText(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Write a public response to this review…"
            className="w-full resize-none rounded-lg border border-kampmax-border bg-white px-3 py-2 text-sm focus:border-kampmax-blue focus:outline-none"
            aria-label="Response text"
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={submitResponse} disabled={busy || !respondText.trim()}>
              <Check className="mr-1 h-3.5 w-3.5" aria-hidden />
              Post response
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setRespondOpen(false); setRespondText(""); setError(null); }}>
              <X className="mr-1 h-3.5 w-3.5" aria-hidden />
              Cancel
            </Button>
          </div>
        </div>
      )}

      <ReportReviewModal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        onSubmit={(reason, details) => submitReport({ reason, details })}
      />
    </div>
  );
}