import { permanentRedirect } from "next/navigation";

interface CategoryRedirectProps {
  params: Promise<{ categoryId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

const first = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

/**
 * Category pages used to be a second, separate listing. The marketplace now
 * filters by category itself (server-side, with real totals), so an old
 * /marketplace/category/<id> link lands there with the same filters applied.
 */
export default async function CategoryRedirect({ params, searchParams }: CategoryRedirectProps) {
  const { categoryId } = await params;
  const query = await searchParams;

  const target = new URLSearchParams();
  // A subcategory link names a more specific category than the page itself.
  target.set("category", first(query.subcategory) || categoryId);
  const carry: Array<[from: string, to: string]> = [
    ["vendor", "vendor"],
    ["search", "q"],
    ["q", "q"],
    ["sort", "sort"],
    ["minPrice", "minPrice"],
    ["maxPrice", "maxPrice"],
    ["condition", "condition"],
  ];
  for (const [from, to] of carry) {
    const value = first(query[from]);
    if (value) target.set(to, value);
  }

  permanentRedirect(`/marketplace?${target.toString()}`);
}
