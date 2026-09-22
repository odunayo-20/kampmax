import { apiClient } from "@/lib/api-client";
import { CampusPost, Comment, SavedPost, ReportReason, PollOption } from "@/types";
import {
  campusPosts as mockPosts,
  comments as mockComments,
  reportedPosts as mockReportedPosts,
  getCampusPosts as _getCampusPosts,
  getCampusPostById as _getCampusPostById,
  getCommentsByPost as _getCommentsByPost,
  getPostsByUser as _getPostsByUser,
  getPostsByType as _getPostsByType,
} from "@/data/posts";

const savedPosts: SavedPost[] = [];

export async function getCampusPostsApi(campusId: string): Promise<CampusPost[]> {
  const { data, error } = await apiClient.get<CampusPost[]>(`/posts?campusId=${campusId}`);
  if (!error && Array.isArray(data)) {
    return data;
  }
  return getCampusPosts(campusId);
}

export async function createPostApi(
  post: Omit<CampusPost, "id" | "createdAt" | "likes" | "commentCount">
): Promise<CampusPost> {
  const { data, error } = await apiClient.post<typeof post, CampusPost>("/posts", post);
  if (!error && data && data.id) {
    mockPosts.unshift(data);
    return data;
  }
  return createPost(post);
}

export async function addCommentApi(
  comment: Omit<Comment, "id" | "createdAt" | "likes">
): Promise<Comment> {
  const { data, error } = await apiClient.post<typeof comment, Comment>(`/posts/${comment.postId}/comments`, comment);
  if (!error && data && data.id) {
    mockComments.push(data);
    return data;
  }
  return addComment(comment);
}

export async function togglePostLikeApi(postId: string): Promise<void> {
  const { error } = await apiClient.post(`/posts/${postId}/like`);
  if (error) {
    togglePostLike(postId);
  } else {
    togglePostLike(postId);
  }
}

export async function votePollApi(postId: string, optionId: string, userId: string): Promise<void> {
  const { error } = await apiClient.post(`/posts/${postId}/poll/vote`, { optionId });
  if (error) {
    votePoll(postId, optionId, userId);
  } else {
    votePoll(postId, optionId, userId);
  }
}

export function getCampusPosts(campusId: string): CampusPost[] {
  return _getCampusPosts(campusId);
}

export function getCampusPostById(id: string): CampusPost | undefined {
  return _getCampusPostById(id);
}

export function getCommentsByPost(postId: string): Comment[] {
  return _getCommentsByPost(postId);
}

export function getPostsByUser(userId: string): CampusPost[] {
  return _getPostsByUser(userId);
}

export function getPostsByType(
  campusId: string,
  type: CampusPost["type"]
): CampusPost[] {
  return _getPostsByType(campusId, type);
}

export function createPost(
  post: Omit<CampusPost, "id" | "createdAt" | "likes" | "commentCount">
): CampusPost {
  const newPost: CampusPost = {
    ...post,
    id: `cp${mockPosts.length + 1}`,
    likes: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
  };
  mockPosts.push(newPost);
  return newPost;
}

export function addComment(
  comment: Omit<Comment, "id" | "createdAt" | "likes">
): Comment {
  const newComment: Comment = {
    ...comment,
    id: `cm${mockComments.length + 1}`,
    likes: 0,
    createdAt: new Date().toISOString(),
  };
  mockComments.push(newComment);

  const post = mockPosts.find((p) => p.id === comment.postId);
  if (post) post.commentCount++;

  return newComment;
}

export function togglePostLike(postId: string): void {
  const post = mockPosts.find((p) => p.id === postId);
  if (post) {
    if (post.isLiked) {
      post.likes--;
      post.isLiked = false;
    } else {
      post.likes++;
      post.isLiked = true;
    }
  }
}

export function toggleCommentLike(commentId: string): void {
  const comment = mockComments.find((c) => c.id === commentId);
  if (comment) {
    if (comment.isLiked) {
      comment.likes--;
      comment.isLiked = false;
    } else {
      comment.likes++;
      comment.isLiked = true;
    }
  }
}

export function toggleSavePost(postId: string, userId: string): boolean {
  const existing = savedPosts.find(
    (s) => s.postId === postId && s.userId === userId
  );
  if (existing) {
    savedPosts.splice(savedPosts.indexOf(existing), 1);
    const post = mockPosts.find((p) => p.id === postId);
    if (post) post.isSaved = false;
    return false;
  } else {
    savedPosts.push({
      id: `sp${savedPosts.length + 1}`,
      userId,
      postId,
      savedAt: new Date().toISOString(),
    });
    const post = mockPosts.find((p) => p.id === postId);
    if (post) post.isSaved = true;
    return true;
  }
}

export function reportPost(
  postId: string,
  userId: string,
  reason: ReportReason,
  details?: string
): void {
  mockReportedPosts.push({
    id: `rp${mockReportedPosts.length + 1}`,
    userId,
    postId,
    reason,
    details,
    createdAt: new Date().toISOString(),
  });
}

export function votePoll(
  postId: string,
  optionId: string,
  userId: string
): void {
  const post = mockPosts.find((p) => p.id === postId);
  if (!post?.poll) return;

  // Remove previous vote
  post.poll.options.forEach((opt) => {
    opt.votes = opt.votes.filter((v) => v !== userId);
  });

  // Add new vote
  const option = post.poll.options.find((o) => o.id === optionId);
  if (option && !option.votes.includes(userId)) {
    option.votes.push(userId);
  }

  // Recalculate total
  post.poll.totalVotes = post.poll.options.reduce(
    (sum, opt) => sum + opt.votes.length,
    0
  );
}

export function deletePost(postId: string): boolean {
  const idx = mockPosts.findIndex((p) => p.id === postId);
  if (idx === -1) return false;
  mockPosts.splice(idx, 1);
  // Also remove comments
  for (let i = mockComments.length - 1; i >= 0; i--) {
    if (mockComments[i].postId === postId) mockComments.splice(i, 1);
  }
  return true;
}

export function deleteComment(commentId: string): boolean {
  const idx = mockComments.findIndex((c) => c.id === commentId);
  if (idx === -1) return false;
  const postId = mockComments[idx].postId;
  mockComments.splice(idx, 1);
  const post = mockPosts.find((p) => p.id === postId);
  if (post && post.commentCount > 0) post.commentCount--;
  return true;
}
