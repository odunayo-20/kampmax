import { eventKeys } from "@/lib/query-keys";
import { listEventsApi, type ListEventsParams } from "@/services/event-tickets";

/**
 * The events-list query as data: its cache key and how to fetch it. In a plain module
 * (not a "use client" hook file) so the server can prefetch the exact query the page's
 * hook will ask for. Two copies of the key would quietly stop matching.
 */
export function eventsListQuery(params: ListEventsParams = {}) {
  return {
    queryKey: eventKeys.list({
      campusId: params.campusId,
      q: params.q,
      when: params.when,
      categoryId: params.categoryId,
      limit: params.limit ? String(params.limit) : undefined,
    }),
    queryFn: () => listEventsApi(params),
  };
}
