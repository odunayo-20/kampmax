"use client";

import { useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { publicServiceKeys } from "@/lib/query-keys";
import { getPublicFreelancerById } from "@/services/freelancer";
import { fetchPublicServiceById } from "@/services/freelancer-services";
import { asServiceId } from "@/services/service-share";
import { FREELANCER_SERVICE_STATUS } from "@/types/freelancer-services";

const PUBLIC_DATA_STALE_MS = 60_000;

/** One public service by id (null when missing or not live). Shared by every card on screen. */
export function usePublicService(serviceId: string | null) {
  return useQuery({
    queryKey: publicServiceKeys.detail(serviceId ?? ""),
    enabled: !!serviceId,
    queryFn: () => fetchPublicServiceById(serviceId!),
    staleTime: PUBLIC_DATA_STALE_MS,
    retry: false,
  });
}

/**
 * The service staged for the next message, taken from the chat address
 * (`/chat/<id>?service=<uuid>`).
 *
 * The address is untrusted, so a service is only staged when ALL of these hold:
 * the value is exactly one UUID, the service is live, and its owner is a
 * participant of this very chat. A crafted link therefore cannot put an
 * unrelated service into someone's message box. Anything else is ignored.
 *
 * `participants` are account ids; a service only carries its owner's profile id,
 * so the owner's public profile is read to get the account id.
 */
export function useStagedService(participants: string[], rawParam: unknown) {
  const router = useRouter();
  const pathname = usePathname();

  const serviceId = asServiceId(rawParam);
  const serviceQuery = usePublicService(serviceId);
  const live =
    serviceQuery.data && serviceQuery.data.status === FREELANCER_SERVICE_STATUS.PUBLISHED
      ? serviceQuery.data
      : null;

  const ownerQuery = useQuery({
    queryKey: publicServiceKeys.owner(live?.userId ?? ""),
    enabled: !!live,
    queryFn: async () => (await getPublicFreelancerById(live!.userId)).profile,
    staleTime: PUBLIC_DATA_STALE_MS,
    retry: false,
  });
  const ownerAccountId = ownerQuery.data?.userId;

  const service = live && ownerAccountId && participants.includes(ownerAccountId) ? live : null;

  /** Drops the service from the address, so a refresh does not stage it again. */
  const clear = useCallback(() => router.replace(pathname), [router, pathname]);

  return { service, clear };
}
