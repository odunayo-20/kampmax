import { apiClient } from "@/lib/api-client";
import type { ManagedCategory } from "@/types/admin";
import type { TaxonomyType } from "@/services/taxonomy";
import {
  createCategoryManagementService,
  type AdminCategoryManagementService,
} from "./category-management.service";

/**
 * Live /admin/categories service backed by the NestJS categories module
 * (GET/POST/PATCH/DELETE /categories — writes are SUPER_ADMIN only).
 *
 * Reads fetch the whole taxonomy and hand it to the in-memory service for
 * filtering / sorting / paging so list behaviour stays identical. Writes go
 * straight to the backend; there is no local state to drift.
 *
 * Backend gaps (shown as 0 in the UI): product counts per category.
 */

/** Taxonomy the console is currently scoped to (set by the page's type tabs). */
let activeTaxonomy: TaxonomyType = "PRODUCT";
export function setCategoryTaxonomy(type: TaxonomyType): void {
  activeTaxonomy = type;
}

interface BackendCategory {
  taxonomy?: TaxonomyType;
  usageCount?: number;
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: string | null;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

function fail(error: { message?: string; status?: number }, fallback: string): never {
  if (error.status === 401) {
    throw new Error("You're signed out. Sign in again to manage categories.");
  }
  if (error.status === 403) {
    throw new Error("You don't have permission to manage categories.");
  }
  throw new Error(error.message || fallback);
}

async function fetchAll(): Promise<BackendCategory[]> {
  const out: BackendCategory[] = [];
  for (let page = 1; ; page++) {
    const { data, error } = await apiClient.get<{
      items: BackendCategory[];
      meta: { totalPages: number };
    }>(`/categories/manage?type=${activeTaxonomy}&page=${page}&limit=100`);
    if (error || !data) fail(error ?? {}, "Couldn't load categories.");
    out.push(...data.items);
    if (page >= data.meta.totalPages) break;
  }
  return out;
}

/** Sibling order = sortOrder, then name (matches the backend's own ordering). */
function siblingsOf(all: BackendCategory[], parentId: string | null): BackendCategory[] {
  return all
    .filter((c) => (c.parentId ?? null) === parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

function toManaged(all: BackendCategory[]): ManagedCategory[] {
  const byId = new Map(all.map((c) => [c.id, c]));
  const rank = new Map<string, number>();
  for (const parentId of new Set(all.map((c) => c.parentId ?? null))) {
    siblingsOf(all, parentId).forEach((c, i) => rank.set(c.id, i + 1));
  }
  const childCount = new Map<string, number>();
  for (const c of all) {
    if (c.parentId) childCount.set(c.parentId, (childCount.get(c.parentId) ?? 0) + 1);
  }
  return all.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    icon: c.icon || "package",
    parentId: c.parentId,
    parentName: c.parentId ? byId.get(c.parentId)?.name ?? null : null,
    productCount: c.usageCount ?? 0,
    activeListings: 0,
    subcategoryCount: childCount.get(c.id) ?? 0,
    totalProductCount: c.usageCount ?? 0,
    sortOrder: rank.get(c.id) ?? 1,
    status: c.isActive ? "active" : "inactive",
    createdAt: c.createdAt,
    updatedAt: c.updatedAt ?? c.createdAt,
  }));
}

async function snapshot(): Promise<{ raw: BackendCategory[]; view: AdminCategoryManagementService }> {
  const raw = await fetchAll();
  return { raw, view: createCategoryManagementService(toManaged(raw)) };
}

function asManaged(c: BackendCategory, all: BackendCategory[]): ManagedCategory {
  const merged = all.some((x) => x.id === c.id) ? all.map((x) => (x.id === c.id ? c : x)) : [...all, c];
  return toManaged(merged).find((m) => m.id === c.id)!;
}

export function createApiCategoryManagementService(): AdminCategoryManagementService {
  return {
    async list(query) {
      return (await snapshot()).view.list(query);
    },
    async getCounts() {
      return (await snapshot()).view.getCounts();
    },
    async getParentOptions() {
      return (await snapshot()).view.getParentOptions();
    },

    async create(input) {
      const name = input.name.trim();
      if (name.length < 2) throw new Error("Category name must be at least 2 characters.");
      const raw = await fetchAll();
      if (raw.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
        throw new Error(`A category named “${name}” already exists.`);
      }
      const last = siblingsOf(raw, input.parentId || null).at(-1);
      const { data, error } = await apiClient.post<Record<string, unknown>, BackendCategory>("/categories", {
        taxonomy: activeTaxonomy,
        name,
        description: input.description.trim() || undefined,
        icon: input.icon || "package",
        parentId: input.parentId || undefined,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      });
      if (error || !data) fail(error ?? {}, "Couldn't create the category.");
      return asManaged(data, raw);
    },

    async update(id, patch) {
      const raw = await fetchAll();
      if (patch.name !== undefined) {
        const name = patch.name.trim();
        if (name.length < 2) throw new Error("Category name must be at least 2 characters.");
        if (raw.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
          throw new Error(`A category named “${name}” already exists.`);
        }
      }
      const body: Record<string, unknown> = {};
      if (patch.name !== undefined) body.name = patch.name.trim();
      if (patch.description !== undefined) body.description = patch.description.trim();
      if (patch.icon !== undefined && patch.icon.trim()) body.icon = patch.icon.trim();
      if (patch.parentId !== undefined) body.parentId = patch.parentId || null;

      const { data, error } = await apiClient.patch<Record<string, unknown>, BackendCategory>(`/categories/${id}`, body);
      if (error || !data) fail(error ?? {}, "Couldn't update the category.");
      return asManaged(data, raw);
    },

    async setStatus(id, status) {
      const { error } = await apiClient.patch<Record<string, unknown>, BackendCategory>(`/categories/${id}/status`, {
        isActive: status === "active",
      });
      if (error) fail(error, "Couldn't change the category status.");
    },

    async reorder(id, direction) {
      const raw = await fetchAll();
      const target = raw.find((c) => c.id === id);
      if (!target) throw new Error("Category not found. It may have been deleted.");

      const siblings = siblingsOf(raw, target.parentId ?? null);
      const index = siblings.findIndex((c) => c.id === id);
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (!siblings[swapIndex]) {
        throw new Error(
          direction === "up"
            ? `“${target.name}” is already first in its group.`
            : `“${target.name}” is already last in its group.`
        );
      }
      // Renumber the whole sibling group 1..n (sortOrder is often all 0 for
      // API-created rows, so swapping raw values would be a no-op), then swap.
      const order = siblings.map((c) => c.id);
      [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
      const changed = order
        .map((cid, i) => ({ cid, sortOrder: i + 1 }))
        .filter(({ cid, sortOrder }) => raw.find((c) => c.id === cid)!.sortOrder !== sortOrder);

      for (const { cid, sortOrder } of changed) {
        const { error } = await apiClient.patch<Record<string, unknown>, BackendCategory>(`/categories/${cid}`, { sortOrder });
        if (error) fail(error, "Couldn't reorder categories.");
      }
    },

    async remove(id) {
      const raw = await fetchAll();
      const target = raw.find((c) => c.id === id);
      if (!target) throw new Error("Category not found. It may have been deleted.");
      const children = raw.filter((c) => c.parentId === id).length;
      if (children > 0) {
        throw new Error(
          `Delete or move ${children} sub${children === 1 ? "category" : "categories"} of “${target.name}” first.`
        );
      }
      const { error } = await apiClient.delete<void>(`/categories/${id}`);
      if (error) fail(error, "Couldn't delete the category.");
    },
  };
}
