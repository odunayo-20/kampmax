"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";
import { Button } from "@/components/atoms/Button";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { useProductQuestions, useQuestionActions } from "@/hooks/use-product-questions";
import { useAuth } from "@/lib/auth-context";
import { QUESTION_MAX, questionProblem, questionsCount } from "@/lib/product-questions";
import { timeAgo } from "@/lib/utils";
import type { Question } from "@/services/product-questions";

const PREVIEW = 3;
const ALL = 30;

/** Questions shoppers asked about a product and the seller's answers, with the way to ask one. */
export function ProductQuestions({ productId }: { productId: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [asking, setAsking] = useState(false);
  const [sent, setSent] = useState(false);
  const list = useProductQuestions(productId, expanded ? ALL : PREVIEW);
  const { ask, remove } = useQuestionActions();

  const total = list.data?.meta.total ?? 0;
  const items = list.data?.items ?? [];

  function startAsking() {
    if (status !== "authenticated" || !user) {
      router.push(`/login?returnTo=${encodeURIComponent(pathname || `/marketplace/${productId}`)}`);
      return;
    }
    setSent(false);
    setAsking(true);
  }

  return (
    <section aria-label="Questions and answers" className="space-y-3 rounded-xl border border-kampmax-border bg-white p-4">
      <h2 className="text-base font-bold text-kampmax-text">Questions &amp; answers</h2>

      {list.isPending ? (
        <p role="status" className="text-sm text-kampmax-text-secondary">
          Loading questions…
        </p>
      ) : list.isError ? (
        <button onClick={() => void list.refetch()} className="text-sm text-kampmax-error underline">
          Couldn&apos;t load questions. Try again.
        </button>
      ) : (
        <>
          {items.map((q) => (
            <QuestionRow key={q.id} q={q} removing={remove.isPending} onRemove={() => remove.mutate(q.id)} />
          ))}
          {items.length === 0 && <p className="text-sm text-kampmax-text-secondary">No questions yet. Ask the seller before you buy.</p>}
          {!expanded && total > PREVIEW && (
            <button onClick={() => setExpanded(true)} className="text-sm font-semibold text-kampmax-blue">
              See all {questionsCount(total)}
            </button>
          )}
        </>
      )}

      {asking ? (
        <QuestionForm
          label="Your question"
          placeholder="For example: Is the battery original? Can I see it before paying?"
          max={QUESTION_MAX}
          submitLabel="Send question"
          problem={questionProblem}
          onSubmit={(text) => ask.mutateAsync({ productId, text })}
          onDone={(wasSent) => {
            setAsking(false);
            setSent(wasSent);
          }}
        />
      ) : (
        <div className="space-y-2">
          {sent && <p className="text-xs text-kampmax-text-secondary">Sent. We will tell you when the seller answers.</p>}
          <Button type="button" variant="outline" onClick={startAsking}>
            Ask a question
          </Button>
        </div>
      )}
    </section>
  );
}

function QuestionRow({ q, removing, onRemove }: { q: Question; removing: boolean; onRemove: () => void }) {
  return (
    <div className="space-y-1.5 rounded-lg border border-kampmax-border p-3">
      <p className="flex items-start gap-2 text-sm font-semibold text-kampmax-text">
        <MessageCircleQuestion className="mt-0.5 h-4 w-4 shrink-0 text-kampmax-blue" aria-hidden />
        {q.question}
      </p>
      <p className="text-xs text-kampmax-text-secondary">
        {q.mine ? "You" : q.asker} · {timeAgo(q.askedAt)}
      </p>
      {q.answer ? (
        <div className="rounded-md bg-kampmax-blue/5 p-3">
          <p className="text-xs font-bold text-kampmax-navy">Seller</p>
          <p className="whitespace-pre-line text-sm text-kampmax-text">{q.answer}</p>
        </div>
      ) : (
        <div className="flex items-center justify-between text-xs text-kampmax-text-secondary">
          <span>Waiting for the seller to answer</span>
          <button onClick={onRemove} disabled={removing} aria-label="Remove your question" className="font-semibold text-kampmax-blue">
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
