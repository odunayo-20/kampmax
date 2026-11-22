"use client";

import { useState } from "react";
import { MessageCircleQuestion } from "lucide-react";
import { InboxQuestionCard } from "@/components/questions/InboxQuestionCard";
import { useQuestionInbox } from "@/hooks/use-product-questions";
import { cn } from "@/lib/utils";
import type { InboxFilter } from "@/services/product-questions";

/** What shoppers ask about the store's products, with the unanswered ones first. */
export default function VendorQuestionsPage() {
  const [filter, setFilter] = useState<InboxFilter>("open");
  const inbox = useQuestionInbox(filter);
  const items = inbox.data?.items ?? [];
  const open = inbox.data?.open ?? 0;

  const tabs: { id: InboxFilter; label: string }[] = [
    { id: "open", label: open > 0 ? `Waiting (${open})` : "Waiting" },
    { id: "all", label: "All" },
  ];

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-bold text-kampmax-text">Customer questions</h1>

      <div role="tablist" aria-label="Show" className="flex gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={filter === t.id}
            onClick={() => setFilter(t.id)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              filter === t.id ? "border-kampmax-navy bg-kampmax-navy text-white" : "border-kampmax-border bg-white text-kampmax-text"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {inbox.isPending ? (
        <p role="status" className="text-sm text-kampmax-text-secondary">
          Loading questions…
        </p>
      ) : inbox.isError ? (
        <div role="alert" className="rounded-xl border border-kampmax-border bg-white p-6 text-center">
          <p className="text-sm text-kampmax-text-secondary">{inbox.error.message}</p>
          <button onClick={() => void inbox.refetch()} className="mt-3 text-sm font-semibold text-kampmax-blue">
            Try again
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-kampmax-border bg-white p-8 text-center">
          <MessageCircleQuestion className="mx-auto mb-3 h-10 w-10 text-kampmax-text-secondary" aria-hidden />
          <p className="text-sm font-medium text-kampmax-text">{filter === "open" ? "Nothing waiting for you" : "No questions yet"}</p>
          <p className="mt-1 text-xs text-kampmax-text-secondary">When a shopper asks about one of your products, it shows here and we tell you.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((q) => (
            <InboxQuestionCard key={q.id} q={q} />
          ))}
        </ul>
      )}
    </div>
  );
}
