import { apiClient } from '@/lib/apiClient';
import { WarehouseTable } from '@/components/warehouses/WarehouseTable';
import type { Warehouse } from '@/components/warehouses/WarehouseDialog';

async function getWarehouses(): Promise<Warehouse[]> {
  try {
    return await apiClient.get<Warehouse[]>('/master-data/warehouses?limit=100');
  } catch {
    return [];
  }
}

export default async function WarehousesPage() {
  const warehouses = await getWarehouses();
  return <WarehouseTable warehouses={warehouses} />;
}
