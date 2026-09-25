"use client";

import { useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useAddComment, usePostComments } from "@/hooks/use-community";

export function CommentSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const comments = usePostComments(postId);
  const add = useAddComment(postId);

  if (!user) return null;

  const canSend = text.trim().length > 0 && !add.isPending;

  function handleSubmit() {
    if (!canSend) return;
    add.mutate(text.trim(), { onSuccess: () => setText("") });
  }

  return (
    <div className="space-y-3">
      {comments.isLoading ? (
        <p className="text-xs text-kampmax-text-secondary text-center py-4">Loading comments…</p>
      ) : comments.isError ? (
        <div className="text-center py-4">
          <p className="text-xs text-kampmax-text-secondary">Couldn&apos;t load comments.</p>
          <button type="button" onClick={() => comments.refetch()} className="text-xs font-medium text-kampmax-blue mt-1">
            Try again
          </button>
        </div>
      ) : comments.data && comments.data.length > 0 ? (
        <ul className="space-y-3">
          {comments.data.map((comment) => (
            <li key={comment.id} className="flex gap-2.5">
              <div className="w-8 h-8 rounded-full bg-kampmax-navy/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-kampmax-navy">
                {comment.authorName.charAt(0) || "?"}
              </div>
              <div className="flex-1 min-w-0 bg-kampmax-muted/50 rounded-xl px-3 py-2">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-kampmax-text">{comment.authorName || "Unknown"}</span>
                  <span className="text-[9px] text-kampmax-text-secondary">{timeAgo(comment.createdAt)}</span>
                </div>
                <p className="text-sm text-kampmax-text leading-relaxed break-words">{comment.content}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-center py-4">
          <MessageCircle className="h-6 w-6 text-kampmax-text-secondary/30 mx-auto mb-1" />
          <p className="text-xs text-kampmax-text-secondary">No comments yet</p>
        </div>
      )}

      {add.isError && <p className="text-xs text-kampmax-error">Couldn&apos;t post your comment. Try again.</p>}

      <div className="flex gap-2 pt-2 border-t border-kampmax-border">
        <div className="w-8 h-8 rounded-full bg-kampmax-navy text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
          {user.name?.charAt(0) || "?"}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={text}
            maxLength={1000}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Write a comment..."
            className="flex-1 bg-kampmax-muted/50 rounded-xl px-3 py-2 text-sm border border-kampmax-border focus:outline-none focus:border-kampmax-blue"
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSend}
            aria-label="Post comment"
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
              canSend ? "bg-kampmax-blue text-white" : "bg-kampmax-muted text-kampmax-text-secondary"
            )}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
