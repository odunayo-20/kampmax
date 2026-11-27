"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";

/**
 * Where a housing enquiry notification lands. The same notification reaches an agent and a student, so this looks
 * at which side of the enquiry the person is on and sends them to their own list.
 */
export default function EnquiryRedirectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const q = useQuery({
    queryKey: ["accommodation", "enquiry-side", id],
    queryFn: async () => {
      const { data, error } = await apiClient.get<{ role?: string }>(`/accommodation/enquiries/${encodeURIComponent(id)}`);
      if (error || !data) throw error ?? new Error("Not found");
      return data;
    },
    enabled: !!user,
    retry: false,
  });

  useEffect(() => {
    if (q.data) router.replace(`${q.data.role === "AGENT" ? "/agent/enquiries" : "/accommodation/my-enquiries"}?open=${encodeURIComponent(id)}`);
  }, [q.data, router, id]);

  if (q.isError) {
    return (
      <p role="alert" className="py-16 text-center text-sm text-kampmax-text-secondary">
        We couldn&apos;t find that enquiry.
      </p>
    );
  }
  return <p className="py-16 text-center text-sm text-kampmax-text-secondary">Opening your enquiry…</p>;
}
