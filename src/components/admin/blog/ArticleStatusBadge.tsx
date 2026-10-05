import { cn } from "@/lib/utils";
import type { ArticleStatus } from "@/types/blog";
import { STATUS_LABEL, STATUS_TONE } from "./blog-meta";

/** Text label always accompanies the colour, so status never relies on colour alone. */
export function ArticleStatusBadge({ status, className }: { status: ArticleStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_TONE[status],
        className
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
