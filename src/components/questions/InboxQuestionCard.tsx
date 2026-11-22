"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/atoms/Button";
import { QuestionForm } from "@/components/questions/QuestionForm";
import { useSellerQuestionActions } from "@/hooks/use-product-questions";
import { ANSWER_MAX, answerProblem } from "@/lib/product-questions";
import { cn, timeAgo } from "@/lib/utils";
import type { InboxQuestion } from "@/services/product-questions";

/** One question in the seller's inbox: who asked about which product, the answer, and the way to answer, edit or remove. */
export function InboxQuestionCard({ q }: { q: InboxQuestion }) {
  const [answering, setAnswering] = useState(false);
  const { answer, hide } = useSellerQuestionActions();
  const waiting = !q.answer;

  function remove() {
    if (window.confirm("Remove this question? It disappears for everyone, including the person who asked.")) hide.mutate(q.id);
  }

  return (
    <li className={cn("space-y-2 rounded-xl border border-kampmax-border bg-white p-4", waiting && "border-l-4 border-l-amber-400")}>
      <Link href={`/marketplace/${q.product.id}`} className="text-xs font-bold text-kampmax-blue hover:underline">
        {q.product.name}
      </Link>
      <p className="text-sm font-semibold text-kampmax-text">{q.question}</p>
      <p className="text-xs text-kampmax-text-secondary">
        {q.asker} · {timeAgo(q.askedAt)}
      </p>

      {answering ? (
        <QuestionForm
          label={waiting ? "Your answer" : "Edit your answer"}
          placeholder="Answer so every shopper can see it"
          max={ANSWER_MAX}
          submitLabel={waiting ? "Post answer" : "Save answer"}
          initial={q.answer ?? ""}
          problem={answerProblem}
          onSubmit={(text) => answer.mutateAsync({ id: q.id, text })}
          onDone={() => setAnswering(false)}
        />
      ) : (
        <>
          {q.answer && (
            <div className="rounded-md bg-kampmax-blue/5 p-3">
              <p className="text-xs font-bold text-kampmax-navy">Your answer</p>
              <p className="whitespace-pre-line text-sm text-kampmax-text">{q.answer}</p>
            </div>
          )}
          <div className="flex items-center justify-between">
            <Button type="button" size="sm" variant={waiting ? "primary" : "outline"} onClick={() => setAnswering(true)}>
              {waiting ? "Answer" : "Edit answer"}
            </Button>
            <button onClick={remove} aria-label="Remove this question" className="text-sm font-semibold text-kampmax-error">
              Remove
            </button>
          </div>
          {hide.isError && (
            <p role="alert" className="text-xs text-kampmax-error">
              {hide.error.message}
            </p>
          )}
        </>
      )}
    </li>
  );
}
