"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { getEngagementById } from "@/services/jobs";

/**
 * Where a contract notification lands. The same kind of notification reaches the employer and the freelancer, so
 * this looks at which side the person is on and sends them to their own contracts.
 */
export default function ContractRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["engagement", id],
    queryFn: async () => {
      const { engagement, error } = await getEngagementById(id);
      if (error || !engagement) throw error ?? new Error("Not found");
      return engagement;
    },
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (!q.data || !user) return;
    router.replace(q.data.freelancer.userId === user.id ? `/freelancer/contracts/${id}` : "/employer/contracts");
  }, [q.data, user, id, router]);

  if (q.isError) {
    return (
      <p role="alert" className="py-16 text-center text-sm text-kampmax-text-secondary">
        We couldn&apos;t find that contract.
      </p>
    );
  }
  return <p className="py-16 text-center text-sm text-kampmax-text-secondary">Opening your contract…</p>;
}
