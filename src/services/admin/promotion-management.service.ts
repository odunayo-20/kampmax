import type {
  ManagedPromotion,
  ManagedPromotionStatus,
  Paginated,
  PromotionInput,
  PromotionListQuery,
  PromotionStatusCounts,
  PromotionTargetingOptions,
} from "@/types/admin";

// Contract for the /admin/promotions console. The live implementation is
// promotion-management.api.ts.
export interface AdminPromotionManagementService {
  list(query?: PromotionListQuery): Promise<Paginated<ManagedPromotion>>;
  getById(id: string): Promise<ManagedPromotion | null>;
  getCounts(): Promise<PromotionStatusCounts>;
  getTargetingOptions(): Promise<PromotionTargetingOptions>;
  create(input: PromotionInput): Promise<ManagedPromotion>;
  update(id: string, patch: Partial<PromotionInput>): Promise<ManagedPromotion>;
  setStatus(id: string, status: ManagedPromotionStatus): Promise<ManagedPromotion>;
  remove(id: string): Promise<void>;
}
