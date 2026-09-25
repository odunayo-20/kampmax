import { apiClient } from "@/lib/api-client";
import { getApiBaseUrl } from "@/lib/api-config";

/**
 * Taxonomy API client (NestJS categories module). Every selectable
 * classification list (product/service/job/event categories, skills, tags)
 * comes from here, scoped by `type`. Nothing about the values is hardcoded.
 */

export type TaxonomyType = "PRODUCT" | "SERVICE" | "SKILL" | "JOB" | "EVENT" | "TAG";

export interface TaxonomyTypeInfo {
  key: TaxonomyType;
  label: string;
  singularLabel: string;
  description: string;
}

export interface TaxonomyNode {
  id: string;
  name: string;
  slug: string;
  taxonomy: TaxonomyType;
  description: string | null;
  icon: string | null;
  image: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  children: TaxonomyNode[];
}

async function unwrap<T>(promise: Promise<{ data: T | null; error: { message?: string } | null }>): Promise<T> {
  const { data, error } = await promise;
  if (error || data === null) throw new Error(error?.message ?? "Couldn't load categories.");
  return data;
}

export function fetchTaxonomyTypes(): Promise<TaxonomyTypeInfo[]> {
  return unwrap(apiClient.get<TaxonomyTypeInfo[]>("/categories/types"));
}

/**
 * id -> name for every node seen so far. Lets non-React code (services that
 * map drafts to display models) label ids without another request; it is warm
 * whenever a form has already loaded the tree.
 */
const nameCache = new Map<string, string>();
export function cachedTaxonomyName(id: string): string | undefined {
  return nameCache.get(id);
}

/** Active categories of a taxonomy as a nested tree. */
export async function fetchTaxonomyTree(type: TaxonomyType): Promise<TaxonomyNode[]> {
  const tree = await unwrap(apiClient.get<TaxonomyNode[]>(`/categories/tree?type=${type}`));
  const remember = (nodes: TaxonomyNode[]) =>
    nodes.forEach((n) => {
      nameCache.set(n.id, n.name);
      remember(n.children);
    });
  remember(tree);
  return tree;
}

/** Active direct children of one category. */
export function fetchTaxonomyChildren(parentId: string): Promise<TaxonomyNode[]> {
  return unwrap(apiClient.get<TaxonomyNode[]>(`/categories/${parentId}/children`));
}

/** Find a node (any depth) by id or slug. */
export function findTaxonomyNode(tree: TaxonomyNode[], idOrSlug: string): TaxonomyNode | undefined {
  for (const node of tree) {
    if (node.id === idOrSlug || node.slug === idOrSlug) return node;
    const inChild = findTaxonomyNode(node.children, idOrSlug);
    if (inChild) return inChild;
  }
  return undefined;
}

/** The node plus all of its descendants. */
export function subtreeNodes(node: TaxonomyNode): TaxonomyNode[] {
  return [node, ...node.children.flatMap(subtreeNodes)];
}

/**
 * Server-safe single-category lookup by slug (used by server-rendered pages
 * for metadata and 404s). Returns null when missing or inactive.
 */
export async function fetchTaxonomyNodeBySlug(
  type: TaxonomyType,
  slug: string
): Promise<Pick<TaxonomyNode, "id" | "name" | "slug" | "taxonomy" | "parentId"> | null> {
  try {
    const url = new URL(
      `/api/v1/categories/${encodeURIComponent(slug)}?type=${type}`,
      getApiBaseUrl()
    );
    const res = await fetch(url, { next: { revalidate: 60 } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** Depth-first flatten of a tree, keeping each node's depth and root ancestor. */
export interface FlatTaxonomyNode extends Omit<TaxonomyNode, "children"> {
  depth: number;
  path: string[];
  hasChildren: boolean;
}

export function flattenTaxonomy(tree: TaxonomyNode[]): FlatTaxonomyNode[] {
  const out: FlatTaxonomyNode[] = [];
  const walk = (nodes: TaxonomyNode[], depth: number, path: string[]) => {
    for (const { children, ...node } of nodes) {
      out.push({ ...node, depth, path, hasChildren: children.length > 0 });
      walk(children, depth + 1, [...path, node.name]);
    }
  };
  walk(tree, 0, []);
  return out;
}
