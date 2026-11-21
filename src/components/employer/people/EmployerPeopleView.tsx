"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users } from "lucide-react";
import { Avatar, Badge, Button } from "@/components/ui";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDecidePerson, useEmployerPeople } from "@/hooks/use-employer-people";
import { getFriendlyErrorMessage } from "@/lib/error-messages";
import { formatNaira, timeAgo } from "@/lib/utils";
import {
  EMPTY_COUNTS,
  PEOPLE_STAGES,
  STAGE_EMPTY,
  STAGE_LABEL,
  defaultStage,
  offerLine,
  personActions,
  reviewHref,
  type PeopleStage,
  type Person,
  type PersonAction,
} from "@/services/employer-people";

const ACTION_LABEL: Record<PersonAction, string> = {
  shortlist: "Shortlist",
  interview: "Interview",
  decline: "Turn down",
};

const STAGE_TONE: Record<PeopleStage, "info" | "success" | "outline" | "default"> = {
  NEW: "info",
  SHORTLISTED: "outline",
  INTERVIEWING: "outline",
  HIRED: "success",
  DECLINED: "default",
};

/**
 * Everyone who responded to your jobs in one list: CV applicants and
 * freelancers' proposals on the same five stages, with shortlist, interview
 * and turn-down a click away. Hiring and accepting are done on the posting.
 */
export function EmployerPeopleView({
  initialStage,
  jobId,
}: {
  initialStage?: PeopleStage;
  jobId?: string;
}) {
  const [picked, setPicked] = useState<PeopleStage | null>(initialStage ?? null);
  const [page, setPage] = useState(1);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");
  const [declining, setDeclining] = useState<Person | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(text.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [text]);

  // Before a tab is picked the first ask is for "New"; its answer carries every tab's count, which says where to open.
  const query = useEmployerPeople({ stage: picked ?? "NEW", page, sort, search, jobId });
  const counts = query.data?.counts ?? EMPTY_COUNTS;
  const stage = picked ?? (query.data ? defaultStage(counts) : "NEW");

  useEffect(() => {
    if (picked === null && query.data && stage !== "NEW") setPicked(stage);
  }, [picked, query.data, stage]);

  const decide = useDecidePerson();
  const people = query.data?.items ?? [];

  const run = (person: Person, action: PersonAction) => {
    if (action === "decline") setDeclining(person);
    else decide.mutate({ person, action });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-neutral-900">People</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Everyone who applied or sent a proposal on your jobs.
          {jobId && (
            <>
              {" "}
              Showing one job only.{" "}
              <Link href="/employer/people" className="font-medium text-primary-700 hover:underline">
                Show all
              </Link>
            </>
          )}
        </p>
      </div>

      <div role="tablist" aria-label="Stage" className="flex gap-1.5 overflow-x-auto pb-1">
        {PEOPLE_STAGES.filter((s) => counts[s] > 0 || s === stage).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={s === stage}
            onClick={() => {
              setPicked(s);
              setPage(1);
            }}
            className={
              s === stage
                ? "whitespace-nowrap rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs font-semibold text-white"
                : "whitespace-nowrap rounded-full border border-neutral-200 bg-white px-3.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            }
          >
            {STAGE_LABEL[s]} <span className="opacity-70">{counts[s]}</span>
          </button>
        ))}
      </div>

      {counts.ALL > 4 && (
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={80}
            placeholder="Search by name or job"
            aria-label="Search by name or job"
            className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm"
          />
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as "newest" | "oldest");
              setPage(1);
            }}
            aria-label="Sort by"
            className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </div>
      )}

      {query.isPending ? (
        <div className="h-40 animate-pulse rounded-xl bg-neutral-100" />
      ) : query.isError ? (
        <p role="alert" className="rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700">
          {getFriendlyErrorMessage(query.error)}
        </p>
      ) : counts.ALL === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center">
          <Users className="mx-auto h-8 w-8 text-neutral-300" aria-hidden />
          <p className="mt-2 text-sm font-semibold text-neutral-900">Nobody yet</p>
          <p className="mt-1 text-sm text-neutral-500">
            When someone applies or sends a proposal on one of your jobs, they show up here.
          </p>
        </div>
      ) : people.length === 0 ? (
        <p className="py-8 text-center text-sm text-neutral-500">
          {search ? "Nothing matches that search." : STAGE_EMPTY[stage]}
        </p>
      ) : (
        <ul className="space-y-3">
          {people.map((p) => {
            const actions = personActions(p);
            const busy = decide.isPending && decide.variables?.person.id === p.id;
            const offer = offerLine(p, formatNaira);
            return (
              <li key={`${p.kind}-${p.id}`} className="rounded-xl border border-neutral-200 bg-white p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={p.person.name} src={p.person.avatar ?? undefined} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-neutral-900">{p.person.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {[offer, p.sentAt ? `sent ${timeAgo(p.sentAt)}` : ""].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  </div>
                  <Badge variant={STAGE_TONE[p.stage]}>{STAGE_LABEL[p.stage]}</Badge>
                </div>
                <p className="mt-3 text-xs font-medium text-neutral-600">
                  For: {p.jobTitle}{" "}
                  <Link href={reviewHref(p)} className="ml-1 text-primary-700 hover:underline">
                    Open
                  </Link>
                </p>
                {actions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-neutral-100 pt-3">
                    {actions.map((a) => (
                      <Button
                        key={a}
                        size="sm"
                        variant={a === "decline" ? "ghost" : "outline"}
                        disabled={decide.isPending}
                        onClick={() => run(p, a)}
                      >
                        {busy && decide.variables?.action === a ? "Saving…" : ACTION_LABEL[a]}
                      </Button>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {decide.isError && (
        <p role="alert" className="text-sm text-error-700">
          {getFriendlyErrorMessage(decide.error)}
        </p>
      )}

      {(query.data?.meta.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-between">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-xs text-neutral-500">
            Page {page} of {query.data?.meta.totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= (query.data?.meta.totalPages ?? 1)}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      <ConfirmDialog
        open={declining !== null}
        title={`Turn down ${declining?.person.name ?? "this person"}?`}
        body="They are told they were not selected. This is final: you can't change it afterwards."
        confirmLabel="Turn down"
        destructive
        pending={decide.isPending}
        onCancel={() => setDeclining(null)}
        onConfirm={() => {
          if (!declining) return;
          decide.mutate({ person: declining, action: "decline" }, { onSettled: () => setDeclining(null) });
        }}
      />
    </div>
  );
}
