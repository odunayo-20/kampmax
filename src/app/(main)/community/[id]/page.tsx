"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Flag, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PostCard } from "@/components/community/PostCard";
import { CommentSection } from "@/components/community/CommentSection";
import type { PostReportReason } from "@/services/posts-api";
import { useAuth } from "@/lib/auth-context";
import { useCommunityPost, useDeletePost, useReportPost } from "@/hooks/use-community";

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const postQuery = useCommunityPost(id);
  const remove = useDeletePost();
  const report = useReportPost();
  const [reporting, setReporting] = useState(false);
  const [reason, setReason] = useState<PostReportReason>("SPAM");
  const [details, setDetails] = useState("");
  const post = postQuery.data;

  if (!post) {
    return (
      <PageContainer>
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-sm text-kampmax-text-secondary">
            {postQuery.isLoading ? "Loading post…" : "Post not found"}
          </p>
          {!postQuery.isLoading && (
            <button type="button" onClick={() => router.push("/community")} className="mt-3 text-sm text-kampmax-blue font-medium">
              Back to feed
            </button>
          )}
        </div>
      </PageContainer>
    );
  }

  const isOwner = user?.id === post.authorId;

  return (
    <PageContainer className="space-y-4">
      <button
        type="button"
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-kampmax-text-secondary hover:text-kampmax-text"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <PostCard post={post} linkToDetail={false} />

      {isOwner && (
        <div>
          <button
            type="button"
            disabled={remove.isPending}
            onClick={() => remove.mutate(id, { onSuccess: () => router.push("/community") })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-kampmax-error bg-kampmax-error/10 hover:bg-kampmax-error/20 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            {remove.isPending ? "Deleting…" : "Delete post"}
          </button>
          {remove.isError && <p className="text-xs text-kampmax-error mt-1">Couldn&apos;t delete the post. Try again.</p>}
        </div>
      )}

      {!isOwner &&
        (report.isSuccess ? (
          <p className="text-xs text-kampmax-success">Thanks — we&apos;ll review this post.</p>
        ) : (
          <button
            type="button"
            onClick={() => setReporting(true)}
            className="flex items-center gap-1.5 text-xs text-kampmax-text-secondary hover:text-kampmax-error"
          >
            <Flag className="h-3.5 w-3.5" />
            Report post
          </button>
        ))}

      {reporting && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-5 space-y-3">
            <h3 className="text-base font-bold text-kampmax-text">Report post</h3>
            <div className="space-y-2">
              {(["SPAM", "INAPPROPRIATE", "SCAM", "HARASSMENT", "OTHER"] as PostReportReason[]).map((r) => (
                <label key={r} className="flex items-center gap-3 p-3 rounded-lg border border-kampmax-border cursor-pointer">
                  <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} className="accent-kampmax-blue" />
                  <span className="text-sm capitalize">{r.toLowerCase()}</span>
                </label>
              ))}
            </div>
            <textarea
              value={details}
              maxLength={1000}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
              placeholder="Additional details (optional)"
              className="w-full rounded-lg border border-kampmax-border px-3 py-2 text-sm resize-none focus:outline-none focus:border-kampmax-blue"
            />
            {report.isError && (
              <p className="text-xs text-kampmax-error">
                {report.error instanceof Error && /already/i.test(report.error.message)
                  ? "You've already reported this post."
                  : "Couldn't submit your report. Try again."}
              </p>
            )}
            <div className="flex gap-2">
              <button type="button" onClick={() => setReporting(false)} className="flex-1 py-2.5 rounded-lg border border-kampmax-border text-sm font-medium text-kampmax-text-secondary">
                Cancel
              </button>
              <button
                type="button"
                disabled={report.isPending}
                onClick={() => report.mutate({ id, reason, details: details.trim() || undefined }, { onSuccess: () => setReporting(false) })}
                className="flex-1 py-2.5 rounded-lg bg-kampmax-error text-white text-sm font-semibold disabled:opacity-50"
              >
                {report.isPending ? "Sending…" : "Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-kampmax-border p-4">
        <h3 className="text-sm font-bold text-kampmax-text mb-4">Comments ({post.commentCount})</h3>
        <CommentSection postId={id} />
      </div>
    </PageContainer>
  );
}
