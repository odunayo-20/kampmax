import { mockCategories } from "./catalog";
import { daysAgoIso, seededRandom } from "@/lib/admin/api";
import type {
  ManagedCategory,
  ManagedCategoryStatus,
} from "@/types/admin";

/**
 * Category management dataset (/admin/categories).
 *
 * Seeds from the shared catalog (`mockCategories`) and layers on
 * management-only fields: descriptions, audit dates, hierarchy totals.
 * A few intentionally empty leaf categories are appended so the
 * "delete where safe" flow is demonstrable without touching the seed.
 */

const DESCRIPTIONS: Record<string, string> = {
  "cat-electronics":
    "Laptops, phones, accessories and everything with a plug or battery.",
  "cat-phones": "Smartphones, tablets and their cases, chargers and repairs.",
  "cat-audio": "Earbuds, speakers, cables and everyday tech add-ons.",
  "cat-books": "Course texts, past questions, novels and study guides.",
  "cat-textbooks": "Current course texts and reference material by faculty.",
  "cat-fashion": "Clothing, footwear and accessories for campus life.",
  "cat-groceries": "Foodstuff, snacks and daily essentials in student portions.",
  "cat-beauty": "Skincare, haircare and personal care products.",
  "cat-home": "Room essentials - bedding, lighting, storage and decor.",
  "cat-services": "Printing, typing, tailoring and other campus services.",
  "cat-sports": "Fitness gear and sports equipment.",
};

interface ExtraCategorySeed {
  id: string;
  name: string;
  slug: string;
  icon: string;
  parentId: string;
  productCount: number;
  activeListings: number;
  status: ManagedCategoryStatus;
  description: string;
}

/** Empty leaves added on top of the shared catalog seed. */
const EXTRA_CATEGORIES: ExtraCategorySeed[] = [
  {
    id: "cat-gaming",
    name: "Gaming",
    slug: "gaming",
    icon: "gamepad-2",
    parentId: "cat-electronics",
    productCount: 0,
    activeListings: 0,
    status: "active",
    description: "Consoles, controllers and games - newly opened category.",
  },
  {
    id: "cat-snacks",
    name: "Snacks & Drinks",
    slug: "snacks-drinks",
    icon: "cookie",
    parentId: "cat-groceries",
    productCount: 0,
    activeListings: 0,
    status: "inactive",
    description: "Drinks and small chops awaiting first vendors.",
  },
];

const rand = seededRandom(909);

function buildDataset(): ManagedCategory[] {
  const seeds = [...mockCategories];

  const rows: ManagedCategory[] = seeds.map((seed, i) => ({
    id: seed.id,
    name: seed.name,
    slug: seed.slug,
    description:
      DESCRIPTIONS[seed.id] ??
      `${seed.name} listings across Kampmax campuses.`,
    icon: seed.icon,
    parentId: seed.parentId,
    parentName: null,
    productCount: seed.productCount,
    activeListings: seed.activeListings,
    subcategoryCount: 0,
    totalProductCount: seed.productCount,
    sortOrder: seed.sortOrder,
    status: seed.status === "archived" ? "inactive" : "active",
    createdAt: daysAgoIso(seededRandom(i + 1), 320 + i * 9),
    updatedAt: daysAgoIso(rand, i % 2 === 0 ? 4 + i : 21 + i),
  }));

  for (const extra of EXTRA_CATEGORIES) {
    rows.push({
      id: extra.id,
      name: extra.name,
      slug: extra.slug,
      description: extra.description,
      icon: extra.icon,
      parentId: extra.parentId,
      parentName: null,
      productCount: extra.productCount,
      activeListings: extra.activeListings,
      subcategoryCount: 0,
      totalProductCount: extra.productCount,
      sortOrder: Number.MAX_SAFE_INTEGER,
      status: extra.status,
      createdAt: daysAgoIso(rand, 12),
      updatedAt: daysAgoIso(rand, 3),
    });
  }

  const byId = new Map(rows.map((r) => [r.id, r]));

  // Resolve parents + roll child totals up into ancestors.
  for (const row of rows) {
    if (!row.parentId) continue;
    const parent = byId.get(row.parentId);
    if (!parent) continue;
    row.parentName = parent.name;
    parent.subcategoryCount += 1;
    parent.totalProductCount += row.productCount;
  }

  // Assign sibling order: top-level keeps its seed sortOrder; children are
  // numbered per family in dataset order (extras land at the end).
  const topLevel = rows.filter((r) => !r.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  for (const parent of topLevel) {
    let n = 1;
    for (const row of rows) {
      if (row.parentId === parent.id) row.sortOrder = n++;
    }
  }

  // Flatten tree-style: each parent followed by its own children.
  const ordered: ManagedCategory[] = [];
  for (const parent of rows.filter((r) => !r.parentId).sort((a, b) => a.sortOrder - b.sortOrder)) {
    ordered.push(parent);
    for (const child of rows.filter((r) => r.parentId === parent.id).sort((a, b) => a.sortOrder - b.sortOrder)) {
      ordered.push(child);
    }
  }

  return ordered;
}

export const CATEGORY_MANAGEMENT_SEED: ManagedCategory[] = buildDataset();

export function buildCategoryManagementDataset(): ManagedCategory[] {
  return CATEGORY_MANAGEMENT_SEED.map((row) => ({ ...row }));
}
