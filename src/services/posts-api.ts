import { apiClient, type ApiError } from "@/lib/api-client";

// ============================================================
// COMMUNITY — LIVE API LAYER
// ============================================================
//   GET    /posts?feed=campus&campusId=…   campus feed (newest first)
//   GET    /posts/:id                      single post
//   POST   /posts                          { content, campusId?, media? }
//   DELETE /posts/:id                      author or admin
//   POST   /posts/:id/like, DELETE …/like  idempotent like / unlike
//   GET    /posts/:id/comments             paginated
//   POST   /posts/:id/comments             { content }
//
// The author is always the signed-in user (from the JWT). The backend has no
// titles, tags, polls, events, saves or reports yet, so the UI doesn't fake them.

export type PostKind = "POST" | "POLL" | "LOST_FOUND" | "ANNOUNCEMENT";

export interface PostPoll {
  options: { text: string; votes: number }[];
  totalVotes: number;
  myVote: number | null;
  endsAt: string;
  closed: boolean;
}

export interface PostLostFound {
  status: "LOST" | "FOUND";
  item: string;
  location: string;
  contact?: string;
  resolved: boolean;
}

export interface CommunityPost {
  kind: PostKind;
  savedByMe: boolean;
  poll?: PostPoll;
  lostFound?: PostLostFound;
  announcement?: { priority: "INFO" | "WARNING" | "URGENT" };
  id: string;
  authorId: string;
  authorName: string;
  vendorName: string | null;
  content: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  images: string[];
  createdAt: string;
}

export interface CommunityComment {
  likeCount: number;
  likedByMe: boolean;
  id: string;
  postId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

interface BackendPost {
  kind: PostKind;
  savedByMe?: boolean;
  poll?: PostPoll;
  lostFound?: PostLostFound;
  announcement?: { priority: "INFO" | "WARNING" | "URGENT" };
  id: string;
  authorId: string;
  authorName: string;
  vendorName: string | null;
  content: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  media: { type: string; url: string; sortOrder: number }[];
  createdAt: string;
}

interface BackendPage<T> {
  items: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

async function unwrap<T>(request: Promise<{ data: T; error: ApiError | null }>): Promise<T> {
  const { data, error } = await request;
  if (error || data == null) throw error ?? new Error("Empty response from server");
  return data;
}

function mapPost(p: BackendPost): CommunityPost {
  return {
    id: p.id,
    authorId: p.authorId,
    authorName: p.vendorName || p.authorName,
    vendorName: p.vendorName,
    content: p.content,
    kind: p.kind ?? "POST",
    savedByMe: p.savedByMe ?? false,
    poll: p.poll,
    lostFound: p.lostFound,
    announcement: p.announcement,
    likeCount: p.likeCount,
    commentCount: p.commentCount,
    likedByMe: p.likedByMe,
    images: p.media
      .filter((m) => m.type.toUpperCase() === "IMAGE")
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((m) => m.url),
    createdAt: p.createdAt,
  };
}

export async function fetchFeed(campusId: string, page: number, limit: number) {
  const qs = new URLSearchParams({ feed: campusId ? "campus" : "discovery", page: String(page), limit: String(limit) });
  if (campusId) qs.set("campusId", campusId);
  const res = await unwrap(apiClient.get<BackendPage<BackendPost>>(`/posts?${qs}`));
  return { items: res.items.map(mapPost), hasMore: res.meta.page < res.meta.totalPages, total: res.meta.total };
}

export async function fetchPost(id: string): Promise<CommunityPost> {
  return mapPost(await unwrap(apiClient.get<BackendPost>(`/posts/${id}`)));
}

export async function createPostApi(input: {
  content?: string;
  campusId?: string;
  kind?: PostKind;
  poll?: { options: string[]; durationDays: number };
  lostFound?: { status: "LOST" | "FOUND"; item: string; location: string; contact?: string };
  announcement?: { priority: "INFO" | "WARNING" | "URGENT" };
  media?: { type: "IMAGE"; url: string; sortOrder: number }[];
 }): Promise<CommunityPost> {
  return mapPost(await unwrap(apiClient.post<typeof input, BackendPost>("/posts", input)));
}

export async function deletePostApi(id: string): Promise<void> {
  const { error } = await apiClient.delete(`/posts/${id}`);
  if (error) throw error;
}

export async function setPostLikedApi(id: string, liked: boolean): Promise<void> {
  const { error } = liked ? await apiClient.post(`/posts/${id}/like`) : await apiClient.delete(`/posts/${id}/like`);
  if (error) throw error;
}

export async function fetchComments(postId: string): Promise<CommunityComment[]> {
  const res = await unwrap(
    apiClient.get<BackendPage<CommunityComment>>(`/posts/${postId}/comments?page=1&limit=100`)
  );
  // API returns newest first; show oldest → newest.
  return [...res.items].reverse();
}

export async function addCommentApi(postId: string, content: string): Promise<CommunityComment> {
  return unwrap(apiClient.post<{ content: string }, CommunityComment>(`/posts/${postId}/comments`, { content }));
}

export type PostReportReason = "SPAM" | "INAPPROPRIATE" | "SCAM" | "HARASSMENT" | "OTHER";

export async function reportPostApi(id: string, reason: PostReportReason, details?: string): Promise<void> {
  const { error } = await apiClient.post(`/posts/${id}/report`, { reason, details: details || undefined });
  if (error) throw error;
}

// ── Campus events ────────────────────────────────────────────

export interface CommunityEvent {
  id: string;
  campusId: string;
  organizerId: string;
  organizerName: string;
  title: string;
  description: string;
  location: string;
  startsAt: string;
  attendeeCount: number;
  attending: boolean;
}

export async function fetchUpcomingEvents(campusId: string): Promise<CommunityEvent[]> {
  const qs = new URLSearchParams({ limit: "20" });
  if (campusId) qs.set("campusId", campusId);
  const res = await unwrap(apiClient.get<BackendPage<CommunityEvent>>(`/events?${qs}`));
  return res.items;
}

export async function createEventApi(input: {
  campusId: string;
  title: string;
  description?: string;
  location: string;
  startsAt: string;
}): Promise<CommunityEvent> {
  return unwrap(apiClient.post<typeof input, CommunityEvent>("/events", input));
}

export async function setEventAttendingApi(id: string, attending: boolean): Promise<void> {
  const { error } = attending ? await apiClient.post(`/events/${id}/attend`) : await apiClient.delete(`/events/${id}/attend`);
  if (error) throw error;
}

export async function fetchSavedPosts(): Promise<CommunityPost[]> {
  const res = await unwrap(apiClient.get<BackendPage<BackendPost>>("/posts/saved?page=1&limit=50"));
  return res.items.map(mapPost);
}

export async function setPostSavedApi(id: string, saved: boolean): Promise<void> {
  const { error } = saved ? await apiClient.post(`/posts/${id}/save`) : await apiClient.delete(`/posts/${id}/save`);
  if (error) throw error;
}

export async function votePollApi(id: string, optionIndex: number): Promise<void> {
  const { error } = await apiClient.post(`/posts/${id}/poll/vote`, { optionIndex });
  if (error) throw error;
}

export async function resolveLostFoundApi(id: string): Promise<void> {
  const { error } = await apiClient.post(`/posts/${id}/resolve`);
  if (error) throw error;
}

export async function deleteCommentApi(postId: string, commentId: string): Promise<void> {
  const { error } = await apiClient.delete(`/posts/${postId}/comments/${commentId}`);
  if (error) throw error;
}

export async function setCommentLikedApi(postId: string, commentId: string, liked: boolean): Promise<void> {
  const path = `/posts/${postId}/comments/${commentId}/like`;
  const { error } = liked ? await apiClient.post(path) : await apiClient.delete(path);
  if (error) throw error;
}
