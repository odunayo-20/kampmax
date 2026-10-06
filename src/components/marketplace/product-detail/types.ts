import type { Product } from "@/types";

export type VariantOption = {
  id: string;
  label: string;
  value: string;
  available: boolean;
  priceModifier?: number;
  stock?: number;
};

export type VariantGroup = {
  id: string;
  name: string;
  options: VariantOption[];
};

export type SpecItem = {
  label: string;
  value: string;
};

/** Stock shown when a listing has no stock limit (-1 on the backend). */
const UNLIMITED_STOCK = 999;

/** The product's real variant groups, shaped for the selector. */
export function getVariantGroups(product: Pick<Product, "variantGroups">): VariantGroup[] {
  return (product.variantGroups ?? [])
    .filter((g) => g.options.length > 0)
    .map((g) => ({
      id: g.id,
      name: g.name,
      options: g.options.map((o) => ({
        id: o.id,
        label: o.value,
        value: o.value,
        available: o.available !== false,
        priceModifier: o.priceModifier,
        stock: o.stock,
      })),
    }));
}

/**
 * Units available for the chosen options: the lowest finite option stock, or
 * unlimited when the chosen options carry no limit, or the product's own stock
 * for a product without variants. Never a guess.
 */
export function getStockForSelection(
  product: Pick<Product, "stock" | "variantGroups">,
  selected: Record<string, string>
): number {
  const finite: number[] = [];
  let chosenOptions = 0;
  for (const group of product.variantGroups ?? []) {
    const option = group.options.find((o) => o.id === selected[group.id]);
    if (!option) continue;
    chosenOptions++;
    if (typeof option.stock === "number" && option.stock >= 0) finite.push(option.stock);
  }
  if (finite.length > 0) return Math.min(...finite);
  if (chosenOptions > 0) return UNLIMITED_STOCK;
  if (typeof product.stock !== "number") return 0;
  return product.stock < 0 ? UNLIMITED_STOCK : product.stock;
}

/** Specs a customer can trust: the listing's own facts plus what the vendor entered. */
export function getSpecs(
  product: Pick<Product, "condition" | "location" | "attributes">,
  campusName?: string
): SpecItem[] {
  const specs: SpecItem[] = [{ label: "Condition", value: product.condition }];
  if (campusName) specs.push({ label: "Campus", value: campusName });
  if (product.location) specs.push({ label: "Pickup location", value: product.location });
  for (const [key, value] of Object.entries(product.attributes ?? {})) {
    if (key.trim() && String(value).trim()) {
      specs.push({
        label: key.replace(/[_-]+/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
        value: String(value),
      });
    }
  }
  return specs;
}

export function calculateVariantPriceModifier(
  variantGroups: VariantGroup[],
  selectedVariants: Record<string, string>
): number {
  let mod = 0;
  variantGroups.forEach((g) => {
    const sel = selectedVariants[g.id];
    const opt = g.options.find((o) => o.id === sel);
    if (opt?.priceModifier) mod += opt.priceModifier;
  });
  return mod;
}

export function areAllVariantsSelected(
  variantGroups: VariantGroup[],
  selectedVariants: Record<string, string>
): boolean {
  return variantGroups.every((g) => selectedVariants[g.id]);
}
