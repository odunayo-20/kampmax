import type { Metadata } from "next";
import type { ReactNode } from "react";
import { OpenInAppBar } from "@/components/shared/OpenInAppBar";
import { fetchProductById } from "@/services/products";
import { formatNaira, getSiteBaseUrl } from "@/lib/utils";

interface ProductLayoutProps {
  params: Promise<{ id: string }>;
  children: ReactNode;
}

/**
 * The product page itself runs in the browser. This server layout adds what a shared link needs:
 * the title, price and photo that WhatsApp and other apps show in the link preview, and the
 * "Open in the Kampmax app" bar on phones. If the product can't be loaded, the page shows its own
 * not-found or error state and the preview falls back to the site's defaults.
 */
export async function generateMetadata({ params }: ProductLayoutProps): Promise<Metadata> {
  const { id } = await params;
  const { data: product } = await fetchProductById(id).catch(() => ({ data: null }));
  if (!product) return {};

  const canonical = `${getSiteBaseUrl()}/marketplace/${encodeURIComponent(product.id)}`;
  const title = `${product.title} | Kampmax`;
  const summary = product.description?.trim().replace(/\s+/g, " ").slice(0, 150);
  const description = `${formatNaira(product.price)} on Kampmax${summary ? `. ${summary}` : ""}`;
  const image = product.images?.[0];

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.title,
      description,
      url: canonical,
      type: "website",
      siteName: "Kampmax",
      images: image ? [{ url: image, alt: product.title }] : undefined,
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: product.title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

export default async function ProductLayout({ params, children }: ProductLayoutProps) {
  const { id } = await params;
  return (
    <>
      <OpenInAppBar screen={{ kind: "product", id }} />
      {children}
    </>
  );
}
