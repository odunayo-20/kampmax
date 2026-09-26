"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Flag,
  GraduationCap,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  XCircle,
} from "lucide-react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { LoadingSkeleton } from "@/components/admin/LoadingSkeleton";
import { cn } from "@/lib/utils";
import { PostsSection } from "@/components/admin/campus-community/PostsSection";
import { CommentsSection } from "@/components/admin/campus-community/CommentsSection";
import { EventsSection } from "@/components/admin/campus-community/EventsSection";
import { AnnouncementsSection } from "@/components/admin/campus-community/AnnouncementsSection";
import { ReportsSection } from "@/components/admin/campus-community/ReportsSection";
import { PollsSection } from "@/components/admin/campus-community/PollsSection";
import { communityService } from "@/services/admin";
import { registerCommunityCampuses } from "@/components/admin/campus-community/campus-community-utils";
import type { CommunityOverviewStats } from "@/services/admin/community.service";
import type { CampusOption } from "@/components/admin/campus-community/PostsSection";

export default function AdminCampusCommunityPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="cards" rows={4} />}>
      <CampusCommunityConsole />
    </Suspense>
  );
}

// ------------------------------------------------------------
// SECTIONS
// ------------------------------------------------------------

type SectionKey =
  | "posts"
  | "comments"
  | "events"
  | "announcements"
  | "reports"
  | "polls";

const SECTION_TABS: {
  key: SectionKey;
  label: string;
  icon: typeof MessagesSquare;
}[] = [
  { key: "posts", label: "Posts", icon: MessagesSquare },
  { key: "comments", label: "Comments", icon: MessageCircle },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "announcements", label: "Announcements", icon: Megaphone },
  { key: "reports", label: "Reports", icon: Flag },
  { key: "polls", label: "Polls", icon: BarChart3 },
];

const VALID_SECTIONS = new Set(SECTION_TABS.map((s) => s.key));

interface ToastMessage {
  id: number;
  tone: "success" | "error";
  text: string;
}

function parseInitialSection(params: { get(name: string): string | null }): SectionKey {
  const raw = params.get("section");
  return raw && VALID_SECTIONS.has(raw as SectionKey)
    ? (raw as SectionKey)
    : "posts";
}

// ------------------------------------------------------------
// CONSOLE
// ------------------------------------------------------------

function CampusCommunityConsole() {
  const searchParams = useSearchParams();
  const [section, setSection] = useState<SectionKey>(() =>
    parseInitialSection(searchParams)
  );
  // null until loaded, so sections never render real campus ids as raw UUIDs.
  const [campusOptions, setCampusOptions] = useState<CampusOption[] | null>(
    null
  );
  const [campusError, setCampusError] = useState(false);

  const [stats, setStats] = useState<CommunityOverviewStats | null>(null);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const toastId = useRef(0);

  function pushToast(tone: ToastMessage["tone"], text: string) {
    const id = ++toastId.current;
    setToasts((t) => [...t.slice(-2), { id, tone, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }

  // Keep the URL shareable without re-render loops.
  useEffect(() => {
    window.history.replaceState(null, "", `/admin/campus?section=${section}`);
  }, [section]);

  useEffect(() => {
    let cancelled = false;
    communityService
      .listCampusOptions()
      .then((options) => {
        if (cancelled) return;
        registerCommunityCampuses(options);
        setCampusOptions(options);
      })
      .catch(() => !cancelled && setCampusError(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    communityService
      .getOverviewStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {
        /* non-critical */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <AdminPageHeader
        title="Campus Community"
        description="Moderate posts, comments, events and polls; broadcast announcements; triage abuse reports."
        actions={
          stats && (
            <div className="flex flex-wrap items-center gap-2">
              <StatChip
                icon={Flag}
                tone={stats.openReports > 0 ? "danger" : "neutral"}
                label={`${stats.openReports} open report${stats.openReports === 1 ? "" : "s"}`}
              />
              <StatChip
                icon={GraduationCap}
                tone={stats.flaggedPosts > 0 ? "warning" : "neutral"}
                label={`${stats.flaggedPosts} flagged post${stats.flaggedPosts === 1 ? "" : "s"}`}
              />
              <StatChip
                icon={CalendarDays}
                tone="info"
                label={`${stats.liveEvents} live`}
                className="hidden sm:inline-flex"
              />
              <StatChip
                icon={Megaphone}
                tone="neutral"
                label={`${stats.activeAnnouncements} announcement${stats.activeAnnouncements === 1 ? "" : "s"}`}
                className="hidden md:inline-flex"
              />
            </div>
          )
        }
      />

      {/* Section tabs */}
      <div
        role="tablist"
        aria-label="Community sections"
        className="mb-4 grid grid-cols-3 gap-1 rounded-lg border border-kampmax-border bg-white p-1 sm:flex sm:overflow-x-auto sm:no-scrollbar"
      >
        {SECTION_TABS.map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSection(tab.key)}
              className={cn(
                "-mx-px flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2 py-2 text-xs font-medium transition-colors min-w-0 sm:flex-1 sm:px-3 sm:text-[13px]",
                active
                  ? "bg-kampmax-navy text-white shadow-sm"
                  : "text-kampmax-text-secondary hover:bg-kampmax-muted/60 hover:text-kampmax-text"
              )}
            >
              <Icon className="hidden h-3.5 w-3.5 sm:block" aria-hidden />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active section */}
      {campusError ? (
        <div className="rounded-lg border border-kampmax-border bg-white px-4 py-10 text-center text-sm text-kampmax-text-secondary">
          Couldn&apos;t load campuses. Refresh the page to try again.
        </div>
      ) : !campusOptions ? (
        <LoadingSkeleton variant="cards" rows={4} />
      ) : (
        <div key={section}>
          {section === "posts" && (
            <PostsSection campusOptions={campusOptions} onToast={pushToast} />
          )}
          {section === "comments" && (
            <CommentsSection
              campusOptions={campusOptions}
              onToast={pushToast}
            />
          )}
          {section === "events" && (
            <EventsSection campusOptions={campusOptions} onToast={pushToast} />
          )}
          {section === "announcements" && (
            <AnnouncementsSection
              campusOptions={campusOptions}
              onToast={pushToast}
            />
          )}
          {section === "reports" && <ReportsSection onToast={pushToast} />}
          {section === "polls" && (
            <PollsSection campusOptions={campusOptions} onToast={pushToast} />
          )}
        </div>
      )}

      {/* Toasts */}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex flex-col items-end gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex max-w-sm items-start gap-2 rounded-lg border border-kampmax-border bg-white px-3.5 py-2.5 text-sm shadow-lg animate-[kampmax-fade-in_.18s_ease-out]"
          >
            {t.tone === "success" ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-success" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-error" />
            )}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function StatChip({
  icon: Icon,
  label,
  tone,
  className,
}: {
  icon: typeof Flag;
  label: string;
  tone: "neutral" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "border-kampmax-border text-kampmax-text-secondary",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-red-200 bg-red-50 text-kampmax-error",
    info: "border-sky-200 bg-sky-50 text-kampmax-info",
  };
  return (
    <span
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-md border bg-white px-3 text-xs font-medium",
        tones[tone],
        className
      )}
    >
      <Icon className="h-3.5 w-3.5 opacity-70" aria-hidden />
      {label}
    </span>
  );
}
