"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { communityEventKeys, communityKeys } from "@/lib/query-keys";
import {
  addCommentApi,
  createEventApi,
  deleteCommentApi,
  fetchSavedPosts,
  resolveLostFoundApi,
  setCommentLikedApi,
  setPostSavedApi,
  votePollApi,
  createPostApi,
  deletePostApi,
  fetchComments,
  fetchFeed,
  fetchPost,
  fetchUpcomingEvents,
  reportPostApi,
  setEventAttendingApi,
  type PostReportReason,
  setPostLikedApi,
} from "@/services/posts-api";

const FEED_LIMIT = 50;

export function useCommunityFeed(campusId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: communityKeys.feed(campusId),
    enabled: status === "authenticated",
    staleTime: 30_000,
    queryFn: () => fetchFeed(campusId, 1, FEED_LIMIT),
  });
}

export function useCommunityPost(id: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: communityKeys.post(id),
    enabled: status === "authenticated" && !!id,
    retry: false,
    queryFn: () => fetchPost(id),
  });
}

export function usePostComments(postId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: communityKeys.comments(postId),
    enabled: status === "authenticated" && !!postId,
    queryFn: () => fetchComments(postId),
  });
}

export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPostApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePostApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useTogglePostLike() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, liked }: { id: string; liked: boolean }) => setPostLikedApi(id, liked),
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => addCommentApi(postId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export function useReportPost() {
  return useMutation({
    mutationFn: (v: { id: string; reason: PostReportReason; details?: string }) =>
      reportPostApi(v.id, v.reason, v.details),
  });
}

export function useUpcomingEvents(campusId: string) {
  const { status } = useAuth();
  return useQuery({
    queryKey: communityEventKeys.upcoming(campusId),
    enabled: status === "authenticated",
    staleTime: 30_000,
    queryFn: () => fetchUpcomingEvents(campusId),
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createEventApi,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: communityEventKeys.all }),
  });
}

export function useToggleEventAttendance() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (v: { id: string; attending: boolean }) => setEventAttendingApi(v.id, v.attending),
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityEventKeys.all }),
  });
}

export function useSavedPosts(enabled: boolean) {
  const { status } = useAuth();
  return useQuery({
    queryKey: communityKeys.saved(),
    enabled: enabled && status === "authenticated",
    queryFn: fetchSavedPosts,
  });
}

function useCommunityMutation<V>(fn: (v: V) => Promise<unknown>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: communityKeys.all }),
  });
}

export const useToggleSavePost = () =>
  useCommunityMutation((v: { id: string; saved: boolean }) => setPostSavedApi(v.id, v.saved));
export const useVotePoll = () =>
  useCommunityMutation((v: { id: string; optionIndex: number }) => votePollApi(v.id, v.optionIndex));
export const useResolveLostFound = () => useCommunityMutation((id: string) => resolveLostFoundApi(id));
export const useDeleteComment = () =>
  useCommunityMutation((v: { postId: string; commentId: string }) => deleteCommentApi(v.postId, v.commentId));
export const useToggleCommentLike = () =>
  useCommunityMutation((v: { postId: string; commentId: string; liked: boolean }) =>
    setCommentLikedApi(v.postId, v.commentId, v.liked)
  );
