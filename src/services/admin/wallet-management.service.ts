import { createApiWalletLedgerService } from "./wallet-management.api";
import type {
  FinanceOverview,
  FinanceTxnQuery,
  ManagedFinanceTxn,
  Paginated,
} from "@/types/admin";

export interface AdminFinanceManagementService {
  /** Headline figures for the /admin/wallet dashboard. */
  getOverview(): Promise<FinanceOverview>;
  listTransactions(query?: FinanceTxnQuery): Promise<Paginated<ManagedFinanceTxn>>;
}

export function createFinanceManagementService(): AdminFinanceManagementService {
  const ledger = createApiWalletLedgerService();

  return {
    getOverview: ledger.getOverview,
    listTransactions: ledger.listTransactions,
  };
}
