import type {
  AnnouncementInput,
  AnnouncementListQuery,
  AnnouncementStatus,
  CommentListQuery,
  CommunityComment,
  CommunityCommentStatus,
  CommunityEvent,
  CommunityEventStatus,
  CommunityPost,
  CommunityPostDetail,
  CommunityPostStatus,
  CommunityReport,
  CommunityReportStatus,
  CommunitySectionCounts,
  EventListQuery,
  ManagedAnnouncement,
  ManagedPoll,
  ManagedPollStatus,
  Paginated,
  PollListQuery,
  PostListQuery,
  ReportListQuery,
} from "@/types/admin";

// ------------------------------------------------------------
// CONTRACT for the /admin/campus console.
// Implemented over HTTP by ./community.api.ts (NestJS /admin/campus).
// ------------------------------------------------------------

export interface CommunityCampusOption {
  id: string;
  name: string;
  shortName: string;
}

export interface CommunityAuthorSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  /** Backend user status, e.g. ACTIVE / SUSPENDED. */
  status: string;
  joinedAt: string;
  postsCount: number;
  commentsCount: number;
  reportsAgainst: number;
}

export interface CommunityOverviewStats {
  openReports: number;
  flaggedPosts: number;
  liveEvents: number;
  activePolls: number;
  activeAnnouncements: number;
}

export interface AdminCommunityService {
  getOverviewStats(): Promise<CommunityOverviewStats>;
  listCampusOptions(): Promise<CommunityCampusOption[]>;

  // Posts
  listPosts(query?: PostListQuery): Promise<Paginated<CommunityPost>>;
  getPostDetail(id: string): Promise<CommunityPostDetail | null>;
  setPostStatus(
    id: string,
    status: Extract<CommunityPostStatus, "published" | "hidden" | "removed">
  ): Promise<CommunityPost>;
  getPostCounts(): Promise<CommunitySectionCounts<CommunityPostStatus>>;

  // Comments
  listComments(query?: CommentListQuery): Promise<Paginated<CommunityComment>>;
  setCommentStatus(
    id: string,
    status: CommunityCommentStatus
  ): Promise<CommunityComment>;
  getCommentCounts(): Promise<CommunitySectionCounts<CommunityCommentStatus>>;

  // Events (the only moderation action is cancelling)
  listEvents(query?: EventListQuery): Promise<Paginated<CommunityEvent>>;
  cancelEvent(id: string): Promise<CommunityEvent>;
  getEventCounts(): Promise<CommunitySectionCounts<CommunityEventStatus>>;

  // Announcements (published immediately; archiving hides them)
  listAnnouncements(
    query?: AnnouncementListQuery
  ): Promise<Paginated<ManagedAnnouncement>>;
  getAnnouncementCounts(): Promise<CommunitySectionCounts<AnnouncementStatus>>;
  createAnnouncement(input: AnnouncementInput): Promise<ManagedAnnouncement>;
  updateAnnouncement(
    id: string,
    patch: Partial<Omit<AnnouncementInput, "campusIds">>
  ): Promise<ManagedAnnouncement>;
  publishAnnouncement(id: string): Promise<ManagedAnnouncement>;
  archiveAnnouncement(id: string): Promise<ManagedAnnouncement>;

  // Reports
  listReports(query?: ReportListQuery): Promise<Paginated<CommunityReport>>;
  listReportsForTarget(targetId: string): Promise<CommunityReport[]>;
  setReportStatus(
    id: string,
    status: Exclude<CommunityReportStatus, "open">,
    note?: string
  ): Promise<CommunityReport>;
  getReportCounts(): Promise<CommunitySectionCounts<CommunityReportStatus>>;

  // Polls
  listPolls(query?: PollListQuery): Promise<Paginated<ManagedPoll>>;
  setPollStatus(id: string, status: ManagedPollStatus): Promise<ManagedPoll>;
  getPollCounts(): Promise<CommunitySectionCounts<ManagedPollStatus>>;

  // Cross-section helpers
  getAuthorSummary(authorId: string): Promise<CommunityAuthorSummary>;
}
