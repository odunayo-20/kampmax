"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchTaxonomyChildren,
  fetchTaxonomyTree,
  fetchTaxonomyTypes,
  flattenTaxonomy,
  type TaxonomyType,
} from "@/services/taxonomy";

/**
 * Taxonomy changes rarely, so reads are cached for 5 minutes and shared across
 * every form. Admin mutations call `invalidateTaxonomy` so new/deactivated
 * items show up immediately.
 */
export const taxonomyKeys = {
  all: ["taxonomy"] as const,
  types: () => ["taxonomy", "types"] as const,
  tree: (type: TaxonomyType) => ["taxonomy", "tree", type] as const,
  children: (parentId: string) => ["taxonomy", "children", parentId] as const,
};

const STALE_MS = 5 * 60 * 1000;

export function useTaxonomyTypes() {
  return useQuery({
    queryKey: taxonomyKeys.types(),
    queryFn: fetchTaxonomyTypes,
    staleTime: STALE_MS,
  });
}

export function useCategoryTree(type: TaxonomyType, enabled = true) {
  return useQuery({
    queryKey: taxonomyKeys.tree(type),
    queryFn: () => fetchTaxonomyTree(type),
    staleTime: STALE_MS,
    enabled,
  });
}

/** Flat list (with depth/path) of one taxonomy, plus an id -> name lookup. */
export function useCategories(type: TaxonomyType, enabled = true) {
  const query = useCategoryTree(type, enabled);
  const flat = useMemo(() => flattenTaxonomy(query.data ?? []), [query.data]);
  const nameById = useMemo(() => new Map(flat.map((n) => [n.id, n.name])), [flat]);
  return { ...query, categories: flat, nameById };
}

export function useCategoryChildren(parentId: string | null | undefined) {
  return useQuery({
    queryKey: taxonomyKeys.children(parentId ?? ""),
    queryFn: () => fetchTaxonomyChildren(parentId as string),
    staleTime: STALE_MS,
    enabled: !!parentId,
  });
}
