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

// ------------------------------------------------------------
// CONTRACT (live: marketplace-management.api.ts -> /admin/marketplace)
//
// READ-ONLY listing-oversight resource. The prototype backend
// exposes no moderation endpoints yet, so this service intentionally
// has NO mutation methods - the NestJS swap point adds them when
// the product-moderation API lands (see MODULE-39-REPORT.md).
// ------------------------------------------------------------

export interface AdminMarketplaceManagementService {
  list(query?: MarketplaceListQuery): Promise<Paginated<MarketplaceListingRow>>;
  getById(id: string): Promise<MarketplaceListingDetail | null>;
  getCounts(): Promise<MarketplaceStatusCounts>;
  getFacets(): Promise<MarketplaceFacets>;
  getActivity(id: string): Promise<MarketplaceActivityEvent[]>;
}

export type { MarketplaceSortField };
