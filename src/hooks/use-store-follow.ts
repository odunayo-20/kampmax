"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import {
  fetchFollowState,
  followVendor,
  unfollowVendor,
  type FollowState,
} from "@/services/storefront";

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
