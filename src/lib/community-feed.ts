import type { CommunityPost } from "@/services/posts-api";

/** What the Community tab is showing: the feed, or the official notices. Same rules as the app. */
export type FeedTab = "discussions" | "announcements";
export type DiscussionFilter = "all" | "POLL" | "LOST_FOUND" | "saved";

/** Everything except official notices, narrowed to one kind when a filter is picked. */
export function discussionsOf(posts: CommunityPost[], filter: DiscussionFilter): CommunityPost[] {
  const rest = posts.filter((p) => p.kind !== "ANNOUNCEMENT");
  return filter === "all" || filter === "saved" ? rest : rest.filter((p) => p.kind === filter);
}

/** Urgent notices first, then warnings, then the rest, each group newest first. */
export function sortAnnouncements(posts: CommunityPost[]): CommunityPost[] {
  const rank = { URGENT: 0, WARNING: 1, INFO: 2 } as const;
  return [...posts].sort((a, b) => {
    const byPriority = rank[a.announcement?.priority ?? "INFO"] - rank[b.announcement?.priority ?? "INFO"];
    return byPriority !== 0 ? byPriority : Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

/** What an empty list says, for the tab and filter that is open. */
export function emptyFeedCopy(tab: FeedTab, filter: DiscussionFilter): { title: string; text: string } {
  if (tab === "announcements") return { title: "No announcements yet", text: "Official campus news and updates will show up here." };
  if (filter === "saved") return { title: "Nothing saved yet", text: "Tap the bookmark on a post to keep it here." };
  if (filter === "POLL") return { title: "No polls right now", text: "Start one and let your campus vote." };
  if (filter === "LOST_FOUND") return { title: "Nothing lost or found", text: "Lost something, or found something? Post it here." };
  return { title: "No posts yet", text: "Be the first to share something with your campus." };
}
