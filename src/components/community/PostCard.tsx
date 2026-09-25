"use client";

import { useRouter } from "next/navigation";
import { AlertTriangle, Bookmark, BookmarkCheck, CheckCircle2, Heart, MapPin, Megaphone, MessageCircle, Store } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useResolveLostFound, useToggleSavePost, useTogglePostLike, useVotePoll } from "@/hooks/use-community";
import type { CommunityPost } from "@/services/posts-api";

const PRIORITY_STYLE = {
  INFO: "bg-kampmax-blue/10 text-kampmax-blue",
  WARNING: "bg-kampmax-gold/15 text-kampmax-warning",
  URGENT: "bg-kampmax-error/10 text-kampmax-error",
} as const;

function PollView({ post }: { post: CommunityPost }) {
  const vote = useVotePoll();
  const poll = post.poll!;
  const pendingIdx = vote.isPending ? vote.variables?.optionIndex : undefined;
  const myVote = pendingIdx ?? poll.myVote;
  const canVote = !poll.closed && !vote.isPending;

  return (
    <div className="mt-3 space-y-2">
      {poll.options.map((option, i) => {
        const pct = poll.totalVotes > 0 ? Math.round((option.votes / poll.totalVotes) * 100) : 0;
        const mine = myVote === i;
        return (
          <button
            key={i}
            type="button"
            disabled={!canVote}
            onClick={(e) => {
              e.stopPropagation();
              vote.mutate({ id: post.id, optionIndex: i });
            }}
            className={cn(
              "relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm",
              mine ? "border-kampmax-blue" : "border-kampmax-border"
            )}
          >
            <span className="absolute inset-y-0 left-0 bg-kampmax-blue/10" style={{ width: `${pct}%` }} />
            <span className="relative flex justify-between gap-2">
              <span className="truncate">{option.text}</span>
              <span className="text-xs text-kampmax-text-secondary">{pct}%</span>
            </span>
          </button>
        );
      })}
      <p className="text-[11px] text-kampmax-text-secondary">
        {poll.totalVotes} vote{poll.totalVotes !== 1 ? "s" : ""} ·{" "}
        {poll.closed ? "Poll closed" : `Ends ${new Date(poll.endsAt).toLocaleDateString("en-NG", { month: "short", day: "numeric" })}`}
      </p>
      {vote.isError && <p className="text-xs text-kampmax-error">Couldn&apos;t record your vote.</p>}
    </div>
  );
}

export function PostCard({ post, linkToDetail = true }: { post: CommunityPost; linkToDetail?: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const like = useTogglePostLike();
  const save = useToggleSavePost();
  const resolve = useResolveLostFound();

  // Show the pending toggle immediately; the refetch after settle is authoritative.
  const pending = like.isPending ? like.variables : undefined;
  const liked = pending ? pending.liked : post.likedByMe;
  const likeCount = pending ? post.likeCount + (pending.liked ? 1 : -1) : post.likeCount;
  const saved = save.isPending ? !!save.variables?.saved : post.savedByMe;

  const goToDetail = () => {
    if (linkToDetail) router.push(`/community/${post.id}`);
  };

  return (
    <article className="bg-white rounded-xl border border-kampmax-border overflow-hidden">
      <div className="px-4 pt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-kampmax-navy/10 flex items-center justify-center shrink-0 text-sm font-bold text-kampmax-navy">
          {post.vendorName ? <Store className="h-4 w-4" aria-hidden /> : post.authorName.charAt(0) || "?"}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-kampmax-text truncate">{post.authorName || "Unknown"}</p>
          <p className="text-[10px] text-kampmax-text-secondary">{timeAgo(post.createdAt)}</p>
        </div>
        {post.announcement && (
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", PRIORITY_STYLE[post.announcement.priority])}>
            <Megaphone className="h-3 w-3" /> Announcement
          </span>
        )}
        {post.kind === "POLL" && (
          <span className="rounded-full bg-kampmax-navy/10 px-2 py-0.5 text-[10px] font-semibold text-kampmax-navy">Poll</span>
        )}
      </div>

      <div className={cn("px-4 py-3", linkToDetail && "cursor-pointer")} onClick={goToDetail}>
        {post.content && (
          <p className="text-sm text-kampmax-text leading-relaxed whitespace-pre-line wrap-break-word">{post.content}</p>
        )}

        {post.poll && <PollView post={post} />}

        {post.lostFound && (
          <div className="mt-3 rounded-lg bg-kampmax-gold/10 border border-kampmax-gold/30 p-3 text-xs space-y-1">
            <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-kampmax-warning text-[10px]">
              {post.lostFound.resolved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
              {post.lostFound.resolved ? "Resolved" : post.lostFound.status}
            </div>
            <p className="text-kampmax-text">{post.lostFound.item}</p>
            <p className="flex items-center gap-1 text-kampmax-text-secondary">
              <MapPin className="h-3 w-3" /> {post.lostFound.location}
            </p>
            {post.lostFound.contact && <p className="text-kampmax-text-secondary">Contact: {post.lostFound.contact}</p>}
            {user?.id === post.authorId && !post.lostFound.resolved && (
              <button
                type="button"
                disabled={resolve.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  resolve.mutate(post.id);
                }}
                className="mt-1 rounded-md bg-kampmax-navy px-2 py-1 text-[11px] font-semibold text-white disabled:opacity-50"
              >
                {resolve.isPending ? "Saving…" : "Mark as resolved"}
              </button>
            )}
          </div>
        )}

        {post.images.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl overflow-hidden">
            {post.images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="" className="h-40 w-full object-cover bg-kampmax-muted" />
            ))}
          </div>
        )}
      </div>

      <div className="px-4 py-2.5 border-t border-kampmax-border flex items-center gap-1">
        <button
          type="button"
          disabled={like.isPending}
          onClick={() => like.mutate({ id: post.id, liked: !post.likedByMe })}
          aria-pressed={liked}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            liked ? "text-kampmax-blue bg-kampmax-blue/10" : "text-kampmax-text-secondary hover:bg-kampmax-muted"
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-kampmax-blue")} />
          {likeCount}
        </button>
        <button
          type="button"
          onClick={() => router.push(`/community/${post.id}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-kampmax-text-secondary hover:bg-kampmax-muted transition-colors"
        >
          <MessageCircle className="h-4 w-4" />
          {post.commentCount}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => save.mutate({ id: post.id, saved: !post.savedByMe })}
          aria-label={saved ? "Unsave post" : "Save post"}
          aria-pressed={saved}
          className={cn("p-1.5 rounded-lg transition-colors", saved ? "text-kampmax-blue" : "text-kampmax-text-secondary hover:bg-kampmax-muted")}
        >
          {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
        </button>
      </div>
    </article>
  );
}
