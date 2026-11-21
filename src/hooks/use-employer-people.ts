"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { dashboardKeys, jobApplicationKeys } from "@/lib/query-keys";
import {
  listEmployerPeopleApi,
  type PeopleQuery,
  type Person,
  type PersonAction,
} from "@/services/employer-people";
import { setApplicationStatus } from "@/services/job-applications";
import { rejectProposalApi, shortlistProposalApi } from "@/services/proposals";

const peopleKey = (userId: string | undefined, q: PeopleQuery) =>
  ["employer-people", userId, q] as const;

/** Everyone who responded to the signed-in employer's postings, one stage at a time. */
export function useEmployerPeople(q: PeopleQuery) {
  const { status, user } = useAuth();
  return useQuery({
    queryKey: peopleKey(user?.id, q),
    enabled: status === "authenticated" && Boolean(user?.id),
    queryFn: async () => {
      const { page, error } = await listEmployerPeopleApi(q);
      if (error || !page) throw error ?? new Error("The list could not be loaded.");
      return page;
    },
  });
}

/** Shortlist, invite to interview or turn down one person, whichever kind they are. */
export function useDecidePerson() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ person, action }: { person: Person; action: PersonAction }) => {
      if (person.kind === "APPLICATION") {
        const status =
          action === "shortlist" ? "SHORTLISTED" : action === "interview" ? "INTERVIEWING" : "REJECTED";
        const { error } = await setApplicationStatus(person.id, status);
        if (error) throw error;
        return;
      }
      const { error } =
        action === "shortlist"
          ? await shortlistProposalApi(person.id)
          : await rejectProposalApi(person.id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["employer-people"] });
      void queryClient.invalidateQueries({ queryKey: jobApplicationKeys.all });
      void queryClient.invalidateQueries({ queryKey: dashboardKeys.all });
    },
  });
}
