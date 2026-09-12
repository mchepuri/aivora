import { apiClient } from '@/lib/apiClient';
import { StockReportView } from '@/components/reports/StockReportView';
import type { ItemOption, WarehouseOption } from '@/components/reports/ReportTypes';

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

export default async function OpeningStockReportPage() {
  const [itemOptions, warehouseOptions] = await Promise.all([getItemOptions(), getWarehouseOptions()]);
  return (
    <StockReportView
      kind="opening"
      title="Opening Stock Report"
      description="Stock on hand at the start of the selected date, before anything dated that day posted."
      itemOptions={itemOptions}
      warehouseOptions={warehouseOptions}
    />
  );
}
