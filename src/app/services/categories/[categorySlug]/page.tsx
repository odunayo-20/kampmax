import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ServicesCategoryView } from "@/components/service-marketplace/ServicesBrowseView";
import { ServiceCardSkeleton } from "@/components/service-marketplace/ServiceSkeletons";
import { getSiteBaseUrl } from "@/lib/utils";
import { fetchTaxonomyNodeBySlug } from "@/services/taxonomy";

interface CategoryPageProps {
  params: Promise<{ categorySlug: string }>;
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { categorySlug } = await params;
  const category = await fetchTaxonomyNodeBySlug("SERVICE", categorySlug);
  if (!category) {
    return { title: "Category not found | Kampmax" };
  }
  const baseUrl = getSiteBaseUrl();
  const canonical = `${baseUrl}/services/categories/${category.slug}`;
  const title = `${category.name} services | Kampmax`;
  const description = `Browse ${category.name.toLowerCase()} services from verified providers. Filter by campus, price and rating, then book or request a quote.`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      siteName: "Kampmax",
    },
  };
}

export default async function ServicesCategoryPage({ params }: CategoryPageProps) {
  const { categorySlug } = await params;
  const category = await fetchTaxonomyNodeBySlug("SERVICE", categorySlug);
  if (!category) notFound();

  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ServiceCardSkeleton key={i} />
          ))}
        </div>
      }
    >
      <ServicesCategoryView
        categoryId={category.id}
        categorySlug={category.slug}
        categoryName={category.name}
        description={`Browse ${category.name.toLowerCase()} services near you.`}
      />
    </Suspense>
  );
}