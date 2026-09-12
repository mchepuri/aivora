import { apiClient } from '@/lib/apiClient';
import { StockLedgerTable } from '@/components/stock-ledger/StockLedgerTable';
import type { InventoryLedgerEntry } from '@/components/stock-ledger/StockLedgerTypes';

async function getLedgerEntries(): Promise<InventoryLedgerEntry[]> {
  try {
    return await apiClient.get<InventoryLedgerEntry[]>('/inventory/stock-ledger?limit=100');
  } catch {
    return [];
  }
}

export default async function StockLedgerPage() {
  const entries = await getLedgerEntries();
  return <StockLedgerTable entries={entries} />;
}
