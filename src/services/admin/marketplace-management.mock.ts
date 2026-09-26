import {
  MarketplaceActivityEvent,
  MarketplaceFacets,
  MarketplaceListingDetail,
  MarketplaceListingRow,
  MarketplaceListQuery,
  MarketplaceSortField,
  MarketplaceStatusCounts,
  Paginated,
} from "@/types/admin";
import type { AdminMarketplaceManagementService } from "./marketplace-management.service";
import { apiDelay, applySearch, applySort, paginate } from "@/lib/admin/api";
import {
  buildListingDetail,
  buildMarketplaceRows,
  getMarketplaceCounts,
  getMarketplaceFacets,
} from "@/data/admin/marketplace-management";

// ------------------------------------------------------------
// CONTRACT (future NestJS resource: /admin/marketplace)
//
// READ-ONLY listing-oversight resource. The prototype backend
// exposes no moderation endpoints yet, so this service intentionally
// has NO mutation methods - the NestJS swap point adds them when
// the product-moderation API lands (see MODULE-39-REPORT.md).
// ------------------------------------------------------------

// ------------------------------------------------------------
// MOCK IMPLEMENTATION
//
// Reads rows derived from the REAL product/vendor/storefront/
// category/campus stores on every call (38 listings — cheap).
// No PRNGs, no invented moderation data, no mutations.
// ------------------------------------------------------------

export function createMarketplaceManagementService(): AdminMarketplaceManagementService {
  function freshRows(): MarketplaceListingRow[] {
    return buildMarketplaceRows();
  }

  return {
    async list(query = {}) {
      await apiDelay();
      const {
        search,
        sortBy,
        sortDir = "desc",
        page = 1,
        pageSize = 10,
        status = "all",
        visibility = "all",
        publication = "all",
        categoryId = "all",
        campusId = "all",
        vendorId = "all",
        stock = "all",
      } = query;

      let rows = freshRows().filter(
        (r) =>
          (status === "all" || r.status === status) &&
          (visibility === "all" || r.visibility === visibility) &&
          (publication === "all" ||
            (publication === "unset"
              ? r.publishedStatus === null
              : r.publishedStatus === publication)) &&
          (categoryId === "all" || r.categoryId === categoryId) &&
          (campusId === "all" || r.campusId === campusId) &&
          (vendorId === "all" || r.vendorId === vendorId) &&
          (stock === "all" ||
            (stock === "in_stock"
              ? r.stock !== null && r.stock > 0
              : stock === "out_of_stock"
                ? r.stock === 0
                : r.stock === null))
      );

      rows = applySearch(rows, search, (r) => [
        r.title,
        r.description,
        r.vendorName,
        r.sku,
        r.id,
      ]);

      rows = applySort(
        rows,
        sortBy,
        sortDir,
        {
          createdAt: (r) => new Date(r.createdAt).getTime(),
          updatedAt: (r) => {
            const t = new Date(r.updatedAt ?? r.createdAt).getTime();
            return Number.isFinite(t) ? t : 0;
          },
          price: (r) => r.price,
          rating: (r) => r.rating ?? 0,
          viewCount: (r) => r.viewCount ?? 0,
          name: (r) => r.title.toLowerCase(),
        },
        "createdAt"
      );

      return paginate(rows, { page, pageSize });
    },

    async getById(id) {
      await apiDelay(160);
      return buildListingDetail(id);
    },

    async getCounts() {
      await apiDelay(80);
      return getMarketplaceCounts(freshRows());
    },

    async getFacets() {
      await apiDelay(80);
      return getMarketplaceFacets(freshRows());
    },

    async getActivity(id) {
      await apiDelay(120);
      return buildListingDetail(id)?.activity ?? [];
    },
  };
}

export type { MarketplaceSortField };