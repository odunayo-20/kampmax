import { apiClient } from "@/lib/api-client";
import type {
  CommunityComment,
  CommunityEvent,
  CommunityPost,
  CommunityPostDetail,
  CommunityReport,
  CommunitySectionCounts,
  ListQuery,
  ManagedAnnouncement,
  ManagedPoll,
  Paginated,
} from "@/types/admin";
import type {
  AdminCommunityService,
  CommunityAuthorSummary,
  CommunityCampusOption,
  CommunityOverviewStats,
} from "./community.service";

/**
 * Live /admin/campus service backed by the NestJS AdminCommunityController
 * (GET/PATCH/POST /admin/campus/*). Reads need `community.read`, writes need
 * `community.moderate`.
 */

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

function fail(
  error: { message?: string; status?: number },
  fallback: string
): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to continue.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to moderate community content.");
  }
  throw new Error(error.message || fallback);
}

async function get<T>(path: string, fallback: string): Promise<T> {
  const { data, error } = await apiClient.get<T>(path);
  if (error) fail(error, fallback);
  return data;
}

async function send<T>(
  method: "post" | "patch",
  path: string,
  body: Record<string, unknown>,
  fallback: string
): Promise<T> {
  const { data, error } =
    method === "post"
      ? await apiClient.post<Record<string, unknown>, T>(path, body)
      : await apiClient.patch<Record<string, unknown>, T>(path, body);
  if (error) fail(error, fallback);
  return data;
}

interface ListParams extends ListQuery {
  status?: string;
  type?: string;
  targetType?: string;
  campusId?: string;
}

function queryString(query: ListParams): string {
  const params = new URLSearchParams();
  const set = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === "" || value === "all") return;
    params.set(key, String(value));
  };
  set("q", query.search?.trim());
  set("status", query.status);
  set("type", query.type);
  set("targetType", query.targetType);
  set("campusId", query.campusId);
  set("sortBy", query.sortBy);
  set("sortDir", query.sortDir);
  set("page", query.page);
  set("limit", query.pageSize);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

async function list<T>(
  resource: string,
  query: ListParams,
  fallback: string
): Promise<Paginated<T>> {
  const res = await get<BackendPage<T>>(
    `/admin/campus/${resource}${queryString(query)}`,
    fallback
  );
  return {
    items: res.items,
    page: res.meta.page,
    pageSize: res.meta.limit,
    total: res.meta.total,
    totalPages: Math.max(1, res.meta.totalPages),
  };
}

function counts<S extends string>(
  resource: string
): Promise<CommunitySectionCounts<S>> {
  return get<CommunitySectionCounts<S>>(
    `/admin/campus/${resource}/counts`,
    "Couldn't load the counts."
  );
}

export function createApiCommunityService(): AdminCommunityService {
  return {
    getOverviewStats: () =>
      get<CommunityOverviewStats>(
        "/admin/campus/overview",
        "Couldn't load the overview."
      ),
    listCampusOptions: () =>
      get<CommunityCampusOption[]>(
        "/admin/campus/campuses",
        "Couldn't load campuses."
      ),

    // ---------------- Posts ----------------
    listPosts: (query = {}) =>
      list<CommunityPost>("posts", query, "Couldn't load posts."),
    async getPostDetail(id) {
      const { data, error } = await apiClient.get<CommunityPostDetail>(
        `/admin/campus/posts/${id}`
      );
      if (error?.status === 404) return null;
      if (error) fail(error, "Couldn't load the post.");
      return data;
    },
    setPostStatus: (id, status) =>
      send<CommunityPost>(
        "patch",
        `/admin/campus/posts/${id}/status`,
        { status },
        "Couldn't update the post."
      ),
    getPostCounts: () => counts("posts"),

    // ---------------- Comments ----------------
    listComments: (query = {}) =>
      list<CommunityComment>("comments", query, "Couldn't load comments."),
    setCommentStatus: (id, status) =>
      send<CommunityComment>(
        "patch",
        `/admin/campus/comments/${id}/status`,
        { status },
        "Couldn't update the comment."
      ),
    getCommentCounts: () => counts("comments"),

    // ---------------- Events ----------------
    listEvents: (query = {}) =>
      list<CommunityEvent>("events", query, "Couldn't load events."),
    cancelEvent: (id) =>
      send<CommunityEvent>(
        "patch",
        `/admin/campus/events/${id}/status`,
        { status: "cancelled" },
        "Couldn't cancel the event."
      ),
    getEventCounts: () => counts("events"),

    // ---------------- Announcements ----------------
    listAnnouncements: (query = {}) =>
      list<ManagedAnnouncement>(
        "announcements",
        query,
        "Couldn't load announcements."
      ),
    getAnnouncementCounts: () => counts("announcements"),
    createAnnouncement: (input) =>
      send<ManagedAnnouncement>(
        "post",
        "/admin/campus/announcements",
        { ...input },
        "Couldn't publish the announcement."
      ),
    updateAnnouncement: (id, patch) =>
      send<ManagedAnnouncement>(
        "patch",
        `/admin/campus/announcements/${id}`,
        { ...patch },
        "Couldn't update the announcement."
      ),
    publishAnnouncement: (id) =>
      send<ManagedAnnouncement>(
        "patch",
        `/admin/campus/announcements/${id}/status`,
        { status: "published" },
        "Couldn't publish the announcement."
      ),
    archiveAnnouncement: (id) =>
      send<ManagedAnnouncement>(
        "patch",
        `/admin/campus/announcements/${id}/status`,
        { status: "archived" },
        "Couldn't archive the announcement."
      ),

    // ---------------- Reports ----------------
    listReports: (query = {}) =>
      list<CommunityReport>("reports", query, "Couldn't load reports."),
    listReportsForTarget: (targetId) =>
      get<CommunityReport[]>(
        `/admin/campus/reports/target/${targetId}`,
        "Couldn't load reports."
      ),
    setReportStatus: (id, status, note) =>
      send<CommunityReport>(
        "patch",
        `/admin/campus/reports/${id}/status`,
        note ? { status, note } : { status },
        "Couldn't update the report."
      ),
    getReportCounts: () => counts("reports"),

    // ---------------- Polls ----------------
    listPolls: (query = {}) =>
      list<ManagedPoll>("polls", query, "Couldn't load polls."),
    setPollStatus: (id, status) =>
      send<ManagedPoll>(
        "patch",
        `/admin/campus/polls/${id}/status`,
        { status },
        "Couldn't update the poll."
      ),
    getPollCounts: () => counts("polls"),

    // ---------------- Cross-section helpers ----------------
    getAuthorSummary: (authorId) =>
      get<CommunityAuthorSummary>(
        `/admin/campus/authors/${authorId}`,
        "Couldn't load the author."
      ),
  };
}
