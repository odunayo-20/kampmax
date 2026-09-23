"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, ExternalLink } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { fetchMyPortfolioItem, setMyPortfolioItemVisibility, deleteMyPortfolioItem } from "@/services/freelancer-services";
import type { FreelancerPortfolioItem } from "@/types/freelancer";
import { PortfolioActionMenu, PortfolioErrorState, PortfolioGridSkeleton } from "@/components/freelancer/portfolio";
import type { PortfolioAction } from "@/components/freelancer/portfolio";
import { categoryLabel } from "@/components/freelancer/services";
import { Button } from "@/components/ui";

export default function PortfolioDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [item, setItem] = useState<FreelancerPortfolioItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchMyPortfolioItem(id).then((found) => {
      if (cancelled) return;
      setItem(found);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function runAction(kind: PortfolioAction) {
    if (!item) return;
    if (kind === "delete") {
      const result = await deleteMyPortfolioItem(item.id);
      if (result.ok) {
        router.push("/freelancer/portfolio");
      } else {
        setError(result.message);
      }
      return;
    }
    const result = await setMyPortfolioItemVisibility(item.id, !item.visible);
    if (result.ok) {
      setItem(await fetchMyPortfolioItem(id));
      setError(null);
    } else {
      setError(result.message);
    }
  }

  if (loading) return <PortfolioGridSkeleton />;

  if (!item) {
    return (
      <PortfolioErrorState
        message="This portfolio project could not be found or you don't have access to it."
        onRetry={() => router.push("/freelancer/portfolio")}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/freelancer/portfolio"
          className="inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to Portfolio
        </Link>
        <div className="flex items-center gap-2">
          <Link href={`/freelancer/portfolio/${id}/edit`}>
            <Button variant="secondary" size="sm">
              <Pencil className="mr-1.5 h-4 w-4" aria-hidden />
              Edit
            </Button>
          </Link>
          <PortfolioActionMenu item={item} onAction={runAction} />
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-error-100 bg-error-50 px-4 py-3 text-sm text-error-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white lg:col-span-2">
          <div className="relative aspect-[4/3] w-full bg-neutral-100">
            {item.imageUrl ? (
              <Image src={item.imageUrl} alt={item.title} fill sizes="100vw" className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-300">
                No cover image
              </div>
            )}
          </div>
          <div className="p-5">
            {item.categoryId && (
              <span className="inline-block rounded bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                {categoryLabel(item.categoryId)}
              </span>
            )}
            <h1 className="mt-2 text-xl font-bold text-neutral-900">{item.title}</h1>
            <p className="mt-1 text-xs text-neutral-500">
              {item.completionDate ? `Completed ${item.completionDate}` : "No completion date"}
              {" · "}
              {item.visible ? "Visible to clients" : "Private"}
            </p>
            <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
              {item.description}
            </p>
            {item.skills.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {item.skills.map((skill) => (
                  <span key={skill} className="rounded-full border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600">
                    {skill}
                  </span>
                ))}
              </div>
            )}
            {item.externalUrl && (
              <a
                href={item.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                <ExternalLink className="h-4 w-4" aria-hidden />
                View live project
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
