import Link from "next/link";
import { MessageCircle, Heart } from "lucide-react";
import { Avatar } from "@/components/ui";
import { timeAgo, cn } from "@/lib/utils";
import type { CommunityPost } from "@/services/posts-api";

interface CampusHighlightCardProps {
  post: CommunityPost;
  className?: string;
}

export function CampusHighlightCard({ post, className }: CampusHighlightCardProps) {
  return (
    <Link
      href={`/community/${post.id}`}
      className={cn(
        "flex-shrink-0 w-[280px] bg-white rounded-lg border border-kampmax-border p-3",
        "hover:border-kampmax-blue/50 hover:shadow-sm transition-all duration-200",
        className
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <Avatar name={post.authorName || "User"} size="sm" />
        <div className="min-w-0 flex-1">
          <span className="text-xs font-medium text-kampmax-text truncate block">{post.authorName}</span>
          <span className="text-[10px] text-kampmax-text-secondary">{timeAgo(post.createdAt)}</span>
        </div>
      </div>
      <p className="text-sm text-kampmax-text line-clamp-3 leading-snug mb-2">{post.content}</p>
      <div className="flex items-center gap-3 text-xs text-kampmax-text-secondary">
        <span className="flex items-center gap-1">
          <Heart className={cn("h-3 w-3", post.likedByMe && "fill-kampmax-error text-kampmax-error")} />
          {post.likeCount}
        </span>
        <span className="flex items-center gap-1">
          <MessageCircle className="h-3 w-3" />
          {post.commentCount}
        </span>
      </div>
    </Link>
  );
}
