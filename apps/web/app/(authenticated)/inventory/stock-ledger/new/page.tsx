import { apiClient } from '@/lib/apiClient';
import { StockLedgerForm } from '@/components/stock-ledger/StockLedgerForm';
import type { ItemOption, UomOption, WarehouseOption } from '@/components/stock-ledger/StockLedgerTypes';

async function getItemOptions(): Promise<ItemOption[]> {
  try {
    return await apiClient.get<ItemOption[]>('/master-data/items?limit=100');
  } catch {
    return [];
  }
}

async function getWarehouseOptions(): Promise<WarehouseOption[]> {
  try {
    return await apiClient.get<WarehouseOption[]>('/master-data/warehouses?limit=100');
  } catch {
    return [];
  }
}

async function getUomOptions(): Promise<UomOption[]> {
  try {
    return await apiClient.get<UomOption[]>('/master-data/uom?limit=100');
  } catch {
    return [];
  }
}

export default async function NewInventoryTransactionPage() {
  const [itemOptions, warehouseOptions, uomOptions] = await Promise.all([
    getItemOptions(),
    getWarehouseOptions(),
    getUomOptions(),
  ]);

  return (
    <StockLedgerForm
      itemOptions={itemOptions}
      warehouseOptions={warehouseOptions}
      uomOptions={uomOptions}
    />
  );
}
