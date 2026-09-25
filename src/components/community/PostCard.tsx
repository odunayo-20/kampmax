"use client";

import { useRouter } from "next/navigation";
import { Heart, MessageCircle, Store } from "lucide-react";
import { cn, timeAgo } from "@/lib/utils";
import { useTogglePostLike } from "@/hooks/use-community";
import type { CommunityPost } from "@/services/posts-api";

export function PostCard({ post, linkToDetail = true }: { post: CommunityPost; linkToDetail?: boolean }) {
  const router = useRouter();
  const like = useTogglePostLike();

  // Show the pending toggle immediately; the refetch after settle is authoritative.
  const pending = like.isPending ? like.variables : undefined;
  const liked = pending ? pending.liked : post.likedByMe;
  const likeCount = pending ? post.likeCount + (pending.liked ? 1 : -1) : post.likeCount;

  const goToDetail = () => {
    if (linkToDetail) router.push(`/community/${post.id}`);
  };

  return (
    <article className="bg-white rounded-xl border border-kampmax-border overflow-hidden">
      <div className="px-4 pt-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-kampmax-navy/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-kampmax-navy">
          {post.vendorName ? <Store className="h-4 w-4" aria-hidden /> : post.authorName.charAt(0) || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-kampmax-text truncate">{post.authorName || "Unknown"}</p>
          <p className="text-[10px] text-kampmax-text-secondary">{timeAgo(post.createdAt)}</p>
        </div>
      </div>

      <div className={cn("px-4 py-3", linkToDetail && "cursor-pointer")} onClick={goToDetail}>
        {post.content && (
          <p className="text-sm text-kampmax-text leading-relaxed whitespace-pre-line break-words">{post.content}</p>
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
      </div>
    </article>
  );
}
