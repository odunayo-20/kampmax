// Service categories offered by providers. Mirrors the option list used in
// onboarding StepServices (cat1..cat12) so the dashboard, onboarding, and
// display stay consistent.

import { cachedTaxonomyName } from "@/services/taxonomy";

export interface SpServiceCategory {
  id: string;
  name: string;
  group: string;
}

export const SP_SERVICE_CATEGORIES: SpServiceCategory[] = [
  { id: "cat1", name: "Beauty & Personal Care", group: "Beauty & Personal Care" },
  { id: "cat2", name: "Tutoring & Lessons", group: "Education & Tutoring" },
  { id: "cat3", name: "Technology & IT", group: "Technology & IT" },
  { id: "cat4", name: "Repairs & Maintenance", group: "Repairs & Maintenance" },
  { id: "cat5", name: "Creative & Design", group: "Creative & Design" },
  { id: "cat6", name: "Home Services", group: "Home Services" },
  { id: "cat7", name: "Transportation", group: "Transportation" },
  { id: "cat8", name: "Food & Catering", group: "Food & Catering" },
  { id: "cat9", name: "Events & Entertainment", group: "Events & Entertainment" },
  { id: "cat10", name: "Fitness & Wellness", group: "Fitness & Wellness" },
  { id: "cat11", name: "Professional Services", group: "Professional Services" },
  { id: "cat12", name: "Printing & Stationery", group: "Printing & Stationery" },
];

/**
 * Display name for a service category id. New ids come from the SERVICE
 * taxonomy (resolved from the loaded tree); the static list only labels
 * legacy ids on demo records.
 */
export function spServiceCategoryName(categoryId: string): string {
  return (
    cachedTaxonomyName(categoryId) ??
    SP_SERVICE_CATEGORIES.find((c) => c.id === categoryId)?.name ??
    categoryId
  );
}