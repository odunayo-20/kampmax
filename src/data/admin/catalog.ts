import { AdminCategory } from "@/types/admin";

// ------------------------------------------------------------
// CATEGORIES
// ------------------------------------------------------------

export const mockCategories: AdminCategory[] = [
  { id: "cat-electronics", name: "Electronics", slug: "electronics", icon: "smartphone", parentId: null, productCount: 412, activeListings: 386, sortOrder: 1, status: "active" },
  { id: "cat-phones", name: "Phones & Tablets", slug: "phones-tablets", icon: "tablet-smartphone", parentId: "cat-electronics", productCount: 187, activeListings: 171, sortOrder: 2, status: "active" },
  { id: "cat-audio", name: "Audio & Accessories", slug: "audio-accessories", icon: "headphones", parentId: "cat-electronics", productCount: 143, activeListings: 138, sortOrder: 3, status: "active" },
  { id: "cat-books", name: "Books & Academic", slug: "books-academic", icon: "book-open", parentId: null, productCount: 356, activeListings: 341, sortOrder: 4, status: "active" },
  { id: "cat-textbooks", name: "Textbooks", slug: "textbooks", icon: "graduation-cap", parentId: "cat-books", productCount: 268, activeListings: 259, sortOrder: 5, status: "active" },
  { id: "cat-fashion", name: "Fashion", slug: "fashion", icon: "shirt", parentId: null, productCount: 298, activeListings: 277, sortOrder: 6, status: "active" },
  { id: "cat-groceries", name: "Groceries & Food", slug: "groceries-food", icon: "shopping-basket", parentId: null, productCount: 164, activeListings: 152, sortOrder: 7, status: "active" },
  { id: "cat-beauty", name: "Beauty & Personal Care", slug: "beauty", icon: "sparkles", parentId: null, productCount: 121, activeListings: 114, sortOrder: 8, status: "active" },
  { id: "cat-home", name: "Home & Living", slug: "home-living", icon: "lamp", parentId: null, productCount: 143, activeListings: 131, sortOrder: 9, status: "active" },
  { id: "cat-services", name: "Printing & Services", slug: "services", icon: "printer", parentId: null, productCount: 87, activeListings: 82, sortOrder: 10, status: "active" },
  { id: "cat-sports", name: "Sports & Fitness", slug: "sports", icon: "dumbbell", parentId: null, productCount: 54, activeListings: 47, sortOrder: 11, status: "archived" },
];
