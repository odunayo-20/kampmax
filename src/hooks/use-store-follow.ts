"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  fetchFollowedStores,
  fetchFollowState,
  followVendor,
  setStoreMuted,
  unfollowVendor,
  type FollowedStore,
  type FollowState,
} from "@/services/storefront";

const FOLLOWED_KEY = ["storefront", "followed"] as const;

/**
 * The signed-in user's follow state for a store and its live follower count.
 * Guests have no follow state, so nothing is requested for them.
 */
export function useStoreFollow(slug: string, vendorId: string) {
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const key = ["storefront", "follow", slug, user?.id ?? ""] as const;

  const query = useQuery({
    queryKey: key,
    enabled: status === "authenticated" && !!user,
    staleTime: 30_000,
    queryFn: () => fetchFollowState(slug),
  });

  const toggle = useMutation({
    mutationFn: (follow: boolean) => (follow ? followVendor(vendorId) : unfollowVendor(vendorId)),
    onSuccess: (state: FollowState) => queryClient.setQueryData(key, state),
    onSettled: () => queryClient.invalidateQueries({ queryKey: FOLLOWED_KEY }),
  });

  return {
    following: query.data?.following ?? false,
    /** Undefined until loaded; callers fall back to the count the page rendered with. */
    followers: query.data?.followers,
    isLoading: query.isLoading,
    isUpdating: toggle.isPending,
    failed: toggle.isError,
    setFollowing: (follow: boolean) => toggle.mutate(follow),
  };
}

/** The stores the signed-in user follows. Guests have none, so nothing is requested for them. */
export function useFollowedStores() {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: [...FOLLOWED_KEY, user?.id ?? ""],
    enabled: status === "authenticated" && !!user,
    queryFn: fetchFollowedStores,
  });
}

/** Mute or unmute a followed store. The row changes at once and goes back if the server says no. */
export function useMuteStore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, muted }: { id: string; muted: boolean }) => setStoreMuted(id, muted),
    onMutate: async ({ id, muted }) => {
      await queryClient.cancelQueries({ queryKey: FOLLOWED_KEY });
      const before = queryClient.getQueriesData<FollowedStore[]>({ queryKey: FOLLOWED_KEY });
      queryClient.setQueriesData<FollowedStore[]>({ queryKey: FOLLOWED_KEY }, (list) =>
        list?.map((s) => (s.id === id ? { ...s, muted } : s))
      );
      return { before };
    },
    onError: (_error, _vars, context) => context?.before.forEach(([key, data]) => queryClient.setQueryData(key, data)),
    onSettled: () => queryClient.invalidateQueries({ queryKey: FOLLOWED_KEY }),
  });
}
