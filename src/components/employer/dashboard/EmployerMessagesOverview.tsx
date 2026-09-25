"use client";

import Link from "next/link";
import { useConversations } from "@/hooks/use-messages";
import { useAuth } from "@/lib/auth-context";
import { timeAgo } from "@/lib/utils";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import {
  EmployerDashboardEmpty,
  EmployerDashboardError,
  EmployerDashboardSection,
  EmployerDashboardSkeleton,
} from "./EmployerDashboardSection";

export function EmployerMessagesOverview() {
  const { user } = useAuth();
  const query = useConversations({ search: "" }, { pageSize: 5 });

  const conversations = query.data?.flattened ?? [];

  if (query.isPending) {
    return (
      <EmployerDashboardSection title="Messages" action={{ href: "/chat", label: "Open messages" }}>
        <EmployerDashboardSkeleton rows={4} />
      </EmployerDashboardSection>
    );
  }

  if (query.isError) {
    return (
      <EmployerDashboardSection title="Messages" action={{ href: "/chat", label: "Open messages" }}>
        <EmployerDashboardError message={getFriendlyErrorMessage(query.error)} onRetry={query.refetch} />
      </EmployerDashboardSection>
    );
  }

  return (
    <EmployerDashboardSection title="Messages" action={{ href: "/chat", label: "Open messages" }}>
      {conversations.length === 0 ? (
        <EmployerDashboardEmpty
          title="No conversations yet"
          detail="Message a candidate directly from their application."
        />
      ) : (
        <ul className="divide-y divide-kampmax-border/70">
          {conversations.map((conversation) => {
            const otherId = conversation.participants.find((id) => id !== user?.id);
            const otherName = (otherId && conversation.participantNames?.[otherId]) || "Candidate";
            const unread = conversation.unreadCount > 0;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/chat/${conversation.id}`}
                  className="flex items-center gap-3 rounded py-3 first:pt-0 last:pb-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-kampmax-text">
                        {otherName}
                      </span>
                      {unread && (
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary-600" aria-label="Unread" />
                      )}
                    </span>
                    <span className="block truncate text-xs text-kampmax-text-secondary">
                      {conversation.lastMessage?.text ?? "Start the conversation"}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] text-kampmax-text-secondary">
                    {timeAgo(conversation.lastMessage?.createdAt ?? conversation.updatedAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </EmployerDashboardSection>
  );
}