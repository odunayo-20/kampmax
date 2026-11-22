"use client";

import Link from "next/link";
import { Bell, BellOff, BadgeCheck } from "lucide-react";
import { Avatar } from "@/components/atoms/Avatar";
import { useMuteStore } from "@/hooks/use-store-follow";
import { newItemsText } from "@/lib/followed-stores";
import type { FollowedStore } from "@/services/storefront";

/** The stores you follow, each with a bell to stop (or resume) news about its new items and offers. */
export function FollowedStoreList({ stores }: { stores: FollowedStore[] }) {
  const mute = useMuteStore();

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {stores.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl border border-kampmax-border bg-white p-4">
            <Link href={`/store/${s.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar name={s.storeName} src={s.logo ?? undefined} size="lg" />
              <span className="min-w-0">
                <span className="flex items-center gap-1 text-sm font-medium text-kampmax-text">
                  <span className="truncate">{s.storeName}</span>
                  {s.verified && <BadgeCheck className="h-4 w-4 shrink-0 text-kampmax-blue" aria-label="Verified seller" />}
                </span>
                <span className="text-xs text-kampmax-text-secondary">{s.muted ? "News off" : newItemsText(s.newItems)}</span>
              </span>
            </Link>
            <button
              type="button"
              onClick={() => mute.mutate({ id: s.id, muted: !s.muted })}
              aria-pressed={s.muted}
              aria-label={s.muted ? `Turn news on for ${s.storeName}` : `Mute news from ${s.storeName}`}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-kampmax-muted text-kampmax-text hover:bg-kampmax-muted/70"
            >
              {s.muted ? <BellOff className="h-4 w-4" aria-hidden /> : <Bell className="h-4 w-4 text-kampmax-blue" aria-hidden />}
            </button>
          </li>
        ))}
      </ul>
      {mute.isError && (
        <p role="alert" className="text-xs text-kampmax-error">
          {mute.error.message}
        </p>
      )}
    </div>
  );
}
