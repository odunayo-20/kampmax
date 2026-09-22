import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { fetchStorefrontBySlug } from "@/services/storefront";
import { StorefrontView } from "@/components/storefront/StorefrontView";
import { getSiteBaseUrl } from "@/lib/utils";

interface StorePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata(
  { params }: StorePageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { slug } = await params;
  const store = await fetchStorefrontBySlug(slug);

  if (!store) {
    notFound();
  }

  const baseUrl = getSiteBaseUrl();
  const canonical = `${baseUrl}/store/${store.slug}`;
  const description =
    store.tagline ||
    `${store.storeName} sells on Kampmax. ${store.productsCount} product${
      store.productsCount === 1 ? "" : "s"
    } available${store.campusName ? ` at ${store.campusName}` : ""}.`;

  return {
    title: `${store.storeName} | Kampmax Store`,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${store.storeName} on Kampmax`,
      description,
      url: canonical,
      type: "website",
      siteName: "Kampmax",
      images: store.coverImage
        ? [{ url: store.coverImage, alt: `${store.storeName} cover` }]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: `${store.storeName} on Kampmax`,
      description,
      images: store.coverImage ? [store.coverImage] : undefined,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function StorePage({ params }: StorePageProps) {
  const { slug } = await params;
  const store = await fetchStorefrontBySlug(slug);

  if (!store) {
    notFound();
  }

  return <StorefrontView store={store} />;
}
