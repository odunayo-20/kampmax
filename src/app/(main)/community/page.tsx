"use client";

import { useRouter } from "next/navigation";
import { MessageCircle, Plus } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PostCard } from "@/components/community/PostCard";
import { CommunityEventCard } from "@/components/community/EventCard";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { useCommunityFeed, useUpcomingEvents } from "@/hooks/use-community";

export default function CommunityFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCampus } = useApp();
  const campusId = selectedCampus?.id ?? "";
  const feed = useCommunityFeed(campusId);
  const events = useUpcomingEvents(campusId);

  if (!user) return null;

  const posts = feed.data?.items ?? [];

  return (
    <PageContainer className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-kampmax-text">Campus Community</h1>
          {feed.data && (
            <p className="text-xs text-kampmax-text-secondary">
              {selectedCampus?.name ? `${selectedCampus.name} · ` : ""}
              {feed.data.total} post{feed.data.total !== 1 ? "s" : ""}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => router.push("/community/events/create")}
          className="ml-auto mr-2 px-3 py-2 rounded-xl border border-kampmax-border bg-white text-xs font-semibold text-kampmax-text"
        >
          Event
        </button>
        <button
          type="button"
          onClick={() => router.push("/community/create")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-kampmax-blue text-white text-xs font-semibold"
        >
          <Plus className="h-4 w-4" />
          Post
        </button>
      </div>

      {events.data && events.data.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-kampmax-text-secondary px-1">Upcoming events</h2>
          {events.data.slice(0, 3).map((event) => (
            <CommunityEventCard key={event.id} event={event} />
          ))}
        </section>
      )}

      {feed.isLoading ? (
        <p className="text-sm text-kampmax-text-secondary text-center py-12">Loading posts…</p>
      ) : feed.isError ? (
        <div className="bg-white rounded-xl border border-kampmax-border p-8 text-center">
          <p className="text-sm font-medium text-kampmax-text">Couldn&apos;t load the community feed.</p>
          <button type="button" onClick={() => feed.refetch()} className="mt-2 text-sm text-kampmax-blue font-medium">
            Try again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-xl border border-kampmax-border p-12 text-center">
          <MessageCircle className="h-12 w-12 text-kampmax-text-secondary/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-kampmax-text">No posts yet</p>
          <p className="text-xs text-kampmax-text-secondary mt-1">Be the first to post on your campus.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </PageContainer>
  );
}
