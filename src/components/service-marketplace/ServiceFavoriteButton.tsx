"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, usePathname } from "next/navigation";
import { Heart } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { fetchServiceFavoriteIds, setServiceFavorite } from "@/services/service-marketplace";

interface ServiceFavoriteButtonProps {
  serviceId: string;
  className?: string;
  variant?: "card" | "panel";
}

/**
 * Auth-aware "Save service" button.
 * - Guests are routed through login with a `returnTo` back to the current page,
 *   so no navigation context is lost.
 * - Saved services live on the account's wishlist, so they follow you across devices.
 * - Never shows who else favourited a service.
 */
export function ServiceFavoriteButton({ serviceId, className, variant = "card" }: ServiceFavoriteButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();
  const queryClient = useQueryClient();
  const signedIn = status === "authenticated" && !!user;

  const saved = useQuery({
    queryKey: ["service-favorites", user?.id],
    queryFn: fetchServiceFavoriteIds,
    enabled: signedIn,
    staleTime: 60_000,
    retry: false,
  });
  const favorited = !!saved.data?.includes(serviceId);

  const toggle = useMutation({
    mutationFn: () => setServiceFavorite(serviceId, !favorited),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["service-favorites", user?.id] }),
  });
  const busy = toggle.isPending;

  function handleClick() {
    if (status !== "authenticated" || !user) {
      const returnTo = pathname || "/services";
      router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    toggle.mutate();
  }

  if (variant === "panel") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={favorited}
        aria-label={favorited ? "Remove from saved services" : "Save service"}
        className={cn(
          "inline-flex items-center gap-1.5 h-10 px-4 rounded-md border text-sm font-semibold transition-colors",
          favorited
            ? "bg-error-50 text-error-600 border-error-200"
            : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100",
          className
        )}
      >
        <Heart className={cn("h-4 w-4", favorited && "fill-current")} />
        {favorited ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-pressed={favorited}
      aria-label={favorited ? "Remove from saved services" : "Save service"}
      className={cn(
        "p-1.5 rounded-full bg-white/90 backdrop-blur-sm border border-neutral-200 hover:bg-white hover:border-neutral-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600",
        className
      )}
    >
      <Heart
        className={cn(
          "h-3.5 w-3.5 transition-colors",
          favorited ? "fill-error-600 text-error-600" : "text-neutral-500"
        )}
      />
    </button>
  );
}