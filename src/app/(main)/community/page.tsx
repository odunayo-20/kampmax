"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Users,
  Plus,
  Calendar,
  MessageCircle,
  Megaphone,
  Sparkles,
  HelpCircle,
  Vote,
  Bookmark,
  ChevronRight,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { PostCard } from "@/components/community/PostCard";
import { CommunityEventCard } from "@/components/community/EventCard";
import { useAuth } from "@/lib/auth-context";
import { useApp } from "@/lib/app-context";
import { useCommunityFeed, useSavedPosts, useUpcomingEvents } from "@/hooks/use-community";

type CommunityMainTab = "discussions" | "announcements";
type DiscussionSubTab = "all" | "POLL" | "LOST_FOUND" | "saved";

const DISCUSSION_SUBTABS: { id: DiscussionSubTab; label: string; icon?: React.ElementType }[] = [
  { id: "all", label: "All" },
  { id: "POLL", label: "Polls", icon: Vote },
  { id: "LOST_FOUND", label: "Lost & Found", icon: HelpCircle },
  { id: "saved", label: "Saved", icon: Bookmark },
];

export default function CommunityFeedPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selectedCampus } = useApp();
  const campusId = selectedCampus?.id ?? "";

  const feed = useCommunityFeed(campusId);
  const events = useUpcomingEvents(campusId);

  const [mainTab, setMainTab] = useState<CommunityMainTab>("discussions");
  const [discussionTab, setDiscussionTab] = useState<DiscussionSubTab>("all");

  const saved = useSavedPosts(discussionTab === "saved");

  // Determine active source & posts based on selection
  const source = discussionTab === "saved" ? saved : feed;
  const rawPosts = discussionTab === "saved" ? (saved.data ?? []) : (feed.data?.items ?? []);

  const discussionPosts =
    discussionTab === "all" || discussionTab === "saved"
      ? rawPosts.filter((p) => p.kind !== "ANNOUNCEMENT")
      : rawPosts.filter((p) => p.kind === discussionTab);

  const announcementPosts = (feed.data?.items ?? []).filter((p) => p.kind === "ANNOUNCEMENT");

  return (
    <PageContainer className="space-y-4 pb-14">
      {/* 1. Header with Campus Metadata & Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Community</h1>
          <p className="text-xs text-neutral-500 font-medium">
            {selectedCampus?.name ? `${selectedCampus.name} · ` : ""}
            {feed.data ? `${feed.data.total} posts` : "Join clubs & stay connected"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/community/events/create")}
            className="px-3 py-1.5 rounded-xl border border-neutral-200 bg-white text-xs font-semibold text-neutral-700 hover:bg-neutral-50 shadow-2xs transition-colors"
          >
            Event
          </button>
          <button
            type="button"
            onClick={() => router.push("/community/create")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 active:scale-95 text-white text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Post</span>
          </button>
        </div>
      </div>

      {/* 2. Rebranded Primary Segmented Tabs (Discussions, Announcements) */}
      <div className="flex items-center gap-2 border-b border-neutral-200/90 pb-2.5">
        <button
          type="button"
          onClick={() => setMainTab("discussions")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150",
            mainTab === "discussions"
              ? "bg-primary-600 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          )}
        >
          Discussions
        </button>
        <button
          type="button"
          onClick={() => setMainTab("announcements")}
          className={cn(
            "px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-150",
            mainTab === "announcements"
              ? "bg-primary-600 text-white shadow-xs"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          )}
        >
          Announcements
        </button>
      </div>

      {mainTab === "discussions" && events.data && events.data.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-neutral-900">Upcoming campus events</h2>
          <div className="space-y-2.5">
            {events.data.slice(0, 2).map((event) => (
              <CommunityEventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: DISCUSSIONS (Full Interactive Campus Feed)
          ═══════════════════════════════════════════════════════ */}
      {mainTab === "discussions" && (
        <div className="space-y-4">
          {/* Subcategory filter pills */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {DISCUSSION_SUBTABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setDiscussionTab(t.id)}
                className={cn(
                  "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 transition-all",
                  discussionTab === t.id
                    ? "bg-neutral-900 text-white shadow-xs font-bold"
                    : "border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                )}
              >
                {t.icon && <t.icon className="h-3.5 w-3.5" />}
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Upcoming Events preview when on "all" subtab */}
          {discussionTab === "all" && events.data && events.data.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 px-1">
                Upcoming events
              </h3>
              {events.data.slice(0, 2).map((event) => (
                <CommunityEventCard key={event.id} event={event} />
              ))}
            </section>
          )}

          {/* Feed Content: Loading / Error / Empty / Posts */}
          {source.isLoading ? (
            <p className="text-sm text-neutral-500 text-center py-12">Loading campus discussions…</p>
          ) : source.isError ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center space-y-2">
              <p className="text-sm font-medium text-neutral-900">
                Couldn&apos;t load the community feed.
              </p>
              <button
                type="button"
                onClick={() => source.refetch()}
                className="text-xs font-bold text-primary-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : discussionPosts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center">
              <MessageCircle className="h-12 w-12 text-neutral-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-neutral-900">No discussions found</p>
              <p className="text-xs text-neutral-500 mt-1">
                {discussionTab === "saved"
                  ? "You haven't bookmarked any posts yet."
                  : "Be the first to post on your campus."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {discussionPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: ANNOUNCEMENTS (Official Updates Stream)
          ═══════════════════════════════════════════════════════ */}
      {mainTab === "announcements" && (
        <div className="space-y-3.5">
          {/* Pinned Broadcast Banner */}
          <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl shadow-xs space-y-2">
            <div className="flex items-center gap-2 text-rose-700">
              <Megaphone className="h-4 w-4" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Campus Broadcasts</h3>
            </div>
            <p className="text-xs text-neutral-700 leading-relaxed">
              Official verified announcements from campus administration, faculties, departmental
              associations, and student leadership.
            </p>
          </div>

          {announcementPosts.length > 0 ? (
            <div className="space-y-3">
              {announcementPosts.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-neutral-200 space-y-1">
              <Megaphone className="h-8 w-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-neutral-900">No announcements posted yet</p>
              <p className="text-xs text-neutral-500">
                Check back later for official campus news and updates.
              </p>
            </div>
          )}
        </div>
      )}
    </PageContainer>
  );
}
